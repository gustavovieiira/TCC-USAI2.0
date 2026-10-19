import { HTMLAttributes } from 'react';
import { Card } from './Card';

interface CardClicavelProps extends HTMLAttributes<HTMLDivElement> {
  onAbrir: () => void;
}

/**
 * Card que abre os detalhes ao ser clicado. Pro teclado e leitores de tela existe também um botão
 * explícito "Ver detalhes" — o card em si não é `role="button"` porque pode conter outros botões
 * (ex.: Aprovar/Rejeitar), e botão dentro de botão não é válido.
 */
export function CardClicavel({ onAbrir, className = '', children, ...props }: CardClicavelProps) {
  return (
    <Card
      className={`cursor-pointer transition hover:bg-paper ${className}`}
      onClick={onAbrir}
      {...props}
    >
      {children}
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onAbrir();
          }}
          className="text-xs font-semibold text-barro-700 hover:underline"
        >
          Ver detalhes e recibo ›
        </button>
      </div>
    </Card>
  );
}
