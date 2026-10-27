import bcrypt from 'bcryptjs';
import {
  AceiteTermo,
  Condominio,
  EventoMovimentacao,
  Item,
  Locacao,
  Movimentacao,
  Prisma,
  PrismaClient,
  TermoResponsabilidade,
  TipoMovimentacao,
  User,
} from '@prisma/client';
import { AppError, ForbiddenError, NotFoundError } from '@/common/errors';
import { lerAcessorios } from '@/modules/itens/itens.service';
import { NotificacoesService } from '@/modules/notificacoes/notificacoes.service';
import { calcularAssinatura, calcularHashIntegridade } from './movimentacoes.integridade';
import {
  AceitarMovimentacaoInput,
  AceiteDTO,
  AcessorioMovimentacao,
  ContextoAceite,
  DeclaracaoTermo,
  EventoDTO,
  MovimentacaoDetalheDTO,
  MovimentacaoResumoDTO,
  ParteDTO,
  RegistrarMovimentacaoInput,
  SnapshotMovimentacao,
  TermoDTO,
} from './movimentacoes.types';

type UsuarioComCondominio = User & { condominio: Condominio | null };
type LocacaoCompleta = Locacao & {
  item: Item & { owner: UsuarioComCondominio };
  locatario: UsuarioComCondominio;
};
type EventoComUsuario = EventoMovimentacao & { user: User };
type AceiteComUsuario = AceiteTermo & { user: User };
type MovimentacaoCompleta = Movimentacao & {
  locacao: Locacao;
  entreguePor: User;
  recebidoPor: User;
  termo: TermoResponsabilidade;
  aceites: AceiteComUsuario[];
  eventos: EventoComUsuario[];
};

const ROTULO_TIPO: Record<TipoMovimentacao, string> = {
  RETIRADA: 'retirada',
  DEVOLUCAO: 'devolução',
};

const INCLUIR_DETALHE = {
  locacao: true,
  entreguePor: true,
  recebidoPor: true,
  termo: true,
  aceites: { include: { user: true } },
  eventos: { include: { user: true }, orderBy: { createdAt: 'asc' } },
} as const;

/** "12345678901" → "***.***.***-01": o documento circula por impressão e e-mail. */
export function mascararCpf(cpf: string | null): string | null {
  const digitos = cpf?.replace(/\D/g, '') ?? '';
  return digitos.length === 11 ? `***.***.***-${digitos.slice(-2)}` : null;
}

/** USAI-2026-000123 — número sequencial do documento, com o ano em que foi emitido. */
export function formatarNumeroDocumento(numero: number, emitidoEm: Date): string {
  return `USAI-${emitidoEm.getUTCFullYear()}-${String(numero).padStart(6, '0')}`;
}

function toParteDTO(usuario: UsuarioComCondominio): ParteDTO {
  return {
    id: usuario.id,
    nome: usuario.nome,
    apartamento: usuario.apartamento,
    condominio: usuario.condominio?.nome ?? null,
    cpfMascarado: mascararCpf(usuario.cpf),
  };
}

function lerSnapshot(valor: unknown): SnapshotMovimentacao {
  return valor as SnapshotMovimentacao;
}

function lerAcessoriosMovimentacao(valor: unknown): AcessorioMovimentacao[] {
  return Array.isArray(valor) ? (valor as AcessorioMovimentacao[]) : [];
}

function lerDeclaracoes(valor: unknown): DeclaracaoTermo[] {
  return Array.isArray(valor) ? (valor as DeclaracaoTermo[]) : [];
}

export function toTermoDTO(termo: TermoResponsabilidade): TermoDTO {
  return {
    id: termo.id,
    tipo: termo.tipo,
    versao: termo.versao,
    titulo: termo.titulo,
    clausulas: Array.isArray(termo.clausulas) ? (termo.clausulas as string[]) : [],
    declaracoes: lerDeclaracoes(termo.declaracoes),
    statusRevisao: termo.statusRevisao,
    aprovadoEm: termo.aprovadoEm,
    createdAt: termo.createdAt,
  };
}

