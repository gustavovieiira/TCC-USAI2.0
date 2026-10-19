import { HTMLAttributes } from 'react';
import { Card } from './Card';

interface CardClicavelProps extends HTMLAttributes<HTMLDivElement> {
  onAbrir: () => void;
}

const CONTROLES_INTERATIVOS = 'button, a, input, textarea, select, label, form';

/**
 * Card que abre os detalhes ao ser clicado. Pro teclado e leitores de tela existe também um botão
 * explícito "Ver detalhes" — o card em si não é `role="button"` porque pode conter outros botões
 * (ex.: Aprovar/Rejeitar), e botão dentro de botão não é válido. Cliques em qualquer controle
 * dentro do card (botão, link, campo, formulário) não abrem os detalhes: cada um faz o seu trabalho.
 */
export function CardClicavel({ onAbrir, className = '', children, ...props }: CardClicavelProps) {
  return (
    <Card
      className={`cursor-pointer transition hover:bg-paper ${className}`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(CONTROLES_INTERATIVOS)) return;
        onAbrir();
      }}
      {...props}
    >
      {children}
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={onAbrir}
          className="text-xs font-semibold text-barro-700 hover:underline"
        >
          Ver detalhes e recibo ›
        </button>
      </div>
    </Card>
  );
}
