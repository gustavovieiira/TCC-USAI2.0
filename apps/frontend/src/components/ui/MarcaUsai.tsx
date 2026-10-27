interface MarcaUsaiProps {
  /** Lado do símbolo em px. */
  tamanho?: number;
  className?: string;
}

/**
 * Símbolo da USAI: uma casa (o condomínio) com um "U" por baixo (USAI) que acolhe um item (o ponto
 * verde) — vizinhos compartilhando. O quadrado com o canto recortado é a assinatura visual do
 * sistema. As cores são fixas (terracota, papel e verde-jade) pra funcionar igual no cabeçalho
 * escuro, na tela clara e na impressão.
 */
export function MarcaUsai({ tamanho = 32, className = '' }: MarcaUsaiProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={tamanho}
      height={tamanho}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M0 0H64V46L46 64H0Z" fill="#B4502F" />
      <path
        d="M12 31 32 13 52 31"
        fill="none"
        stroke="#FFFCF7"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 33V42A11 11 0 0 0 43 42V33"
        fill="none"
        stroke="#FFFCF7"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="40" r="4.2" fill="#5FBFA2" />
    </svg>
  );
}
