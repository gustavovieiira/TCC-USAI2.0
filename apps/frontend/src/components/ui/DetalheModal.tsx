import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Modal } from '@/components/ui/Modal';
import { useConfiguracao } from '@/features/configuracao/ConfiguracaoContext';
import { formatDateHora } from '@/lib/format';

export interface LinhaDetalhe {
  rotulo: string;
  valor: string;
}

/** Tudo que o modal precisa pra mostrar os dados de um card e, se couber, virar um recibo. */
export interface Detalhe {
  titulo: string;
  subtitulo?: string;
  linhas: LinhaDetalhe[];
  /** Identificador que aparece como protocolo no recibo. */
  protocolo: string;
  /** Só operações concluídas (saque pago, aluguel recebido/pago) geram recibo; o resto só imprime os detalhes. */
  recibo: boolean;
}

interface DetalheModalProps {
  detalhe: Detalhe;
  onFechar: () => void;
}

/**
 * Detalhes de um card (saque, recebimento, pagamento). O botão imprime só o bloco do recibo
 * (ver `@media print` em index.css) — no diálogo de impressão do navegador dá pra salvar em PDF.
 */
export function DetalheModal({ detalhe, onFechar }: DetalheModalProps) {
  const { configuracao } = useConfiguracao();

  return (
    <Modal titulo={detalhe.titulo} onFechar={onFechar}>
      <section className="recibo-print flex flex-col gap-4">
        <header className="border-b border-paper-line pb-3">
          <Logo altura={36} className="text-ink" />
          <p className="mt-1 font-meta text-[10px] uppercase tracking-wide text-ink-faint">
            {configuracao.nomeInstitucional}
          </p>
          <h2 className="mt-1 pr-6 font-display text-xl font-bold text-ink">{detalhe.titulo}</h2>
          {detalhe.subtitulo && <p className="text-sm text-ink-soft">{detalhe.subtitulo}</p>}
        </header>

        <dl className="flex flex-col gap-2">
          {detalhe.linhas.map((linha) => (
            <div key={linha.rotulo} className="flex items-start justify-between gap-4 text-sm">
              <dt className="text-ink-soft">{linha.rotulo}</dt>
              <dd className="text-right font-semibold text-ink">{linha.valor}</dd>
            </div>
          ))}
        </dl>

        <footer className="border-t border-paper-line pt-3 text-xs text-ink-faint">
          <p>Protocolo: {detalhe.protocolo}</p>
          <p>Emitido em {formatDateHora(new Date().toISOString())}</p>
          <p className="mt-1">{configuracao.rodapeInstitucional}</p>
          <p>Documento informativo, sem valor fiscal.</p>
        </footer>
      </section>

      <div className="no-print mt-5 flex gap-2">
        <Button fullWidth={false} onClick={() => window.print()}>
          {detalhe.recibo ? 'Gerar recibo' : 'Imprimir detalhes'}
        </Button>
        <Button variant="ghost" fullWidth={false} onClick={onFechar}>
          Fechar
        </Button>
      </div>
    </Modal>
  );
}
