import { CSSProperties } from 'react';
import { useNaTela } from '@/features/landing/revelar';
import { janelasDoPredio } from './sindico.filtros';

interface PredioMoradoresProps {
  moradores: number;
  /** Limite de moradores do plano. Sem plano (condomínio antigo), só mostra quem já entrou. */
  limite: number | null;
}

/** O prédio do condomínio: cada janela acesa é um morador, as apagadas são as vagas que sobram no plano. */
export function PredioMoradores({ moradores, limite }: PredioMoradoresProps) {
  const [ref, naTela] = useNaTela<HTMLDivElement>();
  const { total, acesas } = janelasDoPredio(moradores, limite);
  const descricao = limite
    ? `${moradores} de ${limite} moradores do plano`
    : `${moradores} ${moradores === 1 ? 'morador cadastrado' : 'moradores cadastrados'}`;

  return (
    <div ref={ref} role="img" aria-label={descricao} className="flex flex-wrap gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          data-acesa={naTela && i < acesas}
          style={{ '--atraso': `${Math.min(i, 24) * 55}ms` } as CSSProperties}
          className="relative block h-7 w-[1.15rem] overflow-hidden rounded-[4px] bg-fachada-noite-fundo"
        >
          <span className="janela-luz absolute inset-[2px] rounded-[2px] bg-fachada-luz" />
        </span>
      ))}
    </div>
  );
}
