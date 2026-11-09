import { FormEvent, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { extractErrorMessage } from '@/lib/apiClient';
import { baixarMeusDados, excluirMinhaConta } from './privacidade.api';

interface SeusDadosProps {
  /** Data em que a pessoa aceitou os Termos e a Política, gravada no cadastro. */
  aceitouTermosEm?: string | null;
  /** Chamado depois que a conta foi excluída, para encerrar a sessão neste aparelho. */
  aoExcluir: () => void;
}

const LINK_DO_MENU =
  'block rounded-lg px-3 py-2 text-sm font-medium text-ink-soft hover:bg-paper hover:text-ink';

function IconeEngrenagem() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v.1a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

/**
 * Direitos do titular (LGPD) sem aparecer demais: uma engrenagem discreta que abre um menu com "Baixar meus
 * dados" e "Excluir minha conta" (e os links dos Termos e da Política). Excluir ainda pede senha e confirmação.
 */
export function SeusDados({ aceitouTermosEm, aoExcluir }: SeusDadosProps) {
  const raiz = useRef<HTMLDivElement>(null);
  const [menuAberto, setMenuAberto] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [erroDownload, setErroDownload] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [senha, setSenha] = useState('');
  const [palavra, setPalavra] = useState('');
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  // O menu fecha ao clicar fora dele ou apertar Esc.
  useEffect(() => {
    if (!menuAberto) return;
    function aoClicarFora(evento: MouseEvent) {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setMenuAberto(false);
    }
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setMenuAberto(false);
    }
    document.addEventListener('mousedown', aoClicarFora);
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('mousedown', aoClicarFora);
      document.removeEventListener('keydown', aoTeclar);
    };
  }, [menuAberto]);

  async function baixar() {
    setErroDownload(null);
    setBaixando(true);
    try {
      const arquivo = await baixarMeusDados();
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'meus-dados-usai.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setMenuAberto(false);
    } catch (err) {
      setErroDownload(extractErrorMessage(err));
    } finally {
      setBaixando(false);
    }
  }

  function abrirConfirmacao() {
    setMenuAberto(false);
    setSenha('');
    setPalavra('');
    setErroExclusao(null);
    setConfirmando(true);
  }

  async function excluir(evento: FormEvent) {
    evento.preventDefault();
    setErroExclusao(null);
    setExcluindo(true);
    try {
      await excluirMinhaConta(senha);
      aoExcluir();
    } catch (err) {
      setErroExclusao(extractErrorMessage(err));
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      {confirmando &&
        createPortal(
          <Modal titulo="Excluir minha conta" onFechar={() => setConfirmando(false)}>
            <h2 className="pr-8 font-marca text-xl font-extrabold leading-tight text-fachada-tinta">
              Excluir minha conta
            </h2>
            <p className="mt-2 text-sm text-fachada-tinta-suave">
              Isso não pode ser desfeito. Seu nome, e-mail, CPF, chave PIX e apartamento deixam de
              existir, seus anúncios saem do ar e o que você escreveu no Mural é apagado. Os
              registros financeiros e os documentos de locação que a lei manda guardar continuam,
              sem identificar você.
            </p>
            <form onSubmit={excluir} className="mt-4 flex flex-col gap-3" noValidate>
              <TextField
                label="Sua senha"
                name="senhaExclusao"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
              />
              <TextField
                label="Digite EXCLUIR para confirmar"
                name="confirmacaoExclusao"
                autoComplete="off"
                value={palavra}
                onChange={(e) => setPalavra(e.target.value)}
              />
              {erroExclusao && (
                <p role="alert" className="text-sm font-medium text-fachada-coral-texto">
                  {erroExclusao}
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  variant="danger"
                  fullWidth={false}
                  disabled={excluindo || !senha || palavra.trim().toUpperCase() !== 'EXCLUIR'}
                >
                  {excluindo ? 'Excluindo…' : 'Excluir para sempre'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth={false}
                  onClick={() => setConfirmando(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </Modal>,
          document.body,
        )}

      <div ref={raiz} className="relative">
        <button
          type="button"
          aria-label="Dados e privacidade"
          aria-haspopup="menu"
          aria-expanded={menuAberto}
          onClick={() => setMenuAberto((aberto) => !aberto)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-ink-faint transition hover:bg-paper hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          <IconeEngrenagem />
        </button>

        {menuAberto && (
          <div
            role="menu"
            aria-label="Dados e privacidade"
            className="absolute right-0 top-12 z-30 w-72 rounded-[16px] border border-paper-line bg-white p-2 shadow-paper-2"
          >
            <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Seus dados e privacidade
            </p>
            <button
              type="button"
              role="menuitem"
              disabled={baixando}
              onClick={baixar}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-ink hover:bg-paper disabled:opacity-60"
            >
              {baixando ? 'Preparando o arquivo…' : 'Baixar meus dados'}
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={abrirConfirmacao}
              className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-carmim-700 hover:bg-paper"
            >
              Excluir minha conta
            </button>
            {erroDownload && (
              <p role="alert" className="px-3 py-1 text-sm font-medium text-fachada-coral-texto">
                {erroDownload}
              </p>
            )}

            <div className="my-1 border-t border-paper-line" />
            <Link to="/termos" role="menuitem" className={LINK_DO_MENU}>
              Termos de Uso
            </Link>
            <Link to="/privacidade" role="menuitem" className={LINK_DO_MENU}>
              Política de Privacidade
            </Link>
            {aceitouTermosEm && (
              <p className="px-3 pb-2 pt-1 text-xs text-ink-faint">
                Aceite registrado em{' '}
                <strong className="text-ink-soft">
                  {new Date(aceitouTermosEm).toLocaleDateString('pt-BR')}
                </strong>
                .
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
