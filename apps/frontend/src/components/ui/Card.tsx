import { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement>;

/** Cartão branco de cantos arredondados, com borda fina e sombra suave. */
export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-[20px] border border-paper-line bg-paper-surface p-5 shadow-paper ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
