import { ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
}

export function Button({ isLoading, children, disabled, className = '', ...props }: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5
        font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed
        disabled:opacity-60 ${className}`}
      {...props}
    >
      {isLoading ? 'Enviando...' : children}
    </button>
  );
}
