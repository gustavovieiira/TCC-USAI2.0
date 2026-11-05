/** Mantém só os dígitos, aceita CPF/CNPJ com ou sem pontuação (o Asaas exige só números). */
export function normalizarDocumento(valor: string): string {
  return valor.replace(/\D/g, '');
}

const PESOS_CPF_1 = [10, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CPF_2 = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CNPJ_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_CNPJ_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function digitoVerificador(digitos: string, pesos: number[]): number {
  const soma = pesos.reduce((total, peso, i) => total + Number(digitos[i]) * peso, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

function todosIguais(digitos: string): boolean {
  return /^(\d)\1+$/.test(digitos);
}

/** CPF válido: 11 dígitos, não repetidos, com os dois dígitos verificadores corretos. */
export function cpfValido(cpf: string): boolean {
  const digitos = normalizarDocumento(cpf);
  if (digitos.length !== 11 || todosIguais(digitos)) return false;

  return (
    digitoVerificador(digitos, PESOS_CPF_1) === Number(digitos[9]) &&
    digitoVerificador(digitos, PESOS_CPF_2) === Number(digitos[10])
  );
}

/** CNPJ válido: 14 dígitos, não repetidos, com os dois dígitos verificadores corretos. */
export function cnpjValido(cnpj: string): boolean {
  const digitos = normalizarDocumento(cnpj);
  if (digitos.length !== 14 || todosIguais(digitos)) return false;

  return (
    digitoVerificador(digitos, PESOS_CNPJ_1) === Number(digitos[12]) &&
    digitoVerificador(digitos, PESOS_CNPJ_2) === Number(digitos[13])
  );
}

export function cpfOuCnpjValido(valor: string): boolean {
  const digitos = normalizarDocumento(valor);
  return digitos.length === 11 ? cpfValido(digitos) : cnpjValido(digitos);
}