function toResumoDTO(
  mov: Movimentacao & { entreguePor: User; recebidoPor: User },
): MovimentacaoResumoDTO {
  return {
    id: mov.id,
    numero: mov.numero,
    numeroDocumento: formatarNumeroDocumento(mov.numero, mov.createdAt),
    tipo: mov.tipo,
    status: mov.status,
    ocorridoEm: mov.ocorridoEm,
    concluidaEm: mov.concluidaEm,
    estadoConservacao: mov.estadoConservacao,
    entreguePor: { id: mov.entreguePor.id, nome: mov.entreguePor.nome },
    recebidoPor: { id: mov.recebidoPor.id, nome: mov.recebidoPor.nome },
  };
}

function toEventoDTO(evento: EventoComUsuario): EventoDTO {
  return {
    id: evento.id,
    acao: evento.acao,
    detalhe: evento.detalhe,
    createdAt: evento.createdAt,
    usuario: { id: evento.user.id, nome: evento.user.nome },
  };
}

/** Os dados que entram na impressão digital: tudo do documento concluído, nada de fora. */
function baseDoHash(mov: MovimentacaoCompleta, aceite: AceiteTermo) {
  return {
    numero: mov.numero,
    tipo: mov.tipo,
    locacaoId: mov.locacaoId,
    entreguePorId: mov.entreguePorId,
    recebidoPorId: mov.recebidoPorId,
    ocorridoEm: mov.ocorridoEm.toISOString(),
    estadoConservacao: mov.estadoConservacao,
    acessorios: mov.acessorios,
    observacoes: mov.observacoes,
    snapshot: mov.snapshot,
    termo: { id: mov.termo.id, versao: mov.termo.versao },
    aceite: {
      userId: aceite.userId,
      aceitoEm: aceite.aceitoEm.toISOString(),
      declaracoes: aceite.declaracoes,
      assinatura: aceite.assinatura,
    },
  };
}

/**
 * Retirada e devolução de um item numa locação, com termo de responsabilidade e aceite.
 *
 * - **Retirada**: o dono registra a entrega (estado de conservação, acessórios, observações); o
 *   locatário confere e aceita o termo → a locação vai pra EM_ANDAMENTO.
 * - **Devolução**: o locatário registra a devolução; o dono confere e aceita → locação CONCLUIDA.
 *
 * Quem recebe é quem aceita. Concluída, a movimentação NÃO muda: correções entram como eventos
 * (retificações) no histórico, e a impressão digital (`hashIntegridade`) permite provar que o
 * documento não foi alterado em silêncio.
 */
