interface MarcaUsaiProps {
  /** Lado do símbolo em px. */
  tamanho?: number;
  className?: string;
}

/**
 * Símbolo da USAI: uma casa (o condomínio) com um "U" por baixo (USAI) que acolhe uma janela acesa (o item):
 * vizinhos compartilhando. O quadrado arredondado coral é a marca; as cores são fixas (coral, tinta e açafrão)
 * para funcionar igual no cabeçalho escuro, na tela clara e na impressão.
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
      <rect width="64" height="64" rx="17" fill="#FF6B4A" />
      <path
        d="M13 31 32 14 51 31"
        fill="none"
        stroke="#0B2A30"
        strokeWidth="5.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 33V42A11 11 0 0 0 43 42V33"
        fill="none"
        stroke="#0B2A30"
        strokeWidth="5.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="40" r="4.6" fill="#FFC24B" />
    </svg>
  );
}
