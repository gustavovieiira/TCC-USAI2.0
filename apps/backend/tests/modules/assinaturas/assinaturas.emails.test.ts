import {
  assuntoDoAcesso,
  emailAcessoSindico,
  LOGO_CID,
} from '@/modules/assinaturas/assinaturas.emails';

const base = {
  para: 'silvia@exemplo.com',
  nomeSindico: 'Sílvia Souza',
  nomeCondominio: 'Residencial Aurora',
  link: 'https://usai.exemplo.com/definir-senha?token=abc123',
};

const ativaAte = new Date('2027-11-03T12:00:00Z');

const detalhes = {
  plano: 'Condomínio',
  periodo: 'Anual',
  valor: 2870,
  ativaAte,
  recibo: {
    numero: 'USAI-3F9A12BC',
    pagoEm: new Date('2026-11-03T20:42:00Z'),
    forma: 'PIX',
    pagador: 'Sílvia Souza',
    documento: '***.982.247-**',
    vigenciaInicio: new Date('2026-11-03T12:00:00Z'),
    comprovanteUrl: 'https://sandbox.asaas.com/i/comprovante',
  },
};

describe('emailAcessoSindico', () => {
  it('é um HTML completo, em português, com a marca, o botão e o link de acesso', () => {
    const { html, assunto, para } = emailAcessoSindico({ ...base, detalhes });

    expect(para).toBe('silvia@exemplo.com');
    // assunto específico (com o nome do condomínio), que se parece menos com e-mail em massa
    expect(assunto).toBe('Residencial Aurora está ativo na USAI');
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).toContain('<html lang="pt-BR">');
    expect(html).toContain('>USAI<');
    expect(html).toContain('vizinhos que compartilham');
    expect(html).toContain('Seu condomínio está ativo!');
    expect(html).toContain('Olá, Sílvia Souza!');
    // botão e endereço por extenso (para quando o botão não funciona)
    expect(html).toContain(`href="${base.link}"`);
    expect(html).toContain('Criar minha senha e entrar');
    // o link não tem prazo: vale até o síndico criar a senha
    expect(html).toContain('funciona até você criar a sua senha');
    expect(html).not.toMatch(/horas/);
  });

  it('mostra o recibo de pagamento completo quando o pagamento foi recebido', () => {
    const { html } = emailAcessoSindico({ ...base, detalhes });

    expect(html).toContain('Recibo de pagamento');
    expect(html).toContain('nº USAI-3F9A12BC');
    expect(html).toContain('Forma de pagamento');
    expect(html).toContain('PIX');
    expect(html).toContain('***.982.247-**');
    expect(html).toContain('Plano Condomínio');
    expect(html).toMatch(/R\$\s2\.870,00/);
    expect(html).toContain('03/11/2026');
    expect(html).toContain('03/11/2027');
    expect(html).toContain('href="https://sandbox.asaas.com/i/comprovante"');
    expect(html).toContain('somente depois que o PIX foi recebido');
  });

  it('a versão em texto simples também traz o recibo e os próximos passos', () => {
    const { texto } = emailAcessoSindico({ ...base, detalhes });

    expect(texto).toContain('PAGAMENTO CONFIRMADO');
    expect(texto).toContain(base.link);
    expect(texto).toContain('RECIBO DE PAGAMENTO nº USAI-3F9A12BC');
    expect(texto).toContain('Forma de pagamento: PIX');
    expect(texto).toContain('Pagador: Sílvia Souza (***.982.247-**)');
    expect(texto).toContain('Vigência: 03/11/2026 a 03/11/2027');
    expect(texto).toContain('PRÓXIMOS PASSOS');
    expect(texto).toContain('1. Crie a sua senha');
    expect(texto).toContain('2. Pegue o convite dos moradores');
    expect(texto).toContain('3. Comece a compartilhar');
    expect(texto).toContain('10% ficam com o condomínio');
    expect(texto).toContain('somente depois que o PIX foi recebido');
  });

  it('sem o recibo mostra só o resumo da contratação', () => {
    const { html, texto } = emailAcessoSindico({
      ...base,
      detalhes: { plano: 'Essencial', periodo: 'Mensal', valor: 149, ativaAte },
    });

    expect(html).toContain('Resumo da contratação');
    expect(html).not.toContain('Recibo de pagamento');
    expect(texto).toContain('RESUMO DA CONTRATAÇÃO');
    expect(texto).not.toContain('RECIBO DE PAGAMENTO');
  });

  it('sem nenhum detalhe o e-mail continua válido, só com o acesso e os próximos passos', () => {
    const { html, texto } = emailAcessoSindico(base);

    expect(html).not.toContain('Recibo de pagamento');
    expect(html).not.toContain('Resumo da contratação');
    expect(html).toContain('Próximos passos');
    expect(texto).toContain(base.link);
    expect(texto).not.toContain('RECIBO');
  });

  it('a logo vai anexada ao e-mail (cid), porque e-mail não aceita SVG nem imagem em localhost', () => {
    const { html, anexos } = emailAcessoSindico({ ...base, detalhes });

    expect(html).toContain(`src="cid:${LOGO_CID}"`);
    expect(anexos).toHaveLength(1);
    expect(anexos?.[0]).toMatchObject({
      cid: LOGO_CID,
      tipo: 'image/png',
      nomeArquivo: 'usai.png',
    });
    // é um PNG de verdade (assinatura dos primeiros bytes)
    expect(anexos?.[0].conteudo.subarray(0, 4)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
    expect(anexos?.[0].conteudo.length).toBeGreaterThan(500);
  });

  it('escapa HTML nos nomes (síndico e condomínio não injetam código no e-mail)', () => {
    const { html, texto } = emailAcessoSindico({
      ...base,
      nomeSindico: '<script>alert(1)</script>',
      nomeCondominio: 'Edifício "Sol" & <b>Lua</b>',
      detalhes: {
        ...detalhes,
        recibo: { ...detalhes.recibo, pagador: '<img src=x onerror=alert(1)>' },
      },
    });

    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<b>Lua</b>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('Edifício &quot;Sol&quot; &amp; &lt;b&gt;Lua&lt;/b&gt;');
    // o texto simples não precisa de escape
    expect(texto).toContain('Edifício "Sol" & <b>Lua</b>');
  });

  it('usa as cores da identidade da USAI (terracota, tinta e papel) em tabelas, sem CSS externo', () => {
    const { html } = emailAcessoSindico({ ...base, detalhes });

    expect(html).toContain('#B4502F');
    expect(html).toContain('#241D18');
    expect(html).toContain('#F2EAE0');
    expect(html).not.toMatch(/<link[^>]+stylesheet/i);
    expect(html).not.toMatch(/<style[\s>]/i);
    expect(html).toContain('role="presentation"');
  });
});

