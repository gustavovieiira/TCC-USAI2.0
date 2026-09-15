import { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl bg-white p-5 shadow-soft ring-1 ring-slate-100 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
