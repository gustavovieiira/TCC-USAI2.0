const CORES = [
  'bg-fachada-coral text-fachada-tinta',
  'bg-fachada-luz text-fachada-tinta',
  'bg-fachada-folha text-fachada-tinta',
  'bg-fachada-predio-claro text-fachada-papel',
];

function corPorNome(nome: string): string {
  const hash = Array.from(nome).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CORES[hash % CORES.length];
}

const SIZE_CLASSES = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-14 w-14 text-xl',
};

/** Avatar redondo com a inicial do nome, numa das cores da fachada (a mesma pessoa tem sempre a mesma cor). */
export function Avatar({ nome, size = 'md' }: { nome: string; size?: keyof typeof SIZE_CLASSES }) {
  const inicial = nome.trim().charAt(0).toUpperCase() || '?';

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-marca font-extrabold
        ${SIZE_CLASSES[size]} ${corPorNome(nome)}`}
    >
      {inicial}
    </div>
  );
}
