import { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700',
  secondary: 'bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50',
  danger: 'bg-white text-red-600 ring-1 ring-inset ring-red-200 hover:bg-red-50',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
};

export function Button({
  isLoading,
  variant = 'primary',
  fullWidth = true,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm
        font-semibold transition disabled:cursor-not-allowed disabled:opacity-60
        ${fullWidth ? 'w-full' : ''} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {isLoading ? 'Enviando...' : children}
    </button>
  );
}
