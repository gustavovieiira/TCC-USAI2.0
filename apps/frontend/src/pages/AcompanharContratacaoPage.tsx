import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { JanelasAcendendo, JanelasEsperando } from '@/components/fachada/JanelasAcendendo';
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

const LINK =
  'font-semibold text-fachada-coral-texto underline underline-offset-2 hover:no-underline';

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
    consultar().catch(() => undefined);
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
        <p role="alert" className="text-center text-sm font-medium text-fachada-coral-texto">
          {erro}
        </p>
        <p className="mt-6 text-center text-sm">
          <Link to="/" className={LINK}>
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
        <div className="rounded-[18px] bg-white p-5 text-center shadow-[0_14px_26px_-18px_rgb(11_42_48/0.5)]">
          <p className="font-mao text-2xl font-bold leading-none text-fachada-coral-texto">
            Primeiro pagamento · {contratacao.periodo.nome}
          </p>
          <p className="mt-2 font-marca text-4xl font-extrabold tracking-tight text-fachada-tinta">
            {formatCurrency(contratacao.valorCiclo)}
          </p>
          {contratacao.periodo.desconto > 0 && (
            <p className="mt-1 text-xs font-semibold text-fachada-folha-texto">
              Já com {contratacao.periodo.desconto}% de desconto
            </p>
          )}
        </div>

        {contratacao.invoiceUrl && (
          <a
            href={contratacao.invoiceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="botao-coral mt-4 w-full"
          >
            Pagar com PIX
          </a>
        )}

        <div role="status" className="mt-6 flex flex-col items-center gap-3 text-center">
          <JanelasEsperando />
          <p className="text-sm text-fachada-tinta-suave">
            Aguardando a confirmação do pagamento. Esta página atualiza sozinha.
          </p>
        </div>
        <p className="mt-3 text-center text-xs text-fachada-tinta-suave">
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
      <JanelasAcendendo quantidade={8} className="mb-6" />
      <p className="text-center text-sm text-fachada-tinta">
        Enviamos para <strong>{contratacao.emailMascarado}</strong> o link para você criar a sua
        senha e entrar. Ele funciona até você criar a senha, sem prazo.
      </p>
      <p className="mt-3 text-center text-sm text-fachada-tinta-suave">
        Depois de criar a senha, você entra sempre pela página <strong>Entrar</strong>, com o seu
        e-mail e a senha que definiu. No painel do síndico estão o link e o PIN para compartilhar
        com os moradores.
      </p>
      <p className="mt-4 rounded-[14px] bg-fachada-luz/25 px-4 py-3 text-center text-xs text-fachada-tinta">
        <strong>Não chegou?</strong> Veja a caixa de <strong>spam</strong> ou de{' '}
        <strong>promoções</strong> e procure por “USAI”. Se estiver lá, marque como “não é spam”.
      </p>

      {aviso && (
        <p role="status" className="mt-4 text-center text-sm text-fachada-tinta-suave">
          {aviso}
        </p>
      )}

      <div className="mt-6 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleReenviar}
          disabled={reenviando}
          className={`text-sm disabled:opacity-60 ${LINK}`}
        >
          {reenviando ? 'Enviando…' : 'Não recebi o e-mail, reenviar'}
        </button>
        <Link
          to="/login"
          className="text-sm font-semibold text-fachada-tinta-suave hover:text-fachada-tinta"
        >
          Já criei a minha senha, entrar
        </Link>
      </div>
    </AuthShell>
  );
}
