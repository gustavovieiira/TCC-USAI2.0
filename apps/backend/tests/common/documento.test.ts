import { cnpjValido, cpfOuCnpjValido, cpfValido, normalizarDocumento } from '@/common/documento';

describe('documento (CPF/CNPJ)', () => {
  it('normaliza removendo a pontuação', () => {
    expect(normalizarDocumento('529.982.247-25')).toBe('52998224725');
    expect(normalizarDocumento('11.222.333/0001-81')).toBe('11222333000181');
  });

  it('valida CPF pelos dígitos verificadores', () => {
    expect(cpfValido('529.982.247-25')).toBe(true);
    expect(cpfValido('52998224725')).toBe(true);
    expect(cpfValido('52998224726')).toBe(false);
    expect(cpfValido('111.111.111-11')).toBe(false);
    expect(cpfValido('123')).toBe(false);
  });

  it('valida CNPJ pelos dígitos verificadores', () => {
    expect(cnpjValido('11.222.333/0001-81')).toBe(true);
    expect(cnpjValido('11222333000182')).toBe(false);
    expect(cnpjValido('00000000000000')).toBe(false);
  });

  it('escolhe CPF ou CNPJ pelo tamanho', () => {
    expect(cpfOuCnpjValido('52998224725')).toBe(true);
    expect(cpfOuCnpjValido('11222333000181')).toBe(true);
    expect(cpfOuCnpjValido('12345')).toBe(false);
  });
});
