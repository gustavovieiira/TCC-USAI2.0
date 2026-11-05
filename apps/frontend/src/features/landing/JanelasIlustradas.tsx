import { ReactNode } from 'react';

/** Moldura de janela com arco, onde cada cena é desenhada (SVG chapado, sem texturas). */
function Moldura({ children, fundo }: { children: ReactNode; fundo: string }) {
  return (
    <svg viewBox="0 0 220 250" className="block h-auto w-full" aria-hidden="true">
      <path d="M10 250V92C10 44 56 12 110 12s100 32 100 80v158z" fill="#0A2D34" />
      <clipPath id={`recorte-${fundo.replace('#', '')}`}>
        <path d="M22 250V94c0-40 40-68 88-68s88 28 88 68v156z" />
      </clipPath>
      <g clipPath={`url(#recorte-${fundo.replace('#', '')})`}>
        <rect width="220" height="250" fill={fundo} />
        {children}
      </g>
      <path
        d="M22 250V94c0-40 40-68 88-68s88 28 88 68v156"
        fill="none"
        stroke="#1B6672"
        strokeWidth="6"
      />
      <rect x="2" y="238" width="216" height="12" rx="3" fill="#1B6672" />
    </svg>
  );
}

/** Itens parados: a prateleira do apartamento, com o abajur piscando. */
export function JanelaItens() {
  return (
    <Moldura fundo="#FFC24B">
      <g className="pisca">
        <circle cx="170" cy="76" r="30" fill="#FFE19A" opacity="0.7" />
      </g>
      <path d="M160 100h20l-5-26h-10z" fill="#FF6B4A" />
      <rect x="168" y="100" width="4" height="40" fill="#0B2A30" />
      <rect x="40" y="148" width="140" height="8" rx="2" fill="#0B2A30" />
      <rect x="40" y="206" width="140" height="8" rx="2" fill="#0B2A30" />
      {/* furadeira */}
      <g fill="none" stroke="#0B2A30" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M48 120h30a7 7 0 0 1 7 7v6H48zM58 133v14h12v-14M85 126h14" />
      </g>
      {/* livros */}
      <rect x="112" y="124" width="14" height="24" rx="2" fill="#FF6B4A" />
      <rect x="128" y="130" width="12" height="18" rx="2" fill="#0B2A30" />
      <rect x="142" y="120" width="14" height="28" rx="2" fill="#2F8F57" />
      {/* escada e barraca na prateleira de baixo */}
      <g fill="none" stroke="#0B2A30" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M54 172 50 204M80 172l4 32M52 182h30M51 192h32" />
        <path d="M110 204 134 168l24 36zM134 168v36" />
      </g>
    </Moldura>
  );
}

/** Serviços: o eletricista de capacete, com faíscas. */
export function JanelaServicos() {
  return (
    <Moldura fundo="#6BC28A">
      <rect x="0" y="196" width="220" height="60" fill="#2F8F57" />
      {/* tomada na parede */}
      <rect x="150" y="120" width="34" height="46" rx="6" fill="#FFF8EC" />
      <circle cx="161" cy="136" r="3" fill="#0B2A30" />
      <circle cx="173" cy="136" r="3" fill="#0B2A30" />
      <rect x="159" y="146" width="16" height="4" rx="2" fill="#0B2A30" />
      <g className="fagulha" fill="none" stroke="#FFC24B" strokeWidth="4" strokeLinecap="round">
        <path d="M150 112l-10-10M168 108l2-14M186 114l10-8" />
      </g>
      {/* o eletricista */}
      <path d="M52 250c0-46 18-70 44-70s44 24 44 70z" fill="#FF6B4A" />
      <circle cx="96" cy="140" r="22" fill="#FFE1C2" />
      <path d="M72 138c0-22 11-32 24-32s24 10 24 32z" fill="#FFC24B" />
      <rect x="66" y="136" width="60" height="7" rx="3" fill="#C98A12" />
      <circle cx="88" cy="150" r="2.5" fill="#0B2A30" />
      <circle cx="104" cy="150" r="2.5" fill="#0B2A30" />
      <path
        d="M90 160q6 5 12 0"
        fill="none"
        stroke="#0B2A30"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M128 196l24-44" stroke="#0B2A30" strokeWidth="6" strokeLinecap="round" />
    </Moldura>
  );
}

/** Vizinhança: dois vizinhos conversando, com balões que aparecem e somem. */
export function JanelaVizinhos() {
  return (
    <Moldura fundo="#FF6B4A">
      <rect x="0" y="204" width="220" height="50" fill="#D94A2B" />
      {/* vizinha da esquerda */}
      <path d="M26 250c0-40 14-62 36-62s36 22 36 62z" fill="#0B2A30" />
      <circle cx="62" cy="152" r="20" fill="#FFE1C2" />
      <path d="M42 150c0-20 9-30 20-30s22 10 20 30c-6-10-14-14-20-14s-14 4-20 14z" fill="#0B2A30" />
      {/* vizinho da direita */}
      <path d="M122 250c0-40 14-62 36-62s36 22 36 62z" fill="#FFC24B" />
      <circle cx="158" cy="152" r="20" fill="#C98A5B" />
      <path d="M138 146c0-18 9-26 20-26s20 8 20 26z" fill="#0B2A30" />
      {/* balões */}
      <g className="balao-a" style={{ transformOrigin: '62px 108px' }}>
        <rect x="22" y="58" width="92" height="38" rx="14" fill="#FFF8EC" />
        <path d="M54 94l8 14 6-14z" fill="#FFF8EC" />
        <text
          x="68"
          y="83"
          textAnchor="middle"
          fontFamily="Caveat, cursive"
          fontWeight="700"
          fontSize="21"
          fill="#0B2A30"
        >
          Bom dia!
        </text>
      </g>
      <g className="balao-b" style={{ transformOrigin: '158px 108px' }}>
        <rect x="104" y="40" width="104" height="38" rx="14" fill="#FFE19A" />
        <path d="M150 76l8 14 6-14z" fill="#FFE19A" />
        <text
          x="156"
          y="65"
          textAnchor="middle"
          fontFamily="Caveat, cursive"
          fontWeight="700"
          fontSize="21"
          fill="#0B2A30"
        >
          Tem furadeira?
        </text>
      </g>
    </Moldura>
  );
}