export class MovimentacoesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly notificacoes?: NotificacoesService,
  ) {}

  /** Termo em vigor (a versão mais recente) de um tipo de operação — mostrado antes do aceite. */
  async termoVigente(tipo: TipoMovimentacao): Promise<TermoDTO> {
    const termo = await this.prisma.termoResponsabilidade.findFirst({
      where: { tipo },
      orderBy: { versao: 'desc' },
    });

    if (!termo) {
      throw new NotFoundError('Termo de responsabilidade não encontrado');
    }

    return toTermoDTO(termo);
  }

  async listarPorLocacao(
    locacaoId: string,
    userId: string,
    papel: string,
  ): Promise<MovimentacaoResumoDTO[]> {
    await this.verificarAcessoALocacao(locacaoId, userId, papel);

    const movimentacoes = await this.prisma.movimentacao.findMany({
      where: { locacaoId },
      include: { entreguePor: true, recebidoPor: true },
      orderBy: { createdAt: 'asc' },
    });

    return movimentacoes.map(toResumoDTO);
  }

  /** Admin (auditoria): os documentos mais recentes da plataforma, com a qual item se referem. */
  async listarRecentes(limite = 100): Promise<MovimentacaoResumoDTO[]> {
    const movimentacoes = await this.prisma.movimentacao.findMany({
      include: { entreguePor: true, recebidoPor: true, locacao: { include: { item: true } } },
      orderBy: { createdAt: 'desc' },
      take: limite,
    });

    return movimentacoes.map((mov) => ({
      ...toResumoDTO(mov),
      itemTitulo: mov.locacao.item.titulo,
      locacaoId: mov.locacaoId,
    }));
  }

  async registrar(
    locacaoId: string,
    userId: string,
    input: RegistrarMovimentacaoInput,
  ): Promise<MovimentacaoResumoDTO> {
    const locacao = await this.buscarLocacaoCompleta(locacaoId);
    const ehDono = locacao.item.ownerId === userId;
    const ehLocatario = locacao.locatarioId === userId;

    if (!ehDono && !ehLocatario) {
      throw new ForbiddenError('Você não participa desta locação');
    }

    const retirada = input.tipo === 'RETIRADA';

    if (retirada && !ehDono) {
      throw new ForbiddenError('Quem registra a entrega do item é o proprietário');
    }
    if (!retirada && !ehLocatario) {
      throw new ForbiddenError('Quem registra a devolução do item é o locatário');
    }

    const statusEsperado = retirada ? 'PAGA' : 'EM_ANDAMENTO';
    if (locacao.status !== statusEsperado) {
      throw new AppError(
        retirada
          ? 'A entrega só pode ser registrada em uma locação já paga'
          : 'A devolução só pode ser registrada em uma locação em andamento (item já retirado)',
        409,
        'INVALID_STATUS',
      );
    }

    const existente = await this.prisma.movimentacao.findFirst({
      where: { locacaoId, tipo: input.tipo, status: { in: ['AGUARDANDO_ACEITE', 'CONCLUIDA'] } },
    });
    if (existente) {
      throw new AppError(
        `Já existe um registro de ${ROTULO_TIPO[input.tipo]} para esta locação`,
        409,
        'MOVIMENTACAO_EXISTENTE',
      );
    }

    const termo = await this.prisma.termoResponsabilidade.findFirst({
      where: { tipo: input.tipo },
      orderBy: { versao: 'desc' },
    });
    if (!termo) {
      throw new NotFoundError('Termo de responsabilidade não encontrado');
    }

    const recebedor = retirada ? locacao.locatario : locacao.item.owner;
    const entregador = retirada ? locacao.item.owner : locacao.locatario;

    const criada = await this.prisma.$transaction(async (tx) => {
      const mov = await tx.movimentacao.create({
        data: {
          locacaoId,
          tipo: input.tipo,
          entreguePorId: entregador.id,
          recebidoPorId: recebedor.id,
          ocorridoEm: new Date(),
          estadoConservacao: input.estadoConservacao,
          acessorios: input.acessorios as unknown as Prisma.InputJsonValue,
          observacoes: input.observacoes,
          termoId: termo.id,
          snapshot: this.montarSnapshot(locacao) as unknown as Prisma.InputJsonValue,
        },
        include: { entreguePor: true, recebidoPor: true },
      });

      await tx.eventoMovimentacao.create({
        data: {
          movimentacaoId: mov.id,
          userId,
          acao: 'CRIADA',
          detalhe: `Registro de ${ROTULO_TIPO[input.tipo]} criado por ${entregador.nome}; aguardando a conferência e o aceite de ${recebedor.nome}.`,
        },
      });

      return mov;
    });

    await this.notificacoes?.notificar({
      userId: recebedor.id,
      tipo: 'MOVIMENTACAO_PENDENTE',
      titulo: retirada ? 'Confirme o recebimento do item' : 'Confirme a devolução do item',
      mensagem: `${entregador.nome} registrou a ${ROTULO_TIPO[input.tipo]} de "${locacao.item.titulo}". Confira os dados e aceite o termo para concluir.`,
      link: `/movimentacoes/${criada.id}`,
    });

    return toResumoDTO(criada);
  }

  async buscarDetalhe(id: string, userId: string, papel: string): Promise<MovimentacaoDetalheDTO> {
    const mov = await this.buscarCompleta(id);
    this.verificarAcesso(mov, userId, papel);

    const aceite = mov.aceites[0] ?? null;
    const verificada =
      mov.status === 'CONCLUIDA' && aceite && mov.hashIntegridade
        ? calcularHashIntegridade(baseDoHash(mov, aceite)) === mov.hashIntegridade
        : null;
    const ehParticipante = userId === mov.entreguePorId || userId === mov.recebidoPorId;
    const ehAdmin = papel === 'ADMIN';

    return {
      ...toResumoDTO(mov),
      locacaoId: mov.locacaoId,
      statusLocacao: mov.locacao.status,
      acessorios: lerAcessoriosMovimentacao(mov.acessorios),
      observacoes: mov.observacoes,
      snapshot: lerSnapshot(mov.snapshot),
      termo: toTermoDTO(mov.termo),
      aceite: aceite
        ? {
            usuario: { id: aceite.user.id, nome: aceite.user.nome },
            aceitoEm: aceite.aceitoEm,
            declaracoes: lerDeclaracoes(aceite.declaracoes),
            assinatura: aceite.assinatura,
            ...(ehAdmin ? { ip: aceite.ip, userAgent: aceite.userAgent } : {}),
          }
        : null,
      eventos: mov.eventos.map(toEventoDTO),
      integridade: { hash: mov.hashIntegridade, verificada },
      permissoes: {
        aceitar: mov.status === 'AGUARDANDO_ACEITE' && userId === mov.recebidoPorId,
        cancelar: mov.status === 'AGUARDANDO_ACEITE' && userId === mov.entreguePorId,
        retificar: ehParticipante && mov.status !== 'CANCELADA',
      },
    };
  }

  /**
   * Quem recebeu confere e aceita: marca TODAS as declarações, reconfirma a senha (assinatura
   * eletrônica simples) e a movimentação conclui — na mesma transação em que a locação avança
   * (RETIRADA → EM_ANDAMENTO, DEVOLUCAO → CONCLUIDA). Falhou qualquer passo, nada é gravado.
   */
  async aceitar(
    id: string,
    userId: string,
    input: AceitarMovimentacaoInput,
    contexto: ContextoAceite = {},
  ): Promise<MovimentacaoDetalheDTO> {
    const mov = await this.buscarCompleta(id);

    if (mov.recebidoPorId !== userId) {
      throw new ForbiddenError('Apenas quem recebe o item pode aceitar este termo');
    }
    if (mov.status !== 'AGUARDANDO_ACEITE') {
      throw new AppError('Este registro não está mais aguardando aceite', 409, 'INVALID_STATUS');
    }

    const exigidas = lerDeclaracoes(mov.termo.declaracoes);
    const marcadas = new Set(input.declaracoes);
    const faltando = exigidas.filter((d) => !marcadas.has(d.id));
    const desconhecidas = input.declaracoes.filter((d) => !exigidas.some((e) => e.id === d));

    if (faltando.length > 0 || desconhecidas.length > 0) {
      throw new AppError(
        faltando.length > 0
          ? 'Marque todas as declarações do termo para concluir'
          : 'Declaração inválida para este termo',
        400,
        'ACEITE_INCOMPLETO',
      );
    }

    const usuario = await this.prisma.user.findUnique({ where: { id: userId } });
    const senhaConfere = usuario ? await bcrypt.compare(input.senha, usuario.senhaHash) : false;
    if (!senhaConfere) {
      // 403 (e não 401) de propósito: o cliente HTTP trata 401 como sessão expirada e desloga.
      throw new AppError(
        'Senha incorreta. Confirme a sua senha para assinar.',
        403,
        'SENHA_INVALIDA',
      );
    }

    const aceitoEm = new Date();
    const assinatura = calcularAssinatura({
      movimentacaoId: mov.id,
      userId,
      termoId: mov.termo.id,
      versao: mov.termo.versao,
      aceitoEm: aceitoEm.toISOString(),
      declaracoes: input.declaracoes,
    });
    const declaracoesAceitas = exigidas;
    const retirada = mov.tipo === 'RETIRADA';

    await this.prisma.$transaction(async (tx) => {
      const concluiu = await tx.movimentacao.updateMany({
        where: { id: mov.id, status: 'AGUARDANDO_ACEITE' },
        data: { status: 'CONCLUIDA', concluidaEm: aceitoEm },
      });
      if (concluiu.count === 0) {
        throw new AppError('Este registro não está mais aguardando aceite', 409, 'INVALID_STATUS');
      }

      const avancouLocacao = await tx.locacao.updateMany({
        where: { id: mov.locacaoId, status: retirada ? 'PAGA' : 'EM_ANDAMENTO' },
        data: { status: retirada ? 'EM_ANDAMENTO' : 'CONCLUIDA' },
      });
      if (avancouLocacao.count === 0) {
        throw new AppError('A locação não está mais no estado esperado', 409, 'INVALID_STATUS');
      }

      const aceite = await tx.aceiteTermo.create({
        data: {
          movimentacaoId: mov.id,
          userId,
          termoId: mov.termo.id,
          declaracoes: declaracoesAceitas as unknown as Prisma.InputJsonValue,
          aceitoEm,
          ip: contexto.ip?.slice(0, 64),
          userAgent: contexto.userAgent?.slice(0, 255),
          assinatura,
        },
      });

      await tx.movimentacao.update({
        where: { id: mov.id },
        data: { hashIntegridade: calcularHashIntegridade(baseDoHash(mov, aceite)) },
      });

      await tx.eventoMovimentacao.create({
        data: {
          movimentacaoId: mov.id,
          userId,
          acao: 'ACEITE_REGISTRADO',
          detalhe: `${usuario?.nome ?? 'Usuário'} aceitou o termo (versão ${mov.termo.versao}) e concluiu a ${ROTULO_TIPO[mov.tipo]}.`,
        },
      });
    });

    const locacao = await this.buscarLocacaoCompleta(mov.locacaoId);
    await this.notificacoes?.notificar({
      userId: mov.entreguePorId,
      tipo: 'MOVIMENTACAO_CONCLUIDA',
      titulo: retirada ? 'Entrega confirmada' : 'Devolução confirmada',
      mensagem: retirada
        ? `${mov.recebidoPor.nome} confirmou o recebimento de "${locacao.item.titulo}". A locação está em andamento.`
        : `${mov.recebidoPor.nome} confirmou o recebimento de "${locacao.item.titulo}". A locação foi concluída.`,
      link: `/movimentacoes/${mov.id}`,
    });

    return this.buscarDetalhe(id, userId, 'MORADOR');
  }

  /** Quem registrou pode cancelar enquanto o outro lado ainda não aceitou (erro de digitação etc.). */
  async cancelar(id: string, userId: string): Promise<MovimentacaoDetalheDTO> {
    const mov = await this.buscarCompleta(id);

    if (mov.entreguePorId !== userId) {
      throw new ForbiddenError('Apenas quem criou o registro pode cancelá-lo');
    }

    const cancelou = await this.prisma.movimentacao.updateMany({
      where: { id, status: 'AGUARDANDO_ACEITE' },
      data: { status: 'CANCELADA' },
    });
    if (cancelou.count === 0) {
      throw new AppError(
        'Só é possível cancelar um registro que ainda aguarda aceite',
        409,
        'INVALID_STATUS',
      );
    }

    await this.prisma.eventoMovimentacao.create({
      data: {
        movimentacaoId: id,
        userId,
        acao: 'CANCELADA',
        detalhe: `Registro cancelado por ${mov.entreguePor.nome} antes do aceite.`,
      },
    });

    await this.notificacoes?.notificar({
      userId: mov.recebidoPorId,
      tipo: 'MOVIMENTACAO_CANCELADA',
      titulo: 'Registro cancelado',
      mensagem: `${mov.entreguePor.nome} cancelou o registro de ${ROTULO_TIPO[mov.tipo]} que aguardava o seu aceite. Se for preciso, um novo será criado.`,
      link: `/movimentacoes/${id}`,
    });

    return this.buscarDetalhe(id, userId, 'MORADOR');
  }

  /**
   * Correção de um documento: não altera nada do que foi registrado/aceito — acrescenta um evento
   * ao histórico, com autor e data, e avisa a outra parte.
   */
  async retificar(id: string, userId: string, texto: string): Promise<MovimentacaoDetalheDTO> {
    const mov = await this.buscarCompleta(id);

    if (userId !== mov.entreguePorId && userId !== mov.recebidoPorId) {
      throw new ForbiddenError('Apenas as partes deste registro podem registrar retificações');
    }
    if (mov.status === 'CANCELADA') {
      throw new AppError('Este registro foi cancelado', 409, 'INVALID_STATUS');
    }

    await this.prisma.eventoMovimentacao.create({
      data: { movimentacaoId: id, userId, acao: 'RETIFICACAO', detalhe: texto },
    });

    const outraParteId = userId === mov.entreguePorId ? mov.recebidoPorId : mov.entreguePorId;
    const autor = userId === mov.entreguePorId ? mov.entreguePor : mov.recebidoPor;
    await this.notificacoes?.notificar({
      userId: outraParteId,
      tipo: 'MOVIMENTACAO_RETIFICADA',
      titulo: 'Retificação registrada',
      mensagem: `${autor.nome} registrou uma retificação no documento de ${ROTULO_TIPO[mov.tipo]}. O registro original permanece inalterado.`,
      link: `/movimentacoes/${id}`,
    });

    return this.buscarDetalhe(id, userId, 'MORADOR');
  }

  private montarSnapshot(locacao: LocacaoCompleta): SnapshotMovimentacao {
    return {
      locacao: {
        id: locacao.id,
        dataInicio: locacao.dataInicio.toISOString(),
        dataFim: locacao.dataFim.toISOString(),
        valorTotal: Number(locacao.valorTotal),
        finalidade: locacao.finalidade,
      },
      item: {
        id: locacao.item.id,
        titulo: locacao.item.titulo,
        descricao: locacao.item.descricao,
        categoria: locacao.item.categoria,
        fabricante: locacao.item.fabricante,
        modelo: locacao.item.modelo,
        numeroSerie: locacao.item.numeroSerie,
        acessorios: lerAcessorios(locacao.item.acessorios),
      },
      dono: toParteDTO(locacao.item.owner),
      locatario: toParteDTO(locacao.locatario),
    };
  }

  private async buscarLocacaoCompleta(locacaoId: string): Promise<LocacaoCompleta> {
    const locacao = await this.prisma.locacao.findUnique({
      where: { id: locacaoId },
      include: {
        item: { include: { owner: { include: { condominio: true } } } },
        locatario: { include: { condominio: true } },
      },
    });

    if (!locacao) {
      throw new NotFoundError('Locação não encontrada');
    }

    return locacao;
  }

  private async verificarAcessoALocacao(
    locacaoId: string,
    userId: string,
    papel: string,
  ): Promise<void> {
    const locacao = await this.prisma.locacao.findUnique({
      where: { id: locacaoId },
      include: { item: true },
    });

    if (!locacao) {
      throw new NotFoundError('Locação não encontrada');
    }
    if (papel !== 'ADMIN' && locacao.locatarioId !== userId && locacao.item.ownerId !== userId) {
      throw new ForbiddenError('Você não participa desta locação');
    }
  }

  private async buscarCompleta(id: string): Promise<MovimentacaoCompleta> {
    const mov = await this.prisma.movimentacao.findUnique({
      where: { id },
      include: INCLUIR_DETALHE,
    });

    if (!mov) {
      throw new NotFoundError('Registro não encontrado');
    }

    return mov;
  }

  /** Só as duas partes — e o Admin, pra auditoria — enxergam o documento. */
  private verificarAcesso(mov: Movimentacao, userId: string, papel: string): void {
    if (papel === 'ADMIN') return;
    if (userId !== mov.entreguePorId && userId !== mov.recebidoPorId) {
      throw new ForbiddenError('Você não participa deste registro');
    }
  }
}