describe('assuntoDoAcesso', () => {
  it('usa o nome do condomínio, sem espaços sobrando', () => {
    expect(assuntoDoAcesso('Residencial Aurora')).toBe('Residencial Aurora está ativo na USAI');
    expect(assuntoDoAcesso('  Edifício Sol  ')).toBe('Edifício Sol está ativo na USAI');
  });

  it('tira quebras de linha do nome, para ninguém injetar cabeçalhos no e-mail', () => {
    const assunto = assuntoDoAcesso('Aurora\r\nBcc: alguem@exemplo.com');

    expect(assunto).not.toMatch(/[\r\n]/);
    expect(assunto).toBe('Aurora Bcc: alguem@exemplo.com está ativo na USAI');
  });

  it('limita o tamanho e tem um texto de reserva quando o nome fica vazio', () => {
    expect(assuntoDoAcesso('A'.repeat(200))).toBe(`${'A'.repeat(60)} está ativo na USAI`);
    expect(assuntoDoAcesso('   ')).toBe('Seu condomínio está ativo na USAI');
  });
});

describe('dica para quem encontra o e-mail no spam', () => {
  it('o HTML e o texto orientam a marcar como "não é spam"', () => {
    const { html, texto } = emailAcessoSindico(base);

    expect(html).toContain('caiu no spam');
    expect(html).toContain('não é spam');
    expect(texto).toContain('caiu no spam');
    expect(texto).toContain('não é spam');
  });
});

describe('explicação do login no e-mail', () => {
  it('diz que o login é o e-mail do síndico mais a senha que ele criar, e leva à página Entrar', () => {
    const { html, texto } = emailAcessoSindico(base);

    expect(html).toContain('Como você entra daqui pra frente');
    expect(html).toContain('Seu login');
    expect(html).toContain('silvia@exemplo.com');
    expect(html).toContain('a que você criar no botão acima');
    expect(html).toContain('Entrar na USAI');
    expect(html).toContain('/login"');
    expect(html).toContain('sempre entra pelo botão');

    expect(texto).toContain('COMO VOCÊ ENTRA DAQUI PRA FRENTE');
    expect(texto).toContain('Login: silvia@exemplo.com');
    expect(texto).toContain('Senha: a que você criar no link acima');
    expect(texto).toMatch(/Onde entrar: .*\/login/);
  });

  it('nenhuma parte do e-mail (HTML ou texto) fala em prazo de horas para o link', () => {
    const { html, texto } = emailAcessoSindico({ ...base, detalhes });

    expect(html).not.toMatch(/\d+ horas/);
    expect(texto).not.toMatch(/\d+ horas/);
    expect(texto).toContain('O link funciona até você criar a sua senha');
    expect(texto).toContain('sem prazo');
  });
});
