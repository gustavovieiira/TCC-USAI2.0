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

/** Avatar de papel: quadrado recortado com iniciais em tinta — nunca círculo genérico. */
export function Avatar({ nome }: { nome: string }) {
  const inicial = nome.trim().charAt(0).toUpperCase() || '?';

  return (
    <div
      className={`notch-sm flex h-10 w-10 shrink-0 items-center justify-center font-display
        text-base font-semibold ${papelPorNome(nome)}`}
    >
      {inicial}
    </div>
  );
}
