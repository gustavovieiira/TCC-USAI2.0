import { HTMLAttributes } from 'react';

type CardProps = HTMLAttributes<HTMLDivElement>;

/** Sanduíche de papel: moldura fina (paper-line) + folha (paper-surface), ambas com o canto recortado. */
export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div className="notch-lg bg-paper-line p-px">
      <div className={`notch bg-paper-surface p-5 shadow-paper ${className}`} {...props}>
        {children}
      </div>
    </div>
  );
}
