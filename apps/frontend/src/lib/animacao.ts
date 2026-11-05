import { CSSProperties } from 'react';

/** Atraso escalonado para listas que entram subindo (o 9º item em diante entra junto, sem esperar mais). */
export function escalonar(indice: number, passoMs = 70): CSSProperties {
  return { '--atraso': `${Math.min(indice, 8) * passoMs}ms` } as CSSProperties;
}
