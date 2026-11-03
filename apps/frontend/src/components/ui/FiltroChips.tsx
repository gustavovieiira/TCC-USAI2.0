interface Opcao<T extends string> {
  valor: T;
  rotulo: string;
  /** Quantidade mostrada ao lado do rótulo (opcional). */
  total?: number;
}

interface FiltroChipsProps<T extends string> {
  rotulo: string;
  opcoes: Opcao<T>[];
  valor: T;
  onChange: (valor: T) => void;
}

/** Filtro por botões em linha (rola na horizontal no celular, sem quebrar o layout). */
export function FiltroChips<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
}: FiltroChipsProps<T>) {
  return (
    <div
      role="group"
      aria-label={rotulo}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0"
    >
      {opcoes.map((opcao) => {
        const ativo = opcao.valor === valor;
        return (
          <button
            key={opcao.valor}
            type="button"
            aria-pressed={ativo}
            onClick={() => onChange(opcao.valor)}
            className={`notch-sm shrink-0 px-3.5 py-1.5 text-sm font-semibold transition ${
              ativo
                ? 'bg-ink text-ink-inverse'
                : 'border border-paper-line bg-paper-surface text-ink-soft hover:bg-paper'
            }`}
          >
            {opcao.rotulo}
            {opcao.total !== undefined && (
              <span
                className={`ml-1.5 font-meta text-xs ${ativo ? 'opacity-80' : 'text-ink-faint'}`}
              >
                {opcao.total}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
