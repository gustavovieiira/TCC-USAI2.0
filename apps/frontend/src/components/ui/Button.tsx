import { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-fachada-coral text-fachada-tinta shadow-[0_12px_22px_-10px_rgb(217_74_43/0.7)] hover:-translate-y-0.5 hover:bg-[#ff7a5c]',
  secondary:
    'border-2 border-fachada-tinta bg-transparent text-fachada-tinta hover:bg-fachada-tinta/10',
  danger:
    'border-2 border-fachada-coral-texto bg-white text-fachada-coral-texto hover:bg-[#ffe9e4]',
  ghost: 'bg-transparent text-fachada-tinta-suave hover:bg-fachada-tinta/10',
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
      className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] px-5 py-2.5
        font-marca text-[1rem] font-bold tracking-[-0.005em] transition duration-200
        active:translate-y-px active:scale-[0.99] disabled:cursor-not-allowed disabled:translate-y-0
        disabled:bg-fachada-tinta/15 disabled:text-fachada-tinta/55 disabled:shadow-none
        ${fullWidth ? 'w-full' : ''} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {isLoading ? 'Enviando...' : children}
    </button>
  );
}
