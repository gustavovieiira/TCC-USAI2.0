import { SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export function Select({ label, error, id, className = '', children, ...props }: SelectProps) {
  const selectId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={selectId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={selectId}
        className={`min-h-[44px] border bg-paper-surface px-3 py-2 text-sm text-ink outline-none
          transition focus-visible:outline-2 focus-visible:outline-offset-2
          ${error ? 'border-carmim-500' : 'border-ink/40 focus:border-ink'} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="text-sm text-carmim-700">{error}</span>}
    </div>
  );
}
