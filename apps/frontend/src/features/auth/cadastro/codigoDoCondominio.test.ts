import { describe, expect, it } from 'vitest';
import { extrairCodigoDoCondominio } from './codigoDoCondominio';

describe('extrairCodigoDoCondominio', () => {
  it('aceita o código puro, com espaços e maiúsculas', () => {
    expect(extrairCodigoDoCondominio('residencial-aurora')).toBe('residencial-aurora');
    expect(extrairCodigoDoCondominio('  Residencial-Aurora  ')).toBe('residencial-aurora');
  });

  it('extrai o código do link completo gerado no painel do síndico', () => {
    expect(
      extrairCodigoDoCondominio('https://usainet.com.br/cadastro?condominio=residencial-exemplo'),
    ).toBe('residencial-exemplo');
    expect(
      extrairCodigoDoCondominio('usainet.com.br/cadastro?condominio=residencial-exemplo'),
    ).toBe('residencial-exemplo');
  });

  it('recusa link sem o parâmetro, texto solto e códigos fora do formato', () => {
    expect(extrairCodigoDoCondominio('https://usainet.com.br/cadastro')).toBeNull();
    expect(extrairCodigoDoCondominio('meu condomínio')).toBeNull();
    expect(extrairCodigoDoCondominio('-aurora')).toBeNull();
    expect(extrairCodigoDoCondominio('   ')).toBeNull();
    expect(extrairCodigoDoCondominio('https://')).toBeNull();
  });
});
