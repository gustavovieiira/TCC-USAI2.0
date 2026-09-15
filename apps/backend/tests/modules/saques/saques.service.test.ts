import { SaquesService } from '@/modules/saques/saques.service';
import { AppError, NotFoundError } from '@/common/errors';

function buildPrismaMock() {
  return {
    solicitacaoSaque: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    logAuditoria: { create: jest.fn() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const USER_ID = 'user-1';
const ADMIN_ID = 'admin-1';
const SAQUE_ID = 'saque-1';

const saquePendente = {
  id: SAQUE_ID,
  userId: USER_ID,
  valor: 100 as unknown as number,
  chavePixUsada: 'user@pix.com',
  status: 'PENDENTE',
  motivoRejeicao: null,
  createdAt: new Date('2026-09-15'),
  processadoEm: null,
};

describe('SaquesService.solicitar', () => {
  it('morador solicita saque informando valor e chave PIX', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.create.mockResolvedValue(saquePendente);

    const service = new SaquesService(prisma);
    const result = await service.solicitar(USER_ID, { valor: 100, chavePixUsada: 'user@pix.com' });

    expect(prisma.solicitacaoSaque.create).toHaveBeenCalledWith({
      data: { userId: USER_ID, valor: 100, chavePixUsada: 'user@pix.com', status: 'PENDENTE' },
    });
    expect(result.status).toBe('PENDENTE');
    expect(result.valor).toBe(100);
  });
});

describe('SaquesService.aprovar', () => {
  it('admin aprova solicitação pendente e registra auditoria', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findUnique.mockResolvedValue(saquePendente);
    prisma.solicitacaoSaque.update.mockResolvedValue({
      ...saquePendente,
      status: 'APROVADO',
      processadoEm: new Date('2026-09-15'),
    });

    const service = new SaquesService(prisma);
    const result = await service.aprovar(SAQUE_ID, ADMIN_ID);

    expect(result.status).toBe('APROVADO');
    expect(prisma.logAuditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          adminId: ADMIN_ID,
          acao: 'APROVAR_SAQUE',
          alvoTipo: 'SolicitacaoSaque',
          alvoId: SAQUE_ID,
        }),
      }),
    );
  });

  it('rejeita aprovar solicitação inexistente', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findUnique.mockResolvedValue(null);

    const service = new SaquesService(prisma);

    await expect(service.aprovar('inexistente', ADMIN_ID)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rejeita aprovar solicitação que não está mais pendente', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findUnique.mockResolvedValue({ ...saquePendente, status: 'APROVADO' });

    const service = new SaquesService(prisma);

    await expect(service.aprovar(SAQUE_ID, ADMIN_ID)).rejects.toBeInstanceOf(AppError);
  });
});

describe('SaquesService.rejeitar', () => {
  it('admin rejeita solicitação pendente com motivo e registra auditoria', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findUnique.mockResolvedValue(saquePendente);
    prisma.solicitacaoSaque.update.mockResolvedValue({
      ...saquePendente,
      status: 'REJEITADO',
      motivoRejeicao: 'Chave PIX divergente do cadastro',
      processadoEm: new Date('2026-09-15'),
    });

    const service = new SaquesService(prisma);
    const result = await service.rejeitar(SAQUE_ID, ADMIN_ID, {
      motivoRejeicao: 'Chave PIX divergente do cadastro',
    });

    expect(result.status).toBe('REJEITADO');
    expect(result.motivoRejeicao).toBe('Chave PIX divergente do cadastro');
    expect(prisma.logAuditoria.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ adminId: ADMIN_ID, acao: 'REJEITAR_SAQUE' }),
      }),
    );
  });

  it('rejeita avaliar solicitação que já foi processada', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findUnique.mockResolvedValue({ ...saquePendente, status: 'REJEITADO' });

    const service = new SaquesService(prisma);

    await expect(
      service.rejeitar(SAQUE_ID, ADMIN_ID, { motivoRejeicao: 'Motivo qualquer' }),
    ).rejects.toBeInstanceOf(AppError);
  });
});

describe('SaquesService.listarTodas', () => {
  it('filtra por status quando informado', async () => {
    const prisma = buildPrismaMock();
    prisma.solicitacaoSaque.findMany.mockResolvedValue([saquePendente]);

    const service = new SaquesService(prisma);
    await service.listarTodas({ status: 'PENDENTE' });

    expect(prisma.solicitacaoSaque.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: 'PENDENTE' } }),
    );
  });
});
