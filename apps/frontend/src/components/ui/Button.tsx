import { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: ButtonVariant;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'notch bg-barro-500 text-paper-surface shadow-press hover:bg-barro-700 disabled:shadow-none',
  secondary: 'bg-paper-surface text-ink border-[1.5px] border-ink hover:bg-paper',
  danger: 'bg-paper-surface text-carmim-700 border border-carmim-500 hover:bg-carmim-100',
  ghost: 'bg-transparent text-ink-soft hover:bg-paper-line/50',
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
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2.5 text-sm
        font-semibold font-sans transition disabled:cursor-not-allowed disabled:bg-paper-line
        disabled:text-ink-faint ${fullWidth ? 'w-full' : ''} ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {isLoading ? 'Enviando...' : children}
    </button>
  );
}
