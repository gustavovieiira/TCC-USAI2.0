import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Spinner } from '@/components/ui/Spinner';
import {
  consultarContratacao,
  ContratacaoDTO,
  reenviarAcesso,
} from '@/features/assinaturas/assinaturas.api';
import { extractErrorMessage } from '@/lib/apiClient';
import { formatCurrency } from '@/lib/format';
import { AuthShell } from './AuthShell';

const INTERVALO_CONSULTA_MS = 5000;

/**
 * Passo seguinte à contratação: mostra o PIX e espera a confirmação do pagamento (consulta a cada
 * poucos segundos). Confirmado, avisa que o acesso foi enviado por e-mail.
 */
export function AcompanharContratacaoPage() {
  const { id = '' } = useParams();
  const [contratacao, setContratacao] = useState<ContratacaoDTO | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);

  const aguardando = contratacao?.status === 'AGUARDANDO_PAGAMENTO';

  const consultar = useCallback(async () => {
    try {
      setContratacao(await consultarContratacao(id));
      setErro(null);
    } catch (err) {
      setErro(extractErrorMessage(err));
    }
  }, [id]);

  useEffect(() => {
    consultar();
  }, [consultar]);

  useEffect(() => {
    if (!aguardando) return undefined;
    const timer = setInterval(consultar, INTERVALO_CONSULTA_MS);
    return () => clearInterval(timer);
  }, [aguardando, consultar]);

  async function handleReenviar() {
    setAviso(null);
    setReenviando(true);
    try {
      await reenviarAcesso(id);
      setAviso('Pronto! Enviamos o e-mail de novo. Confira a caixa de entrada e o spam.');
    } catch (err) {
      setAviso(extractErrorMessage(err));
    } finally {
      setReenviando(false);
    }
  }

  if (erro && !contratacao) {
    return (
      <AuthShell title="Contratação não encontrada" subtitle="Confira o endereço desta página.">
        <p role="alert" className="text-center text-sm text-carmim-700">
          {erro}
        </p>
        <p className="mt-6 text-center text-sm">
          <Link to="/" className="font-semibold text-barro-700 hover:underline">
            Voltar para a tela inicial
          </Link>
        </p>
      </AuthShell>
    );
  }

  if (!contratacao) {
    return (
      <AuthShell title="Carregando…" subtitle="Buscando a sua contratação.">
        <div className="flex justify-center py-6">
          <Spinner />
        </div>
      </AuthShell>
    );
  }

  const { plano } = contratacao;

  if (aguardando) {
    return (
      <AuthShell
        title="Falta só o pagamento"
        subtitle={`${contratacao.nomeCondominio} · plano ${plano.nome}`}
      >
        <div className="notch-sm border border-paper-line bg-paper p-4 text-center">
          <p className="font-meta text-xs uppercase tracking-wide text-ink-faint">
            Primeiro pagamento · {contratacao.periodo.nome}
          </p>
          <p className="font-display text-3xl font-bold text-ink">
            {formatCurrency(contratacao.valorCiclo)}
          </p>
          {contratacao.periodo.desconto > 0 && (
            <p className="text-xs font-semibold text-jade-700">
              Já com {contratacao.periodo.desconto}% de desconto
            </p>
          )}
        </div>

        {contratacao.invoiceUrl && (
          <a
            href={contratacao.invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="notch mt-4 flex min-h-[44px] items-center justify-center bg-barro-500 px-5 py-3
              font-bold text-paper-surface shadow-press hover:bg-barro-700"
          >
            Pagar com PIX
          </a>
        )}

        <p
          role="status"
          className="mt-5 flex items-center justify-center gap-2 text-center text-sm text-ink-soft"
        >
          <Spinner />
          Aguardando a confirmação do pagamento. Esta página atualiza sozinha.
        </p>
        <p className="mt-3 text-center text-xs text-ink-faint">
          Pode fechar esta página: quando o PIX for confirmado, o acesso chega em{' '}
          {contratacao.emailMascarado}.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Pagamento confirmado!"
      subtitle={`${contratacao.nomeCondominio} já está ativo na USAI.`}
    >
      <p className="text-center text-sm text-ink">
        Enviamos para <strong>{contratacao.emailMascarado}</strong> o link para você criar a sua
        senha e entrar. Ele vale por 48 horas.
      </p>
      <p className="mt-3 text-center text-sm text-ink-soft">
        Depois de entrar, o painel do síndico mostra o link e o PIN para compartilhar com os
        moradores.
      </p>

      {aviso && (
        <p role="status" className="mt-4 text-center text-sm text-ink-soft">
          {aviso}
        </p>
      )}

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleReenviar}
          disabled={reenviando}
          className="text-sm font-semibold text-barro-700 hover:underline disabled:opacity-60"
        >
          {reenviando ? 'Enviando…' : 'Não recebi o e-mail — reenviar'}
        </button>
        <Link to="/login" className="text-sm font-semibold text-ink-soft hover:text-ink">
          Já criei a minha senha — entrar
        </Link>
      </div>
    </AuthShell>
  );
}
