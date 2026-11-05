import { CSSProperties } from 'react';
import { useNaTela } from '@/features/landing/revelar';

interface JanelasAcendendoProps {
  quantidade?: number;
  /** Cor da parede onde as janelas estão (o vidro apagado usa a tinta escura de qualquer jeito). */
  className?: string;
}

/** Fileira de janelinhas que acendem em cascata quando entra na tela (enfeite e comemoração). */
export function JanelasAcendendo({ quantidade = 12, className = '' }: JanelasAcendendoProps) {
  const [ref, naTela] = useNaTela<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`flex max-w-xs flex-wrap justify-center gap-2 sm:max-w-none sm:gap-2.5 ${className}`}
      aria-hidden="true"
    >
      {Array.from({ length: quantidade }, (_, i) => (
        <span
          key={i}
          data-acesa={naTela && i % 4 !== 2}
          style={{ '--atraso': `${i * 110}ms` } as CSSProperties}
          className="relative block h-9 w-6 overflow-hidden rounded-[5px] bg-fachada-tinta sm:h-11 sm:w-7"
        >
          <span className="janela-luz absolute inset-[3px] rounded-[3px] bg-fachada-luz" />
        </span>
      ))}
    </div>
  );
}

/** As janelinhas ficam piscando uma depois da outra: "esperando acontecer" (usada na espera do PIX). */
export function JanelasEsperando() {
  return (
    <div className="flex justify-center gap-2" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="relative block h-8 w-5 overflow-hidden rounded-[4px] bg-fachada-tinta"
        >
          <span
            className="luz-vizinho absolute inset-[3px] rounded-[2px] bg-fachada-luz"
            style={
              {
                '--duracao': '2.4s',
                '--atraso': `${i * 300}ms`,
                '--base': 0.12,
                '--alto': 1,
              } as CSSProperties
            }
          />
        </span>
      ))}
    </div>
  );
}
