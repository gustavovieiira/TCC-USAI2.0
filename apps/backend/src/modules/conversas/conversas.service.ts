import { ConversaPrivada, MensagemPrivada, PrismaClient, User } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '@/common/errors';
import {
  AbrirConversaInput,
  ConversaDTO,
  EnviarMensagemPrivadaInput,
  MensagemPrivadaDTO,
  ParticipanteDTO,
} from './conversas.types';

type ConversaComParticipantes = ConversaPrivada & {
  participanteA: User;
  participanteB: User;
  mensagens?: MensagemPrivada[];
};

const DIAS_EXPIRACAO = 7;
const MS_POR_DIA = 1000 * 60 * 60 * 24;

function toParticipanteDTO(user: User) {
  return { id: user.id, nome: user.nome, papel: user.papel };
}

function toConversaDTO(conversa: ConversaComParticipantes, meuId: string): ConversaDTO {
  const outro =
    conversa.participanteAId === meuId ? conversa.participanteB : conversa.participanteA;
  const ultimaMensagem = conversa.mensagens?.[0]
    ? { conteudo: conversa.mensagens[0].conteudo, createdAt: conversa.mensagens[0].createdAt }
    : null;

  return {
    id: conversa.id,
    outroParticipante: toParticipanteDTO(outro),
    postOrigemId: conversa.postOrigemId,
    createdAt: conversa.createdAt,
    expiraEm: conversa.expiraEm,
    ultimaMensagem,
  };
}

function toMensagemDTO(mensagem: MensagemPrivada): MensagemPrivadaDTO {
  return {
    id: mensagem.id,
    conversaId: mensagem.conversaId,
    remetenteId: mensagem.remetenteId,
    conteudo: mensagem.conteudo,
    createdAt: mensagem.createdAt,
  };
}

/**
 * Chat privado 1:1 aberto a partir do Mural (autor de um post ou de um comentário) — pra tirar uma
 * dúvida ou combinar algo direto com a pessoa, sem virar comentário público. Efêmero por design:
 * expira 7 dias depois de criado e é apagado de vez (não só ocultado) — daí a checagem de posts
 * expirados em toda operação (`expirarAntigas`), além da varredura periódica em `server.ts`.
 */
export class ConversasService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Reaproveita uma conversa já aberta com a mesma pessoa em vez de fragmentar em várias. */
  async abrirOuContinuar(
    condominioId: string,
    meuId: string,
    input: AbrirConversaInput,
  ): Promise<ConversaDTO> {
    if (input.usuarioId === meuId) {
      throw new ForbiddenError('Você não pode iniciar uma conversa com você mesmo');
    }

    const outroUsuario = await this.prisma.user.findFirst({
      where: { id: input.usuarioId, condominioId },
    });
    if (!outroUsuario) {
      throw new NotFoundError('Usuário não encontrado neste condomínio');
    }

    await this.expirarAntigas(condominioId);

    const existente = await this.prisma.conversaPrivada.findFirst({
      where: {
        condominioId,
        expiraEm: { gt: new Date() },
        OR: [
          { participanteAId: meuId, participanteBId: input.usuarioId },
          { participanteAId: input.usuarioId, participanteBId: meuId },
        ],
      },
      include: { participanteA: true, participanteB: true },
    });

    if (existente) {
      return toConversaDTO(existente, meuId);
    }

    const criada = await this.prisma.conversaPrivada.create({
      data: {
        participanteAId: meuId,
        participanteBId: input.usuarioId,
        condominioId,
        postOrigemId: input.postOrigemId,
        expiraEm: new Date(Date.now() + DIAS_EXPIRACAO * MS_POR_DIA),
      },
      include: { participanteA: true, participanteB: true },
    });

    return toConversaDTO(criada, meuId);
  }

  /** Pra busca de "com quem eu quero conversar" — todo mundo do condomínio, exceto eu mesmo. */
  async listarUsuariosDoCondominio(
    condominioId: string,
    meuId: string,
  ): Promise<ParticipanteDTO[]> {
    const usuarios = await this.prisma.user.findMany({
      where: { condominioId, id: { not: meuId } },
      orderBy: { nome: 'asc' },
    });

    return usuarios.map(toParticipanteDTO);
  }

  async listarMinhas(condominioId: string, meuId: string): Promise<ConversaDTO[]> {
    await this.expirarAntigas(condominioId);

    const conversas = await this.prisma.conversaPrivada.findMany({
      where: { condominioId, OR: [{ participanteAId: meuId }, { participanteBId: meuId }] },
      include: {
        participanteA: true,
        participanteB: true,
        mensagens: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    return conversas.map((conversa) => toConversaDTO(conversa, meuId));
  }

  async buscarPorId(conversaId: string, condominioId: string, meuId: string): Promise<ConversaDTO> {
    const conversa = await this.buscarEVerificarOuFalhar(conversaId, condominioId, meuId);
    return toConversaDTO(conversa, meuId);
  }

  async listarMensagens(
    conversaId: string,
    condominioId: string,
    meuId: string,
  ): Promise<MensagemPrivadaDTO[]> {
    await this.buscarEVerificarOuFalhar(conversaId, condominioId, meuId);

    const mensagens = await this.prisma.mensagemPrivada.findMany({
      where: { conversaId },
      orderBy: { createdAt: 'asc' },
    });

    return mensagens.map(toMensagemDTO);
  }

  async enviarMensagem(
    conversaId: string,
    condominioId: string,
    remetenteId: string,
    input: EnviarMensagemPrivadaInput,
  ): Promise<MensagemPrivadaDTO> {
    await this.buscarEVerificarOuFalhar(conversaId, condominioId, remetenteId);

    const mensagem = await this.prisma.mensagemPrivada.create({
      data: { conversaId, remetenteId, conteudo: input.conteudo },
    });

    return toMensagemDTO(mensagem);
  }

  /** Usado pelo WebSocket antes de deixar um socket entrar na sala da conversa. */
  async verificarParticipante(
    conversaId: string,
    condominioId: string,
    userId: string,
  ): Promise<void> {
    await this.buscarEVerificarOuFalhar(conversaId, condominioId, userId);
  }

  private async buscarEVerificarOuFalhar(
    conversaId: string,
    condominioId: string,
    userId: string,
  ): Promise<ConversaComParticipantes> {
    await this.expirarAntigas(condominioId);

    const conversa = await this.prisma.conversaPrivada.findFirst({
      where: { id: conversaId, condominioId },
      include: { participanteA: true, participanteB: true },
    });

    if (!conversa) {
      throw new NotFoundError('Conversa não encontrada');
    }
    if (conversa.participanteAId !== userId && conversa.participanteBId !== userId) {
      throw new ForbiddenError('Você não participa desta conversa');
    }

    return conversa;
  }

  /** Conversas são efêmeras por design (no máximo 7 dias) — apagadas de vez, não só ocultadas. */
  private async expirarAntigas(condominioId: string): Promise<void> {
    await this.prisma.conversaPrivada.deleteMany({
      where: { condominioId, expiraEm: { lt: new Date() } },
    });
  }
}
