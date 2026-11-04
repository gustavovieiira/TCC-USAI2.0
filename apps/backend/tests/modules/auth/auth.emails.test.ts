import { emailRedefinicaoSenha } from '@/modules/auth/auth.emails';
import { LOGO_CID } from '@/modules/assinaturas/assinaturas.emails';

const base = {
  para: 'silvia@exemplo.com',
  nome: 'Sílvia Souza',
  link: 'https://usai.exemplo.com/redefinir-senha?token=abc123',
  validadeMinutos: 60,
};

describe('emailRedefinicaoSenha', () => {
  it('leva o link, o prazo de 1 hora e o aviso "não foi você?" em HTML e em texto', () => {
    const email = emailRedefinicaoSenha(base);

    expect(email.para).toBe('silvia@exemplo.com');
    expect(email.assunto).toBe('Crie uma nova senha na USAI');
    expect(email.html).toContain(`href="${base.link}"`);
    expect(email.html).toContain('Criar nova senha');
    expect(email.html).toContain('1 hora');
    expect(email.html).toContain('Não foi você?');
    expect(email.texto).toContain(base.link);
    expect(email.texto).toContain('1 hora');
    expect(email.texto).toContain('Não foi você?');
  });

  it('explica que o login é pela página Entrar, com o e-mail e a senha nova', () => {
    const { html, texto } = emailRedefinicaoSenha(base);

    expect(html).toContain('<strong>Entrar</strong>');
    expect(texto).toContain('"Entrar"');
  });

  it('mostra o prazo em minutos quando não for hora cheia, e em horas quando passar de uma', () => {
    expect(emailRedefinicaoSenha({ ...base, validadeMinutos: 45 }).texto).toContain('45 minutos');
    expect(emailRedefinicaoSenha({ ...base, validadeMinutos: 120 }).texto).toContain('2 horas');
  });

  it('traz a logo anexada (cid) e os contatos de suporte', () => {
    const { html, texto, anexos } = emailRedefinicaoSenha(base);

    expect(html).toContain(`cid:${LOGO_CID}`);
    expect(anexos?.[0]).toMatchObject({ cid: LOGO_CID, tipo: 'image/png' });
    expect(html).toContain('https://wa.me/5547999252028');
    expect(texto).toContain('usaisuporte@gmail.com');
  });

  it('escapa HTML no nome (ninguém injeta código no e-mail)', () => {
    const { html } = emailRedefinicaoSenha({ ...base, nome: '<script>alert(1)</script>' });

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });
});
