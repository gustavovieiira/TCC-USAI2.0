import { CSSProperties } from 'react';

/**
 * Fundo das telas de acesso: o céu da USAI (estrelas que piscam, lua) e, lá embaixo, a silhueta de prédios com
 * janelas que acendem e apagam devagar, cada uma no seu ritmo (só CSS, sem JavaScript). É enfeite: fica atrás do
 * conteúdo, não recebe cliques e o leitor de tela o ignora.
 */

interface Predio {
  x: number;
  largura: number;
  altura: number;
  colunas: number;
}

const BASE = 900;

const PREDIOS: Predio[] = [
  { x: 0, largura: 150, altura: 250, colunas: 3 },
  { x: 160, largura: 110, altura: 190, colunas: 2 },
  { x: 280, largura: 180, altura: 300, colunas: 4 },
  { x: 470, largura: 120, altura: 210, colunas: 3 },
  { x: 700, largura: 130, altura: 230, colunas: 3 },
  { x: 840, largura: 190, altura: 320, colunas: 4 },
  { x: 1040, largura: 120, altura: 200, colunas: 2 },
  { x: 1170, largura: 150, altura: 270, colunas: 3 },
  { x: 1330, largura: 130, altura: 220, colunas: 3 },
];

/** Gerador simples e determinístico (o céu não pode mudar a cada render). */
function pseudo(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

const ESTRELAS = Array.from({ length: 40 }, (_, i) => ({
  x: Math.round(pseudo(i + 1) * 1440),
  y: Math.round(20 + pseudo(i + 77) * 430),
  r: i % 6 === 0 ? 2.2 : 1.2,
  atraso: Math.round(pseudo(i + 9) * 3600),
}));

const JANELAS = PREDIOS.flatMap((predio, p) => {
  const linhas = Math.floor((predio.altura - 40) / 46);
  return Array.from({ length: linhas * predio.colunas }, (_, i) => {
    const coluna = i % predio.colunas;
    const linha = Math.floor(i / predio.colunas);
    const espaco = (predio.largura - 28) / predio.colunas;
    const semente = p * 100 + i;
    return {
      chave: `${p}-${i}`,
      x: predio.x + 14 + coluna * espaco + (espaco - 16) / 2,
      y: BASE - predio.altura + 22 + linha * 46,
      duracao: 7 + Math.round(pseudo(semente) * 9),
      atraso: Math.round(pseudo(semente + 3) * 9000),
      acesaNoInicio: pseudo(semente + 5) > 0.45,
    };
  });
});

export function CeuNoturno({ className = '' }: { className?: string }) {
  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="1440" height="900" fill="#0D3B44" />
      <g fill="#FFF8EC">
        {ESTRELAS.map((e, i) => (
          <circle
            key={i}
            cx={e.x}
            cy={e.y}
            r={e.r}
            className="estrela"
            style={{ '--atraso': `${e.atraso}ms` } as CSSProperties}
          />
        ))}
      </g>
      <circle cx="1290" cy="140" r="44" fill="#FFE19A" />
      <circle cx="1277" cy="128" r="8" fill="#F3CB74" />
      <circle cx="1303" cy="154" r="5.5" fill="#F3CB74" />

      <g fill="#0A3139">
        {PREDIOS.map((p, i) => (
          <rect key={i} x={p.x} y={BASE - p.altura} width={p.largura} height={p.altura} rx="3" />
        ))}
      </g>
      <g>
        {JANELAS.map((j) => (
          <rect
            key={j.chave}
            x={j.x}
            y={j.y}
            width="16"
            height="24"
            rx="3"
            fill="#FFC24B"
            className="luz-vizinho"
            style={
              {
                '--duracao': `${j.duracao}s`,
                '--atraso': `-${j.atraso}ms`,
                '--base': j.acesaNoInicio ? 0.85 : 0.1,
                '--alto': j.acesaNoInicio ? 0.12 : 0.85,
              } as CSSProperties
            }
          />
        ))}
      </g>
      <rect x="0" y="880" width="1440" height="20" fill="#092A31" />
    </svg>
  );
}
