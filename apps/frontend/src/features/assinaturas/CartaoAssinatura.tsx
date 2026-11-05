import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatCurrency, formatDate } from '@/lib/format';
import {
  frequenciaDoPeriodo,
  gerarCobrancaRenovacao,
  PainelAssinaturaDTO,
  PeriodoCodigo,
} from './assinaturas.api';

const STATUS_ROTULO: Record<PainelAssinaturaDTO['status'], string> = {
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  ATIVA: 'Ativa',
  SUSPENSA: 'Suspensa',
};

/** Dias antes do vencimento a partir dos quais o painel começa a avisar. */
const DIAS_PARA_AVISAR = 7;

interface CartaoAssinaturaProps {
  painel: PainelAssinaturaDTO;
}

/** Plano contratado, uso (moradores x limite), vencimento e o PIX da renovação (com troca de período). */
export function CartaoAssinatura({ painel }: CartaoAssinaturaProps) {
  const [pendente, setPendente] = useState(painel.cobrancaPendente);
  const [periodoEscolhido, setPeriodoEscolhido] = useState<PeriodoCodigo>(
    painel.cobrancaPendente?.periodoCodigo ?? painel.periodoCodigo,
  );
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const percentual = Math.min(
    100,
    Math.round((painel.moradoresAtivos / painel.limiteMoradores) * 100),
  );
  const lotado = painel.moradoresAtivos >= painel.limiteMoradores;
  const suspensa = painel.status === 'SUSPENSA';
  const vencendo =
    painel.diasRestantes !== null && painel.diasRestantes <= DIAS_PARA_AVISAR && !suspensa;

  const periodoAtual = painel.opcoesRenovacao.find((o) => o.periodoCodigo === painel.periodoCodigo);
  const opcaoEscolhida = painel.opcoesRenovacao.find((o) => o.periodoCodigo === periodoEscolhido);
  const jaGerada = pendente !== null && pendente.periodoCodigo === periodoEscolhido;

  async function handlePagar() {
    setErro(null);
    setGerando(true);
    try {
      let url = jaGerada ? pendente.invoiceUrl : null;
      if (!url) {
        const gerada = await gerarCobrancaRenovacao(periodoEscolhido);
        url = gerada.invoiceUrl;
        setPendente({
          invoiceUrl: url,
          valor: opcaoEscolhida?.valorTotal ?? 0,
          referencia: '',
          periodoCodigo: periodoEscolhido,
        });
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setGerando(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">Plano {painel.planoNome}</h2>
          <p className="text-sm text-ink-soft">
            {painel.periodoNome} · {formatCurrency(painel.valorCiclo)}{' '}
            {frequenciaDoPeriodo(periodoAtual?.meses ?? 1)}
          </p>
        </div>
        <span
          className={`notch-sm px-3 py-1 text-xs font-semibold ${
            suspensa ? 'bg-carmim-100 text-carmim-700' : 'bg-jade-100 text-jade-700'
          }`}
        >
          {STATUS_ROTULO[painel.status]}
        </span>
      </div>

      <div>
        <div className="flex items-baseline justify-between text-sm">
          <span className="text-ink">Moradores</span>
          <span className="font-semibold text-ink">
            {painel.moradoresAtivos} de {painel.limiteMoradores}
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Uso do plano"
          aria-valuemin={0}
          aria-valuemax={painel.limiteMoradores}
          aria-valuenow={painel.moradoresAtivos}
          className="mt-1.5 h-2 w-full bg-paper-line"
        >
          <div
            className={`h-full ${lotado ? 'bg-carmim-500' : 'bg-jade-500'}`}
            style={{ width: `${percentual}%` }}
          />
        </div>
        {lotado && (
          <p className="mt-1.5 text-xs text-carmim-700">
            O plano está cheio: novos moradores não conseguem se cadastrar.
          </p>
        )}
      </div>

      {painel.ativaAte && (
        <p className="text-sm text-ink-soft">
          {suspensa ? 'Venceu em' : 'Ativa até'}{' '}
          <strong className="text-ink">{formatDate(painel.ativaAte)}</strong>
        </p>
      )}

      {suspensa && (
        <p role="alert" className="text-sm text-carmim-700">
          O período venceu e o acesso dos moradores está suspenso. Pague o PIX para reativar.
        </p>
      )}
      {vencendo && (
        <p role="status" className="text-sm text-mostarda-700">
          O período vence em {Math.max(painel.diasRestantes ?? 0, 0)}{' '}
          {painel.diasRestantes === 1 ? 'dia' : 'dias'}.
        </p>
      )}

      {erro && (
        <p role="alert" className="text-sm text-carmim-700">
          {erro}
        </p>
      )}

      {(suspensa || vencendo || pendente) && (
        <div className="flex flex-col gap-3 border-t border-dashed border-paper-line pt-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="renovar-por" className="text-sm font-medium text-ink">
              Renovar por
            </label>
            <select
              id="renovar-por"
              value={periodoEscolhido}
              onChange={(e) => setPeriodoEscolhido(e.target.value as PeriodoCodigo)}
              className="min-h-[44px] border border-ink/40 bg-paper-surface px-3 py-2 text-sm text-ink
                outline-none focus:border-ink"
            >
              {painel.opcoesRenovacao.map((opcao) => (
                <option key={opcao.periodoCodigo} value={opcao.periodoCodigo}>
                  {opcao.nome}: {formatCurrency(opcao.valorTotal)}
                  {opcao.desconto > 0 ? ` (−${opcao.desconto}%)` : ''}
                </option>
              ))}
            </select>
            {opcaoEscolhida && opcaoEscolhida.economia > 0 && (
              <p className="text-xs font-semibold text-jade-700">
                Economia de {formatCurrency(opcaoEscolhida.economia)} em relação ao mensal.
              </p>
            )}
          </div>

          <Button
            type="button"
            fullWidth={false}
            isLoading={gerando}
            onClick={handlePagar}
            className="self-start"
          >
            {jaGerada ? 'Pagar renovação (PIX)' : 'Gerar PIX da renovação'}
          </Button>
        </div>
      )}
    </Card>
  );
}
