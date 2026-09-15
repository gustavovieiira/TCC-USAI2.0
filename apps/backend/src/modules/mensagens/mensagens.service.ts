import { Item, Locacao, Mensagem, PrismaClient } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '@/common/errors';
import { EnviarMensagemInput, MensagemDTO } from './mensagens.types';

type LocacaoComItem = Locacao & { item: Item };

function toMensagemDTO(mensagem: Mensagem): MensagemDTO {
  return {
    id: mensagem.id,
    locacaoId: mensagem.locacaoId,
    remetenteId: mensagem.remetenteId,
    conteudo: mensagem.conteudo,
    createdAt: mensagem.createdAt,
  };
}

export class MensagensService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Só o locatário e o proprietário do item podem trocar mensagens sobre a locação. */
  async verificarParticipante(locacaoId: string, userId: string): Promise<void> {
    const locacao = await this.buscarLocacaoOuFalhar(locacaoId);

    if (locacao.locatarioId !== userId && locacao.item.ownerId !== userId) {
      throw new ForbiddenError('Você não participa desta locação');
    }
  }

  async enviar(
    locacaoId: string,
    remetenteId: string,
    input: EnviarMensagemInput,
  ): Promise<MensagemDTO> {
    await this.verificarParticipante(locacaoId, remetenteId);

    const mensagem = await this.prisma.mensagem.create({
      data: { locacaoId, remetenteId, conteudo: input.conteudo },
    });

    return toMensagemDTO(mensagem);
  }

  async listarPorLocacao(locacaoId: string, userId: string): Promise<MensagemDTO[]> {
    await this.verificarParticipante(locacaoId, userId);

    const mensagens = await this.prisma.mensagem.findMany({
      where: { locacaoId },
      orderBy: { createdAt: 'asc' },
    });

    return mensagens.map(toMensagemDTO);
  }

  private async buscarLocacaoOuFalhar(locacaoId: string): Promise<LocacaoComItem> {
    const locacao = await this.prisma.locacao.findUnique({
      where: { id: locacaoId },
      include: { item: true },
    });

    if (!locacao) {
      throw new NotFoundError('Locação não encontrada');
    }

    return locacao;
  }
}
