import {
  ConversaPrivada,
  Item,
  Locacao,
  MensagemPrivada,
  PrismaClient,
  User,
} from '@prisma/client';
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
  locacao?: (Locacao & { item: Item }) | null;
};

const DIAS_EXPIRACAO = 7;
const MS_POR_DIA = 1000 * 60 * 60 * 24;

function toParticipanteDTO(user: User) {
  return { id: user.id, nome: user.nome, papel: user.papel };
}

function toConversaDTO(
  conversa: ConversaComParticipantes,
  meuId: string,
  naoLidas = 0,
): ConversaDTO {
  const outro =
    conversa.participanteAId === meuId ? conversa.participanteB : conversa.participanteA;
  const ultimaMensagem = conversa.mensagens?.[0]
    ? { conteudo: conversa.mensagens[0].conteudo, createdAt: conversa.mensagens[0].createdAt }
    : null;

  return {
    id: conversa.id,
    outroParticipante: toParticipanteDTO(outro),
    postOrigemId: conversa.postOrigemId,
    locacao: conversa.locacao
      ? {
          id: conversa.locacao.id,
          itemTitulo: conversa.locacao.item.titulo,
          status: conversa.locacao.status,
        }
      : null,
    createdAt: conversa.createdAt,
    expiraEm: conversa.expiraEm,
    ultimaMensagem,
    naoLidas,
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

/** Quando o participante leu a conversa pela última vez (nulo = nunca). */
function lidoEmDe(conversa: ConversaPrivada, userId: string): Date | null {
  return conversa.participanteAId === userId
    ? conversa.participanteALidoEm
    : conversa.participanteBLidoEm;
}

/**
 * Chat 1:1 do condomínio, de dois tipos que aparecem juntos na página de Conversas:
 * - **Mural**: aberto a partir do autor de um post/comentário, pra tirar uma dúvida sem virar
 *   comentário público. Efêmero: expira 7 dias depois e é apagado de vez (não só ocultado) — daí a
 *   checagem em toda operação (`expirarAntigas`), além da varredura periódica em `server.ts`.
 * - **Locação**: o chat entre locatário e dono do item (`locacaoId` preenchido), sem expiração,
 *   criado na primeira vez que alguém abre a conversa da locação.
 * As mensagens não lidas ficam gravadas (`participante*LidoEm`), então sobrevivem a recarregar a
 * página ou trocar de aparelho.
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

    // `locacaoId: null`: o chat de uma locação é só daquela locação, nunca reaproveitado aqui.
    const existente = await this.prisma.conversaPrivada.findFirst({
      where: {
        condominioId,
        locacaoId: null,
        expiraEm: { gt: new Date() },
        OR: [
          { participanteAId: meuId, participanteBId: input.usuarioId },
          { participanteAId: input.usuarioId, participanteBId: meuId },
        ],
      },
      include: { participanteA: true, participanteB: true },
    });

    if (existente) {
      return toConversaDTO(existente, meuId, await this.contarNaoLidasDe(existente, meuId));
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

  /**
   * Abre (criando na primeira vez) o chat de uma locação. Só quem participa dela — o locatário e o
   * dono do item — e só dentro do próprio condomínio. `upsert` por `locacaoId` (único) evita duas
   * conversas se os dois lados clicarem ao mesmo tempo.
   */
  async abrirPorLocacao(
    condominioId: string,
    meuId: string,
    locacaoId: string,
  ): Promise<ConversaDTO> {
    const locacao = await this.prisma.locacao.findUnique({
      where: { id: locacaoId },
      include: { item: true },
    });

    if (!locacao || locacao.item.condominioId !== condominioId) {
      throw new NotFoundError('Locação não encontrada');
    }
    if (locacao.locatarioId !== meuId && locacao.item.ownerId !== meuId) {
      throw new ForbiddenError('Você não participa desta locação');
    }

    const conversa = await this.prisma.conversaPrivada.upsert({
      where: { locacaoId },
      update: {},
      create: {
        locacaoId,
        participanteAId: locacao.locatarioId,
        participanteBId: locacao.item.ownerId,
        condominioId,
        expiraEm: null,
      },
      include: {
        participanteA: true,
        participanteB: true,
        locacao: { include: { item: true } },
        mensagens: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    return toConversaDTO(conversa, meuId, await this.contarNaoLidasDe(conversa, meuId));
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

  /** Mural e locações juntos, a mais recente (última mensagem ou criação) primeiro. */
  async listarMinhas(condominioId: string, meuId: string): Promise<ConversaDTO[]> {
    await this.expirarAntigas(condominioId);

    const conversas = await this.prisma.conversaPrivada.findMany({
      where: { condominioId, OR: [{ participanteAId: meuId }, { participanteBId: meuId }] },
      include: {
        participanteA: true,
        participanteB: true,
        locacao: { include: { item: true } },
        mensagens: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const dtos = await Promise.all(
      conversas.map(async (conversa) =>
        toConversaDTO(conversa, meuId, await this.contarNaoLidasDe(conversa, meuId)),
      ),
    );

    const ultimaAtividade = (c: ConversaDTO) =>
      (c.ultimaMensagem?.createdAt ?? c.createdAt).getTime();
    return dtos.sort((a, b) => ultimaAtividade(b) - ultimaAtividade(a));
  }

  /** Total de mensagens não lidas em todas as conversas — alimenta a bolinha do menu. */
  async contarNaoLidas(condominioId: string, meuId: string): Promise<number> {
    await this.expirarAntigas(condominioId);

    const conversas = await this.prisma.conversaPrivada.findMany({
      where: { condominioId, OR: [{ participanteAId: meuId }, { participanteBId: meuId }] },
    });
    const contagens = await Promise.all(conversas.map((c) => this.contarNaoLidasDe(c, meuId)));

    return contagens.reduce((total, n) => total + n, 0);
  }

  async buscarPorId(conversaId: string, condominioId: string, meuId: string): Promise<ConversaDTO> {
    const conversa = await this.buscarEVerificarOuFalhar(conversaId, condominioId, meuId);
    return toConversaDTO(conversa, meuId, await this.contarNaoLidasDe(conversa, meuId));
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
    const conversa = await this.buscarEVerificarOuFalhar(conversaId, condominioId, remetenteId);

    const mensagem = await this.prisma.mensagemPrivada.create({
      data: { conversaId, remetenteId, conteudo: input.conteudo },
    });

    // Quem acabou de escrever obviamente já leu tudo até aqui.
    await this.gravarLidoEm(conversa, remetenteId, mensagem.createdAt);

    return toMensagemDTO(mensagem);
  }

  /** O usuário abriu (ou está com aberta) a conversa: tudo até agora conta como lido. */
  async marcarComoLida(conversaId: string, condominioId: string, userId: string): Promise<void> {
    const conversa = await this.buscarEVerificarOuFalhar(conversaId, condominioId, userId);
    await this.gravarLidoEm(conversa, userId, new Date());
  }

  /** Usado pelo WebSocket antes de deixar um socket entrar na sala da conversa. */
  async verificarParticipante(
    conversaId: string,
    condominioId: string,
    userId: string,
  ): Promise<void> {
    await this.buscarEVerificarOuFalhar(conversaId, condominioId, userId);
  }

  /**
   * Usado pelo WebSocket pra avisar o destinatário mesmo que ele ainda não tenha entrado na sala
   * da conversa (ex.: é a primeira mensagem de uma conversa recém-criada).
   */
  async buscarOutroParticipanteId(conversaId: string, meuId: string): Promise<string | null> {
    const conversa = await this.prisma.conversaPrivada.findUnique({
      where: { id: conversaId },
      select: { participanteAId: true, participanteBId: true },
    });
    if (!conversa) return null;

    return conversa.participanteAId === meuId ? conversa.participanteBId : conversa.participanteAId;
  }

  private async contarNaoLidasDe(conversa: ConversaPrivada, meuId: string): Promise<number> {
    const lidoEm = lidoEmDe(conversa, meuId);

    return this.prisma.mensagemPrivada.count({
      where: {
        conversaId: conversa.id,
        remetenteId: { not: meuId },
        ...(lidoEm ? { createdAt: { gt: lidoEm } } : {}),
      },
    });
  }

  private async gravarLidoEm(conversa: ConversaPrivada, userId: string, quando: Date) {
    await this.prisma.conversaPrivada.update({
      where: { id: conversa.id },
      data:
        conversa.participanteAId === userId
          ? { participanteALidoEm: quando }
          : { participanteBLidoEm: quando },
    });
  }

  private async buscarEVerificarOuFalhar(
    conversaId: string,
    condominioId: string,
    userId: string,
  ): Promise<ConversaComParticipantes> {
    await this.expirarAntigas(condominioId);

    const conversa = await this.prisma.conversaPrivada.findFirst({
      where: { id: conversaId, condominioId },
      include: { participanteA: true, participanteB: true, locacao: { include: { item: true } } },
    });

    if (!conversa) {
      throw new NotFoundError('Conversa não encontrada');
    }
    if (conversa.participanteAId !== userId && conversa.participanteBId !== userId) {
      throw new ForbiddenError('Você não participa desta conversa');
    }

    return conversa;
  }

  /** Conversas do Mural são efêmeras (no máximo 7 dias) — apagadas de vez. Chat de locação não expira. */
  private async expirarAntigas(condominioId: string): Promise<void> {
    await this.prisma.conversaPrivada.deleteMany({
      where: { condominioId, expiraEm: { lt: new Date() } },
    });
  }
}
