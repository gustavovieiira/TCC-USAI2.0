import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  ConfiguracaoService,
  NOME_INSTITUCIONAL_PADRAO,
  RODAPE_INSTITUCIONAL_PADRAO,
} from '@/modules/configuracao/configuracao.service';

function buildPrismaMock() {
  return {
    configuracao: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    logAuditoria: { create: jest.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe('ConfiguracaoService.obter', () => {
  it('sem nada configurado, devolve os padrões e nenhuma logo (o sistema usa a marca embutida)', async () => {
    const config = await new ConfiguracaoService(buildPrismaMock()).obter();

    expect(config).toEqual({
      logoUrl: null,
      nomeInstitucional: NOME_INSTITUCIONAL_PADRAO,
      rodapeInstitucional: RODAPE_INSTITUCIONAL_PADRAO,
    });
  });

  it('o que o Admin configurou vale; o que não configurou segue o padrão', async () => {
    const prisma = buildPrismaMock();
    prisma.configuracao.findMany.mockResolvedValue([
      { chave: 'logo_url', valor: 'http://x/uploads/marca/logo.png' },
      { chave: 'nome_institucional', valor: 'Condomínio Aurora' },
    ]);

    const config = await new ConfiguracaoService(prisma).obter();

    expect(config).toEqual({
      logoUrl: 'http://x/uploads/marca/logo.png',
      nomeInstitucional: 'Condomínio Aurora',
      rodapeInstitucional: RODAPE_INSTITUCIONAL_PADRAO,
    });
  });
});

describe('ConfiguracaoService — logo e textos', () => {
  it('definir a logo grava, audita e devolve a configuração', async () => {
    const prisma = buildPrismaMock();

    await new ConfiguracaoService(prisma).definirLogo('http://x/uploads/marca/nova.png', 'admin-1');

    expect(prisma.configuracao.upsert).toHaveBeenCalledWith({
      where: { chave: 'logo_url' },
      update: { valor: 'http://x/uploads/marca/nova.png', atualizadoPorId: 'admin-1' },
      create: {
        chave: 'logo_url',
        valor: 'http://x/uploads/marca/nova.png',
        atualizadoPorId: 'admin-1',
      },
    });
    expect(prisma.logAuditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ adminId: 'admin-1', acao: 'ATUALIZAR_LOGO' }),
    });
  });

  it('trocar a logo apaga o arquivo antigo — só dentro da pasta da logo', async () => {
    const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'usai-logo-'));
    const antigo = path.join(pasta, 'logo-antiga.png');
    const intocavel = path.join(os.tmpdir(), `usai-fora-${Date.now()}.txt`);
    fs.writeFileSync(antigo, 'x');
    fs.writeFileSync(intocavel, 'x');
    const prisma = buildPrismaMock();
    prisma.configuracao.findUnique.mockResolvedValue({
      chave: 'logo_url',
      valor: 'http://localhost/uploads/marca/logo-antiga.png',
    });

    await new ConfiguracaoService(prisma, pasta).definirLogo(
      'http://localhost/uploads/marca/logo-nova.png',
      'admin-1',
    );
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(fs.existsSync(antigo)).toBe(false);

    // um valor malicioso no banco (caminho com ../) não consegue apagar nada fora da pasta
    prisma.configuracao.findUnique.mockResolvedValue({
      chave: 'logo_url',
      valor: `http://localhost/uploads/marca/..%2F..%2F${path.basename(intocavel)}`,
    });
    await new ConfiguracaoService(prisma, pasta).definirLogo(
      'http://localhost/uploads/marca/outra.png',
      'admin-1',
    );
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(fs.existsSync(intocavel)).toBe(true);

    fs.rmSync(pasta, { recursive: true, force: true });
    fs.rmSync(intocavel, { force: true });
  });

  it('remover a logo volta à marca padrão e audita; sem logo, não faz nada', async () => {
    const prisma = buildPrismaMock();
    const service = new ConfiguracaoService(prisma);

    await service.removerLogo('admin-1');
    expect(prisma.configuracao.delete).not.toHaveBeenCalled();

    prisma.configuracao.findUnique.mockResolvedValue({
      chave: 'logo_url',
      valor: 'http://x/l.png',
    });
    await service.removerLogo('admin-1');
    expect(prisma.configuracao.delete).toHaveBeenCalledWith({ where: { chave: 'logo_url' } });
    expect(prisma.logAuditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ acao: 'REMOVER_LOGO' }),
    });
  });

  it('atualizar os textos institucionais grava nome e rodapé e audita', async () => {
    const prisma = buildPrismaMock();

    await new ConfiguracaoService(prisma).atualizarTextos(
      { nomeInstitucional: 'Condomínio Aurora', rodapeInstitucional: 'Rodapé da empresa' },
      'admin-1',
    );

    expect(prisma.configuracao.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.configuracao.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { chave: 'nome_institucional' } }),
    );
    expect(prisma.configuracao.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { chave: 'rodape_institucional' } }),
    );
    expect(prisma.logAuditoria.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ acao: 'ATUALIZAR_TEXTOS_INSTITUCIONAIS' }),
    });
  });
});
