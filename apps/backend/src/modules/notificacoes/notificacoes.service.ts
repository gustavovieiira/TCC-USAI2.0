import { Notificacao, PrismaClient } from '@prisma/client';
import { NotFoundError } from '@/common/errors';
import { logger } from '@/common/logger';
import { emitirParaUsuario } from '@/realtime/emitter';
import { ListaNotificacoesDTO, NotificacaoDTO, NovaNotificacao } from './notificacoes.types';

const LIMITE_LISTAGEM = 50;
const DIAS_DE_RETENCAO = 30;
const MS_POR_DIA = 1000 * 60 * 60 * 24;

function toNotificacaoDTO(notificacao: Notificacao): NotificacaoDTO {
  return {
    id: notificacao.id,
    tipo: notificacao.tipo,
    titulo: notificacao.titulo,
    mensagem: notificacao.mensagem,
    link: notificacao.link,
    lida: notificacao.lida,
    createdAt: notificacao.createdAt,
  };
}

/**
 * Avisos persistidos (sino + página). Os outros services chamam `notificar` depois que a ação
 * principal já deu certo — por isso `notificar` nunca lança: uma falha aqui vira log, jamais
 * derruba um pagamento ou um pedido de locação que já foi gravado.
 */
export class NotificacoesService {
  constructor(private readonly prisma: PrismaClient) {}

  async notificar(nova: NovaNotificacao): Promise<void> {
    try {
      const criada = await this.prisma.notificacao.create({
        data: {
          userId: nova.userId,
          tipo: nova.tipo,
          titulo: nova.titulo,
          mensagem: nova.mensagem,
          link: nova.link,
        },
      });

      emitirParaUsuario(nova.userId, 'notificacao:nova', toNotificacaoDTO(criada));
    } catch (error) {
      logger.error('Falha ao criar notificação', { error, userId: nova.userId, tipo: nova.tipo });
    }
  }

  /** Avisa todos os Admins USAI ativos (ex.: novo pedido de saque na fila). */
  async notificarAdmins(nova: Omit<NovaNotificacao, 'userId'>): Promise<void> {
    try {
      const admins = await this.prisma.user.findMany({
        where: { papel: 'ADMIN', ativo: true },
        select: { id: true },
      });

      await Promise.all(admins.map((admin) => this.notificar({ ...nova, userId: admin.id })));
    } catch (error) {
      logger.error('Falha ao notificar admins', { error, tipo: nova.tipo });
    }
  }

  /** Sempre escopado ao usuário do token: ninguém lê notificação de outra pessoa. */
  async listar(userId: string): Promise<ListaNotificacoesDTO> {
    const [notificacoes, naoLidas] = await Promise.all([
      this.prisma.notificacao.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: LIMITE_LISTAGEM,
      }),
      this.prisma.notificacao.count({ where: { userId, lida: false } }),
    ]);

    return { notificacoes: notificacoes.map(toNotificacaoDTO), naoLidas };
  }

  async marcarComoLida(id: string, userId: string): Promise<void> {
    const resultado = await this.prisma.notificacao.updateMany({
      where: { id, userId },
      data: { lida: true },
    });

    if (resultado.count === 0) {
      throw new NotFoundError('Notificação não encontrada');
    }
  }

  async marcarTodasComoLidas(userId: string): Promise<void> {
    await this.prisma.notificacao.updateMany({
      where: { userId, lida: false },
      data: { lida: true },
    });
  }

  /** Varredura periódica (ver `server.ts`): notificações com mais de 30 dias saem do banco. */
  async removerAntigas(): Promise<number> {
    const limite = new Date(Date.now() - DIAS_DE_RETENCAO * MS_POR_DIA);
    const resultado = await this.prisma.notificacao.deleteMany({
      where: { createdAt: { lt: limite } },
    });

    return resultado.count;
  }
}
