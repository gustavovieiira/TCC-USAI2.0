import bcrypt from 'bcryptjs';
import { PrivacidadeService } from '@/modules/privacidade/privacidade.service';

const SENHA = 'senha-forte-123';
const senhaHash = bcrypt.hashSync(SENHA, 4);

function buildPrisma(overrides: { usuario?: Record<string, unknown> | null } = {}) {
  const usuario =
    overrides.usuario === undefined
      ? {
          id: 'u1',
          nome: 'Ana Paula',
          email: 'ana@example.com',
          cpf: '12345678901',
          apartamento: '201',
          chavePix: 'ana@pix.com',
          papel: 'MORADOR',
          ativo: true,
          senhaHash,
          createdAt: new Date('2026-09-01T00:00:00Z'),
          aceitouTermosEm: new Date('2026-09-01T00:00:00Z'),
          versaoTermos: '2026-11-05',
          condominio: { nome: 'Residencial Teste' },
        }
      : overrides.usuario;

  const tx: any = {
    user: { update: jest.fn() },
    tokenAcesso: { deleteMany: jest.fn() },
    notificacao: { deleteMany: jest.fn() },
    item: { updateMany: jest.fn() },
    comentarioPost: { deleteMany: jest.fn() },
    post: { deleteMany: jest.fn() },
    conversaPrivada: { deleteMany: jest.fn() },
    mensagemPrivada: { updateMany: jest.fn() },
    solicitacaoSaque: { updateMany: jest.fn() },
  };

  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue(usuario) },
    item: { findMany: jest.fn().mockResolvedValue([{ id: 'i1', titulo: 'Furadeira' }]) },
    locacao: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
    post: { findMany: jest.fn().mockResolvedValue([]) },
    comentarioPost: { findMany: jest.fn().mockResolvedValue([]) },
    mensagemPrivada: { findMany: jest.fn().mockResolvedValue([]) },
    solicitacaoSaque: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({ _sum: { valor: null } }),
    },
    lancamento: {
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { valor: null } }),
    },
    notificacao: { findMany: jest.fn().mockResolvedValue([]) },
    aceiteTermo: { findMany: jest.fn().mockResolvedValue([]) },
    assinatura: { findFirst: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn((fn: (t: unknown) => unknown) => fn(tx)),
  };
  return { prisma, tx };
}

describe('PrivacidadeService.exportarDados', () => {
  it('reúne o perfil e tudo o que a pessoa tem na plataforma, sem a senha', async () => {
    const { prisma } = buildPrisma();

    const dados = await new PrivacidadeService(prisma).exportarDados('u1');

    expect(dados.titular).toMatchObject({
      nome: 'Ana Paula',
      email: 'ana@example.com',
      cpf: '12345678901',
      condominio: 'Residencial Teste',
      versaoTermos: '2026-11-05',
    });
    expect(JSON.stringify(dados)).not.toContain('senhaHash');
    expect(dados.itens).toHaveLength(1);
    expect(dados.observacao).toMatch(/LGPD/);
    // só busca o que é da própria pessoa
    expect(prisma.item.findMany.mock.calls[0][0].where).toEqual({ ownerId: 'u1' });
    expect(prisma.mensagemPrivada.findMany.mock.calls[0][0].where).toEqual({ remetenteId: 'u1' });
  });

  it('conta que não existe devolve 404', async () => {
    const { prisma } = buildPrisma({ usuario: null });

    await expect(new PrivacidadeService(prisma).exportarDados('x')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('PrivacidadeService.excluirConta', () => {
  it('anonimiza a conta, apaga o que identifica e derruba as sessões', async () => {
    const { prisma, tx } = buildPrisma();

    await new PrivacidadeService(prisma).excluirConta('u1', SENHA);

    const { data } = tx.user.update.mock.calls[0][0];
    expect(data).toMatchObject({
      nome: 'Usuário removido',
      cpf: null,
      chavePix: null,
      apartamento: null,
      ativo: false,
      tokenVersion: { increment: 1 },
    });
    expect(data.email).toBe('removido-u1@excluido.usai.invalid');
    expect(data.senhaHash).not.toBe(senhaHash);
    expect(tx.tokenAcesso.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(tx.notificacao.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(tx.item.updateMany).toHaveBeenCalledWith({
      where: { ownerId: 'u1' },
      data: { ativo: false },
    });
    expect(tx.post.deleteMany).toHaveBeenCalledWith({ where: { autorId: 'u1' } });
    expect(tx.solicitacaoSaque.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { chavePixUsada: '[removida]' },
    });
    // O que a lei manda guardar (locações, lançamentos, documentos) não é tocado.
    expect(tx).not.toHaveProperty('locacao');
    expect(tx).not.toHaveProperty('lancamento');
  });

  it('recusa com a senha errada e não altera nada', async () => {
    const { prisma, tx } = buildPrisma();

    await expect(
      new PrivacidadeService(prisma).excluirConta('u1', 'errada-123'),
    ).rejects.toMatchObject({
      statusCode: 401,
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('administrador não pode se excluir por aqui', async () => {
    const { prisma } = buildPrisma({
      usuario: { id: 'a1', papel: 'ADMIN', ativo: true, senhaHash },
    });

    await expect(new PrivacidadeService(prisma).excluirConta('a1', SENHA)).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('síndico responsável por assinatura precisa encerrá-la antes', async () => {
    const { prisma, tx } = buildPrisma({
      usuario: { id: 's1', papel: 'SINDICO', ativo: true, senhaHash },
    });
    prisma.assinatura.findFirst.mockResolvedValue({ id: 'as1' });

    await expect(new PrivacidadeService(prisma).excluirConta('s1', SENHA)).rejects.toMatchObject({
      statusCode: 409,
      code: 'ASSINATURA_ATIVA',
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('barra com locação em andamento, saque em aberto ou saldo a sacar', async () => {
    const casos: Array<[string, (p: any) => void]> = [
      ['LOCACOES_EM_ABERTO', (p) => p.locacao.count.mockResolvedValue(1)],
      ['SAQUE_EM_ABERTO', (p) => p.solicitacaoSaque.count.mockResolvedValue(1)],
      ['SALDO_A_SACAR', (p) => p.lancamento.aggregate.mockResolvedValue({ _sum: { valor: 50 } })],
    ];

    for (const [codigo, preparar] of casos) {
      const { prisma, tx } = buildPrisma();
      preparar(prisma);

      await expect(new PrivacidadeService(prisma).excluirConta('u1', SENHA)).rejects.toMatchObject({
        statusCode: 409,
        code: codigo,
      });
      expect(tx.user.update).not.toHaveBeenCalled();
    }
  });

  it('conta já removida ou inexistente devolve 404', async () => {
    const { prisma } = buildPrisma({ usuario: { id: 'u9', ativo: false, senhaHash } });

    await expect(new PrivacidadeService(prisma).excluirConta('u9', SENHA)).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
