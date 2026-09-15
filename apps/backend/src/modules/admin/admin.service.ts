import bcrypt from 'bcryptjs';
import { Condominio, PrismaClient, User } from '@prisma/client';
import { BCRYPT_ROUNDS } from '@/modules/auth/auth.service';
import { ConflictError, NotFoundError } from '@/common/errors';
import {
  AtualizarCondominioInput,
  CondominioDTO,
  CriarCondominioInput,
  CriarSindicoInput,
  ListarCondominiosFiltro,
  ResumoFinanceiroDTO,
  SindicoDTO,
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
    const [pendente, aprovado, rejeitado, condominiosAtivos] = await Promise.all([
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
        where: { status: 'REJEITADO' },
        _count: true,
        _sum: { valor: true },
      }),
      this.prisma.condominio.count({ where: { ativo: true } }),
    ]);

    return {
      saques: {
        pendente: { quantidade: pendente._count, valorTotal: Number(pendente._sum.valor ?? 0) },
        aprovado: { quantidade: aprovado._count, valorTotal: Number(aprovado._sum.valor ?? 0) },
        rejeitado: { quantidade: rejeitado._count, valorTotal: Number(rejeitado._sum.valor ?? 0) },
      },
      condominiosAtivos,
    };
  }

  private async buscarCondominioOuFalhar(condominioId: string): Promise<Condominio> {
    const condominio = await this.prisma.condominio.findUnique({ where: { id: condominioId } });

    if (!condominio) {
      throw new NotFoundError('Condomínio não encontrado');
    }

    return condominio;
  }
}
