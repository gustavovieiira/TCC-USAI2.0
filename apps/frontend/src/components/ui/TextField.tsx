import { InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function TextField({ label, error, id, className = '', ...props }: TextFieldProps) {
  const inputId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-semibold text-fachada-tinta">
        {label}
      </label>
      <input
        id={inputId}
        className={`min-h-[48px] rounded-[12px] border-2 bg-white px-3.5 py-2 text-fachada-tinta outline-none
          transition placeholder:text-fachada-tinta-suave/60 focus-visible:outline-2 focus-visible:outline-offset-2
          focus-visible:outline-fachada-luz ${
            error
              ? 'border-fachada-coral-texto'
              : 'border-fachada-tinta/25 focus:border-fachada-coral-texto'
          } ${className}`}
        {...props}
      />
      {error && <span className="text-sm font-medium text-fachada-coral-texto">{error}</span>}
    </div>
  );
}
