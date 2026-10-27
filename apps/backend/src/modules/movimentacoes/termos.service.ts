import { Prisma, PrismaClient, TipoMovimentacao } from '@prisma/client';
import { AppError, NotFoundError } from '@/common/errors';
import { toTermoDTO } from './movimentacoes.service';
import { CriarTermoInput, TermoDTO } from './movimentacoes.types';

/**
 * Termos de responsabilidade configuráveis pelo Admin. Editar NÃO altera o texto existente:
 * cria uma nova versão (as anteriores ficam intactas, porque os aceites já dados apontam pra elas).
 * Toda versão nasce como MODELO e só vira APROVADO quando o Admin registra que a revisão da
 * empresa/condomínio aconteceu — até lá, a tela deixa claro que o texto não foi validado
 * juridicamente.
 */
export class TermosService {
  constructor(private readonly prisma: PrismaClient) {}

  async listar(): Promise<TermoDTO[]> {
    const termos = await this.prisma.termoResponsabilidade.findMany({
      orderBy: [{ tipo: 'asc' }, { versao: 'desc' }],
    });

    return termos.map(toTermoDTO);
  }

  async criarNovaVersao(adminId: string, input: CriarTermoInput): Promise<TermoDTO> {
    try {
      const criado = await this.prisma.$transaction(async (tx) => {
        const ultima = await tx.termoResponsabilidade.aggregate({
          where: { tipo: input.tipo },
          _max: { versao: true },
        });

        const termo = await tx.termoResponsabilidade.create({
          data: {
            tipo: input.tipo as TipoMovimentacao,
            versao: (ultima._max.versao ?? 0) + 1,
            titulo: input.titulo,
            clausulas: input.clausulas as unknown as Prisma.InputJsonValue,
            declaracoes: input.declaracoes as unknown as Prisma.InputJsonValue,
            statusRevisao: 'MODELO',
            criadoPorId: adminId,
          },
        });

        await tx.logAuditoria.create({
          data: {
            adminId,
            acao: 'CRIAR_VERSAO_TERMO',
            alvoTipo: 'TermoResponsabilidade',
            alvoId: termo.id,
            metadata: { tipo: termo.tipo, versao: termo.versao },
          },
        });

        return termo;
      });

      return toTermoDTO(criado);
    } catch (erro) {
      // Dois Admins salvando ao mesmo tempo: a segunda versão repetida cai na chave única.
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new AppError(
          'Outra versão foi criada ao mesmo tempo. Tente novamente.',
          409,
          'VERSAO_DUPLICADA',
        );
      }
      throw erro;
    }
  }

  /** O Admin registra que o texto passou pela revisão da empresa/condomínio. */
  async aprovar(id: string, adminId: string): Promise<TermoDTO> {
    const termo = await this.prisma.termoResponsabilidade.findUnique({ where: { id } });

    if (!termo) {
      throw new NotFoundError('Termo não encontrado');
    }
    if (termo.statusRevisao === 'APROVADO') {
      throw new AppError('Esta versão já está aprovada', 409, 'INVALID_STATUS');
    }

    const atualizado = await this.prisma.termoResponsabilidade.update({
      where: { id },
      data: { statusRevisao: 'APROVADO', aprovadoPorId: adminId, aprovadoEm: new Date() },
    });

    await this.prisma.logAuditoria.create({
      data: {
        adminId,
        acao: 'APROVAR_TERMO',
        alvoTipo: 'TermoResponsabilidade',
        alvoId: id,
        metadata: { tipo: termo.tipo, versao: termo.versao },
      },
    });

    return toTermoDTO(atualizado);
  }
}
