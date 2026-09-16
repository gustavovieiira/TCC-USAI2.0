import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractErrorMessage } from '@/lib/apiClient';
import { abrirConversa } from './conversas.api';

interface ConversarButtonProps {
  usuarioId: string;
  nomeDoOutro: string;
  postOrigemId?: string;
  variant?: 'icon' | 'text';
}

/** Abre (ou continua) um chat privado 1:1 com a pessoa — usado a partir do Mural (post/comentário). */
export function ConversarButton({
  usuarioId,
  nomeDoOutro,
  postOrigemId,
  variant = 'icon',
}: ConversarButtonProps) {
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleClick() {
    setErro(null);
    setCarregando(true);

    try {
      const conversa = await abrirConversa({ usuarioId, postOrigemId });
      navigate(`/conversas/${conversa.id}`);
    } catch (err) {
      setErro(extractErrorMessage(err));
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className={variant === 'icon' ? 'inline-flex flex-col' : 'flex flex-col items-start'}>
      <button
        type="button"
        onClick={handleClick}
        disabled={carregando}
        aria-label={`Conversar com ${nomeDoOutro}`}
        className={
          variant === 'icon'
            ? 'flex items-center gap-1 text-slate-400 transition hover:text-brand-600 disabled:opacity-50'
            : 'flex items-center gap-1.5 text-sm font-medium text-brand-600 transition hover:text-brand-700 disabled:opacity-50'
        }
      >
        <IconConversar className="h-4 w-4" />
        {variant === 'text' && 'Conversar'}
      </button>
      {erro && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {erro}
        </p>
      )}
    </div>
  );
}

function IconConversar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
