import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '@/common/errors';
import { mascararDocumento, numeroDoRecibo } from '@/modules/assinaturas/assinaturas.service';
import { buscarPeriodo, buscarPlano } from '@/modules/assinaturas/planos';
import {
  AssinaturaAdminDTO,
  AssinaturasAdminDTO,
  CategoriaDespesa,
  CriarDespesaInput,
  DespesaDTO,
  RecebimentoDTO,
  StatusAssinaturaAdmin,
  VendasDoMesDTO,
} from './plataforma.types';

const MS_POR_DIA = 24 * 60 * 60 * 1000;
const FUSO = '-03:00';

function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/** O mês de hoje no horário de Brasília, AAAA-MM. */
function mesAtual(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7);
}

/** Início do mês e início do mês seguinte, em horário de Brasília: [inicio, fim). */
function intervaloDoMes(mes: string): { inicio: Date; fim: Date } {
  const [ano, numero] = mes.split('-').map(Number);
  const proximo = numero === 12 ? `${ano + 1}-01` : `${ano}-${String(numero + 1).padStart(2, '0')}`;
  return {
    inicio: new Date(`${mes}-01T00:00:00${FUSO}`),
    fim: new Date(`${proximo}-01T00:00:00${FUSO}`),
  };
}

/**
 * Financeiro das VENDAS da plataforma (as mensalidades que os síndicos pagam), separado do dinheiro das locações entre
 * moradores. Só o Admin acessa.
 */
export class PlataformaService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Entrou, saiu e o resultado de um mês, com a lista de recebimentos (cada um gera recibo) e de despesas. */
  async vendasDoMes(mes: string = mesAtual()): Promise<VendasDoMesDTO> {
    const { inicio, fim } = intervaloDoMes(mes);

    const [cobrancas, despesas] = await Promise.all([
      this.prisma.cobrancaAssinatura.findMany({
        where: { status: 'PAGO', pagoEm: { gte: inicio, lt: fim } },
        include: { assinatura: { include: { condominio: true, responsavel: true } } },
        orderBy: { pagoEm: 'desc' },
      }),
      this.prisma.despesaPlataforma.findMany({
        where: { data: { gte: inicio, lt: fim } },
        orderBy: [{ data: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    const recebimentos: RecebimentoDTO[] = cobrancas.map((cobranca) => {
      const valor = Number(cobranca.valor);
      const taxaAsaas = cobranca.taxaAsaas === null ? null : Number(cobranca.taxaAsaas);
      const fimDaVigencia = cobranca.ativaAteApos;
      const { assinatura } = cobranca;

      return {
        id: cobranca.id,
        numeroRecibo: numeroDoRecibo(cobranca.id),
        pagoEm: cobranca.pagoEm as Date,
        condominio: { id: assinatura.condominio.id, nome: assinatura.condominio.nome },
        sindico: {
          nome: assinatura.responsavel.nome,
          email: assinatura.responsavel.email,
          documento: mascararDocumento(assinatura.responsavel.cpf),
        },
        plano: buscarPlano(assinatura.planoCodigo)?.nome ?? assinatura.planoCodigo,
        periodo: buscarPeriodo(cobranca.periodoCodigo)?.nome ?? cobranca.periodoCodigo,
        valor,
        taxaAsaas,
        liquido: taxaAsaas === null ? null : arredondar(valor - taxaAsaas),
        dias: cobranca.dias,
        vigenciaInicio: fimDaVigencia
          ? new Date(fimDaVigencia.getTime() - cobranca.dias * MS_POR_DIA)
          : null,
        vigenciaFim: fimDaVigencia,
        comprovanteUrl: cobranca.invoiceUrl || null,
      };
    });

    const entrou = arredondar(recebimentos.reduce((total, r) => total + r.valor, 0));
    const taxasAsaas = arredondar(recebimentos.reduce((total, r) => total + (r.taxaAsaas ?? 0), 0));
    const totalDespesas = arredondar(despesas.reduce((total, d) => total + Number(d.valor), 0));

    return {
      mes,
      resumo: {
        entrou,
        taxasAsaas,
        despesas: totalDespesas,
        resultado: arredondar(entrou - taxasAsaas - totalDespesas),
        pagamentos: recebimentos.length,
        taxasNaoInformadas: recebimentos.filter((r) => r.taxaAsaas === null).length,
      },
      recebimentos,
      despesas: despesas.map(toDespesaDTO),
    };
  }

  /** Todas as assinaturas, com o que falta para vencer, da que vence primeiro para a que vence depois. */
  async listarAssinaturas(): Promise<AssinaturasAdminDTO> {
    const assinaturas = await this.prisma.assinatura.findMany({
      include: { condominio: true, responsavel: true },
    });
    const agora = Date.now();

    const itens: AssinaturaAdminDTO[] = assinaturas.map((assinatura) => ({
      id: assinatura.id,
      condominio: { id: assinatura.condominio.id, nome: assinatura.condominio.nome },
      sindico: { nome: assinatura.responsavel.nome, email: assinatura.responsavel.email },
      plano: buscarPlano(assinatura.planoCodigo)?.nome ?? assinatura.planoCodigo,
      periodo: buscarPeriodo(assinatura.periodoCodigo)?.nome ?? assinatura.periodoCodigo,
      valorCiclo: Number(assinatura.valorCiclo),
      status: assinatura.status as StatusAssinaturaAdmin,
      ativaAte: assinatura.ativaAte,
      diasRestantes: assinatura.ativaAte
        ? Math.ceil((assinatura.ativaAte.getTime() - agora) / MS_POR_DIA)
        : null,
    }));

    itens.sort((a, b) => {
      if (a.ativaAte && b.ativaAte) return a.ativaAte.getTime() - b.ativaAte.getTime();
      if (a.ativaAte) return -1;
      if (b.ativaAte) return 1;
      return a.condominio.nome.localeCompare(b.condominio.nome);
    });

    return {
      resumo: {
        total: itens.length,
        ativas: itens.filter((i) => i.status === 'ATIVA').length,
        aguardandoPagamento: itens.filter((i) => i.status === 'AGUARDANDO_PAGAMENTO').length,
        suspensas: itens.filter((i) => i.status === 'SUSPENSA').length,
        vencidas: itens.filter(
          (i) => i.status === 'ATIVA' && i.diasRestantes !== null && i.diasRestantes < 0,
        ).length,
      },
      itens,
    };
  }

  async criarDespesa(input: CriarDespesaInput, adminId: string): Promise<DespesaDTO> {
    const despesa = await this.prisma.despesaPlataforma.create({
      data: {
        // Meio-dia de Brasília: a despesa cai no dia certo em qualquer fuso.
        data: new Date(`${input.data}T12:00:00${FUSO}`),
        valor: input.valor,
        descricao: input.descricao,
        categoria: input.categoria,
        criadoPorId: adminId,
      },
    });
    return toDespesaDTO(despesa);
  }

  async removerDespesa(id: string): Promise<void> {
    const existente = await this.prisma.despesaPlataforma.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Despesa não encontrada');
    await this.prisma.despesaPlataforma.delete({ where: { id } });
  }
}

function toDespesaDTO(despesa: {
  id: string;
  data: Date;
  valor: unknown;
  descricao: string;
  categoria: string;
}): DespesaDTO {
  return {
    id: despesa.id,
    data: despesa.data,
    valor: Number(despesa.valor),
    descricao: despesa.descricao,
    categoria: despesa.categoria as CategoriaDespesa,
  };
}
