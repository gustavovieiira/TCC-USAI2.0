import bcrypt from 'bcryptjs';
import { Condominio, PrismaClient, User } from '@prisma/client';
import {
  INCLUIR_ORIGEM,
  TIPO_COMISSAO_CONDOMINIO,
  TIPO_TAXA_PLATAFORMA,
  toOrigemDTO,
} from '@/modules/lancamentos/lancamentos.service';
import { BCRYPT_ROUNDS } from '@/modules/auth/auth.service';
import { ConflictError, NotFoundError } from '@/common/errors';
import {
  AtualizarCondominioInput,
  CondominioDTO,
  CriarCondominioInput,
  CriarSindicoInput,
  ExtratoPlataformaDTO,
  ListarCondominiosFiltro,
  ResumoFinanceiroDTO,
  SindicoDTO,
  UsuarioAdminDTO,
} from './admin.types';

function toCondominioDTO(condominio: Condominio): CondominioDTO {
  return {
    id: condominio.id,
    nome: condominio.nome,
    linkSlug: condominio.linkSlug,
    pin: condominio.pin,
    ativo: condominio.ativo,
    createdAt: condominio.createdAt,
  };
}

function toSindicoDTO(user: User): SindicoDTO {
  return { id: user.id, nome: user.nome, email: user.email, condominioId: user.condominioId };
}

