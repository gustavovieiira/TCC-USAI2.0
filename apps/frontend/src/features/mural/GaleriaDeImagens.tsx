import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface GaleriaDeImagensProps {
  imagens: string[];
  /** Texto alternativo base ("Foto 1 de 3 do post de Ana"). */
  descricao?: string;
}

/**
 * Fotos de um post: uma grande, ou uma grade de 2 colunas para 2 a 4 fotos. Clicar abre a foto ampliada, com setas
 * e a tecla Esc para fechar.
 */
export function GaleriaDeImagens({ imagens, descricao = 'Foto do post' }: GaleriaDeImagensProps) {
  const [aberta, setAberta] = useState<number | null>(null);

  useEffect(() => {
    if (aberta === null) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === 'Escape') setAberta(null);
      if (evento.key === 'ArrowRight')
        setAberta((i) => (i === null ? i : (i + 1) % imagens.length));
      if (evento.key === 'ArrowLeft') {
        setAberta((i) => (i === null ? i : (i - 1 + imagens.length) % imagens.length));
      }
    }
    document.addEventListener('keydown', aoTeclar);
    return () => document.removeEventListener('keydown', aoTeclar);
  }, [aberta, imagens.length]);

  if (imagens.length === 0) return null;

  const unica = imagens.length === 1;

  return (
    <>
      <ul
        aria-label="Fotos do post"
        className={`mt-3 grid gap-1.5 ${unica ? 'grid-cols-1' : 'grid-cols-2'}`}
      >
        {imagens.map((url, i) => (
          <li key={url} className="overflow-hidden rounded-[12px] bg-paper-line">
            <button
              type="button"
              onClick={() => setAberta(i)}
              aria-label={`Ampliar ${descricao} ${i + 1} de ${imagens.length}`}
              className="block w-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <img
                src={url}
                alt={`${descricao} ${i + 1} de ${imagens.length}`}
                loading="lazy"
                className={`w-full object-cover transition hover:opacity-90 ${
                  unica ? 'max-h-96' : 'aspect-square'
                }`}
              />
            </button>
          </li>
        ))}
      </ul>

      {aberta !== null &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${descricao} ${aberta + 1} de ${imagens.length}`}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) setAberta(null);
            }}
          >
            <img
              src={imagens[aberta]}
              alt={`${descricao} ${aberta + 1} de ${imagens.length}`}
              className="max-h-[85vh] max-w-full rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={() => setAberta(null)}
              aria-label="Fechar foto"
              className="absolute right-4 top-4 h-11 w-11 rounded-full bg-white/15 text-xl text-white hover:bg-white/25"
            >
              ✕
            </button>
            {imagens.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setAberta((aberta - 1 + imagens.length) % imagens.length)}
                  aria-label="Foto anterior"
                  className="absolute left-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-white/15 text-xl text-white hover:bg-white/25"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={() => setAberta((aberta + 1) % imagens.length)}
                  aria-label="Próxima foto"
                  className="absolute right-3 top-1/2 h-11 w-11 -translate-y-1/2 rounded-full bg-white/15 text-xl text-white hover:bg-white/25"
                >
                  ›
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
