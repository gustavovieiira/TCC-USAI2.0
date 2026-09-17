import { InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function TextField({ label, error, id, className = '', ...props }: TextFieldProps) {
  const inputId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={inputId}
        className={`min-h-[44px] border bg-paper-surface px-3 py-2 text-ink outline-none
          transition focus-visible:outline-2 focus-visible:outline-offset-2
          ${error ? 'border-carmim-500' : 'border-ink/40 focus:border-ink'} ${className}`}
        {...props}
      />
      {error && <span className="text-sm text-carmim-700">{error}</span>}
    </div>
  );
}
