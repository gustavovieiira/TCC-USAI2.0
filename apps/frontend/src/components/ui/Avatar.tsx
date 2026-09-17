const PAPEIS = [
  'bg-barro-100 text-barro-700',
  'bg-jade-100 text-jade-700',
  'bg-mostarda-100 text-mostarda-700',
  'bg-roxo-100 text-roxo-500',
];

function papelPorNome(nome: string): string {
  const hash = Array.from(nome).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return PAPEIS[hash % PAPEIS.length];
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-14 w-14 text-xl',
};

/** Avatar de papel: quadrado recortado com iniciais em tinta — nunca círculo genérico. */
export function Avatar({ nome, size = 'md' }: { nome: string; size?: keyof typeof SIZE_CLASSES }) {
  const inicial = nome.trim().charAt(0).toUpperCase() || '?';

  return (
    <div
      className={`notch-sm flex shrink-0 items-center justify-center font-display font-semibold
        ${SIZE_CLASSES[size]} ${papelPorNome(nome)}`}
    >
      {inicial}
    </div>
  );
}
