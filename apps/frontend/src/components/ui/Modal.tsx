import { PropsWithChildren, useEffect } from 'react';

interface ModalProps {
  titulo: string;
  onFechar: () => void;
}

/** Janela sobre a página: fecha com Esc, clicando fora ou no botão ✕. */
export function Modal({ titulo, onFechar, children }: PropsWithChildren<ModalProps>) {
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') onFechar();
    }

    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [onFechar]);

  return (
    <div
      role="presentation"
      className="modal-overlay fixed inset-0 z-40 flex items-center justify-center bg-ink/50 p-4"
      onClick={(e) => {
        // Só fecha ao clicar no fundo escuro, não em algo de dentro da janela.
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="modal-painel notch relative max-h-[90vh] w-full max-w-md overflow-y-auto bg-paper-surface p-6 shadow-paper-2"
      >
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar janela"
          className="no-print absolute right-3 top-3 text-ink-faint hover:text-ink"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  );
}
