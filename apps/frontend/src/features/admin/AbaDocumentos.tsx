import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatDateHora } from '@/lib/format';
import { listarDocumentosRecentes } from '@/features/movimentacoes/movimentacoes.api';
import { MovimentacaoResumoDTO } from '@/features/movimentacoes/movimentacoes.types';
import { CLASSE_STATUS, ROTULO_STATUS, ROTULO_TIPO } from '@/features/movimentacoes/rotulos';

/** Auditoria: os documentos de retirada/devolução mais recentes de toda a plataforma. */
export function AbaDocumentos() {
  const [documentos, setDocumentos] = useState<MovimentacaoResumoDTO[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    listarDocumentosRecentes()
      .then(setDocumentos)
      .catch((err) => setErro(extractErrorMessage(err)));
  }, []);

  if (erro) return <p className="text-sm text-carmim-700">{erro}</p>;

  if (!documentos) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (documentos.length === 0) {
    return (
      <EmptyState
        title="Nenhum documento ainda"
        description="Quando um item for retirado ou devolvido numa locação, o documento aparece aqui."
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-soft">
        Os 100 documentos mais recentes. Abra um para ver o termo, o aceite, o histórico e a
        verificação de integridade.
      </p>
      <div className="flex max-h-[34rem] flex-col gap-3 overflow-y-auto pr-1">
        {documentos.map((doc) => (
          <Card key={doc.id} className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link
                to={`/movimentacoes/${doc.id}`}
                className="font-display font-semibold text-barro-700 hover:underline"
              >
                {doc.numeroDocumento} · {ROTULO_TIPO[doc.tipo]}
              </Link>
              <span
                className={`notch-sm px-2.5 py-1 text-xs font-bold ${CLASSE_STATUS[doc.status]}`}
              >
                {ROTULO_STATUS[doc.status]}
              </span>
            </div>
            <p className="text-sm text-ink-soft">
              {doc.itemTitulo} — entregue por {doc.entreguePor.nome}, recebido por{' '}
              {doc.recebidoPor.nome}
            </p>
            <span className="text-xs text-ink-faint">{formatDateHora(doc.ocorridoEm)}</span>
          </Card>
        ))}
      </div>
    </div>
  );
}