export class AdminService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Admin USAI cadastra um novo condomínio na plataforma. */
  async criarCondominio(input: CriarCondominioInput): Promise<CondominioDTO> {
    const existente = await this.prisma.condominio.findUnique({
      where: { linkSlug: input.linkSlug },
    });

    if (existente) {
      throw new ConflictError('Já existe um condomínio com este link de acesso');
    }

    const condominio = await this.prisma.condominio.create({
      data: { nome: input.nome, linkSlug: input.linkSlug, pin: input.pin },
    });

    return toCondominioDTO(condominio);
  }

  async listarCondominios(filtro: ListarCondominiosFiltro = {}): Promise<CondominioDTO[]> {
    const condominios = await this.prisma.condominio.findMany({
      where: filtro.ativo !== undefined ? { ativo: filtro.ativo } : undefined,
      orderBy: { nome: 'asc' },
    });

    return condominios.map(toCondominioDTO);
  }

  /** Admin USAI ativa/desativa, renomeia ou reseta o PIN de um condomínio existente. */
  async atualizarCondominio(
    condominioId: string,
    input: AtualizarCondominioInput,
  ): Promise<CondominioDTO> {
    await this.buscarCondominioOuFalhar(condominioId);

    const atualizado = await this.prisma.condominio.update({
      where: { id: condominioId },
      data: input,
    });

    return toCondominioDTO(atualizado);
  }

  /** Admin USAI cria a conta de síndico de um condomínio (não há autocadastro para esse papel). */
  async criarSindico(input: CriarSindicoInput): Promise<SindicoDTO> {
    await this.buscarCondominioOuFalhar(input.condominioId);

    const existente = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existente) {
      throw new ConflictError('Já existe uma conta com este e-mail');
    }

    const senhaHash = await bcrypt.hash(input.senha, BCRYPT_ROUNDS);

    const sindico = await this.prisma.user.create({
      data: {
        nome: input.nome,
        email: input.email,
        senhaHash,
        papel: 'SINDICO',
        condominioId: input.condominioId,
      },
    });

    return toSindicoDTO(sindico);
  }

  /** Financeiro global: totais de solicitações de saque por status + condomínios ativos. */
  async resumoFinanceiro(): Promise<ResumoFinanceiroDTO> {
    const [pendente, aprovado, pago, rejeitado, condominiosAtivos, comissoes, retido] =
      await Promise.all([
        this.prisma.solicitacaoSaque.aggregate({
          where: { status: 'PENDENTE' },
          _count: true,
          _sum: { valor: true },
        }),
        this.prisma.solicitacaoSaque.aggregate({
          where: { status: 'APROVADO' },
          _count: true,
          _sum: { valor: true },
        }),
        this.prisma.solicitacaoSaque.aggregate({
          where: { status: 'PAGO' },
          _count: true,
          _sum: { valor: true },
        }),
        this.prisma.solicitacaoSaque.aggregate({
          where: { status: 'REJEITADO' },
          _count: true,
          _sum: { valor: true },
        }),
        this.prisma.condominio.count({ where: { ativo: true } }),
        this.prisma.lancamento.aggregate({
          where: { tipo: TIPO_COMISSAO_CONDOMINIO },
          _sum: { valor: true },
        }),
        this.prisma.lancamento.aggregate({
          where: { tipo: TIPO_TAXA_PLATAFORMA },
          _sum: { valor: true },
        }),
      ]);

    return {
      saques: {
        pendente: { quantidade: pendente._count, valorTotal: Number(pendente._sum.valor ?? 0) },
        aprovado: { quantidade: aprovado._count, valorTotal: Number(aprovado._sum.valor ?? 0) },
        pago: { quantidade: pago._count, valorTotal: Number(pago._sum.valor ?? 0) },
        rejeitado: { quantidade: rejeitado._count, valorTotal: Number(rejeitado._sum.valor ?? 0) },
      },
      taxas: {
        repassadoAosSindicos: Number(comissoes._sum.valor ?? 0),
        retidoPelaPlataforma: Number(retido._sum.valor ?? 0),
      },
      condominiosAtivos,
    };
  }

  /** Busca de usuários pra abrir o extrato de qualquer um (nome ou e-mail contém o termo). */
  async listarUsuarios(busca?: string): Promise<UsuarioAdminDTO[]> {
    const termo = busca?.trim();
    const usuarios = await this.prisma.user.findMany({
      where: termo
        ? { OR: [{ nome: { contains: termo } }, { email: { contains: termo } }] }
        : undefined,
      include: { condominio: true },
      orderBy: { nome: 'asc' },
      take: 50,
    });

    return usuarios.map((usuario) => ({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      condominio: usuario.condominio?.nome ?? null,
      ativo: usuario.ativo,
    }));
  }

  async buscarUsuarioOuFalhar(userId: string): Promise<UsuarioAdminDTO> {
    const usuario = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { condominio: true },
    });

    if (!usuario) {
      throw new NotFoundError('Usuário não encontrado');
    }

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      papel: usuario.papel,
      condominio: usuario.condominio?.nome ?? null,
      ativo: usuario.ativo,
    };
  }

  /**
   * Conta da plataforma (USAI): tudo que ficou com ela — taxa de condomínio sem síndico ativo e a
   * taxa dos aluguéis anteriores à comissão do síndico — cada linha com a origem e a taxa aplicada.
   */
  async extratoPlataforma(): Promise<ExtratoPlataformaDTO> {
    const lancamentos = await this.prisma.lancamento.findMany({
      where: { userId: null },
      include: INCLUIR_ORIGEM,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const movimentos = lancamentos.map((lancamento) => ({
      id: lancamento.id,
      data: lancamento.createdAt,
      descricao: lancamento.descricao,
      valor: Number(lancamento.valor),
      baseCalculo: lancamento.baseCalculo === null ? null : Number(lancamento.baseCalculo),
      taxaPercentual: lancamento.taxaPercentual === null ? null : Number(lancamento.taxaPercentual),
      origem: lancamento.locacao ? toOrigemDTO(lancamento.locacao) : null,
    }));

    const totalRetido = Math.round(movimentos.reduce((t, m) => t + m.valor, 0) * 100) / 100;

    return { totalRetido, movimentos };
  }

  private async buscarCondominioOuFalhar(condominioId: string): Promise<Condominio> {
    const condominio = await this.prisma.condominio.findUnique({ where: { id: condominioId } });

    if (!condominio) {
      throw new NotFoundError('Condomínio não encontrado');
    }

    return condominio;
  }
}
