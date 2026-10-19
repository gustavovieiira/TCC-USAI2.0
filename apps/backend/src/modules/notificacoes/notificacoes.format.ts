/** "R$ 90,00" — sem Intl pra não depender do ICU do Node nem de espaços não-quebráveis no texto. */
export function formatarReais(valor: number): string {
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}
