import { atualizarItemSchema, criarItemSchema } from '@/modules/itens/itens.schemas';
import { criarLocacaoSchema } from '@/modules/locacoes/locacoes.schemas';
import { ItensService, lerAcessorios } from '@/modules/itens/itens.service';
import { LocacoesService } from '@/modules/locacoes/locacoes.service';

const itemBase = {
  titulo: 'Furadeira Bosch',
  descricao: 'Furadeira de impacto 650W',
  categoria: 'Ferramentas',
  valorDiaria: 20,
};

describe('identificação do bem no item', () => {
  it('fabricante, modelo, nº de série e acessórios são opcionais — o item antigo continua válido', () => {
    expect(criarItemSchema.safeParse(itemBase).success).toBe(true);
  });

  it('aceita os dados do bem e limpa espaços; campo vazio vira "não informado"', () => {
    const resultado = criarItemSchema.parse({
      ...itemBase,
      fabricante: '  Bosch ',
      modelo: '',
      numeroSerie: 'SN-123',
      acessorios: ['  Maleta ', 'Jogo de brocas'],
    });

    expect(resultado.fabricante).toBe('Bosch');
    expect(resultado.modelo).toBeUndefined();
    expect(resultado.numeroSerie).toBe('SN-123');
    expect(resultado.acessorios).toEqual(['Maleta', 'Jogo de brocas']);
  });

  it('limita o tamanho dos campos e a quantidade de acessórios', () => {
    expect(criarItemSchema.safeParse({ ...itemBase, fabricante: 'x'.repeat(121) }).success).toBe(
      false,
    );
    expect(criarItemSchema.safeParse({ ...itemBase, acessorios: [''] }).success).toBe(false);
    expect(
      criarItemSchema.safeParse({ ...itemBase, acessorios: Array(31).fill('Peça') }).success,
    ).toBe(false);
  });

  it('o dono pode atualizar só a identificação do bem', () => {
    expect(
      atualizarItemSchema.safeParse({ numeroSerie: 'SN-999', acessorios: ['Maleta'] }).success,
    ).toBe(true);
  });

  it('lerAcessorios só aceita lista de textos (JSON do banco pode vir de qualquer jeito)', () => {
    expect(lerAcessorios(['Maleta', 'Brocas'])).toEqual(['Maleta', 'Brocas']);
    expect(lerAcessorios(['Maleta', 3, null])).toEqual(['Maleta']);
    expect(lerAcessorios(null)).toEqual([]);
    expect(lerAcessorios({ a: 1 })).toEqual([]);
  });

  it('o serviço grava a identificação e o DTO devolve os acessórios como lista', async () => {
    const prisma = {
      item: {
        create: jest.fn().mockResolvedValue({
          id: 'i-1',
          ...itemBase,
          valorDiaria: 20,
          fabricante: 'Bosch',
          modelo: null,
          numeroSerie: null,
          acessorios: ['Maleta'],
          ativo: true,
          ownerId: 'o-1',
          condominioId: 'c-1',
          createdAt: new Date(),
          imagens: [],
        }),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const dto = await new ItensService(prisma).criar('c-1', 'o-1', {
      ...itemBase,
      fabricante: 'Bosch',
      acessorios: ['Maleta'],
    });

    expect(prisma.item.create.mock.calls[0][0].data).toMatchObject({
      fabricante: 'Bosch',
      acessorios: ['Maleta'],
    });
    expect(dto).toMatchObject({ fabricante: 'Bosch', modelo: null, acessorios: ['Maleta'] });
  });
});

describe('finalidade da locação', () => {
  const periodo = {
    itemId: 'item-1',
    dataInicio: new Date(Date.now() + 5 * 864e5).toISOString().slice(0, 10),
    dataFim: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
  };

  it('é opcional, limpa espaços e tem limite de 500 caracteres', () => {
    expect(criarLocacaoSchema.parse(periodo).finalidade).toBeUndefined();
    expect(
      criarLocacaoSchema.parse({ ...periodo, finalidade: '  Pendurar quadros  ' }).finalidade,
    ).toBe('Pendurar quadros');
    expect(criarLocacaoSchema.parse({ ...periodo, finalidade: '   ' }).finalidade).toBeUndefined();
    expect(criarLocacaoSchema.safeParse({ ...periodo, finalidade: 'x'.repeat(501) }).success).toBe(
      false,
    );
  });

  it('o serviço grava a finalidade e ela volta no DTO', async () => {
    const item = {
      id: 'item-1',
      titulo: 'Furadeira',
      valorDiaria: 20,
      ownerId: 'dono-1',
      ativo: true,
    };
    const prisma = {
      item: { findFirst: jest.fn().mockResolvedValue(item) },
      locacao: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }) => ({
          id: 'l-1',
          ...data,
          createdAt: new Date(),
          item,
          locatario: { nome: 'Carla' },
        })),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const dto = await new LocacoesService(prisma).solicitar('cond-1', 'loc-1', {
      itemId: 'item-1',
      dataInicio: new Date('2026-12-01'),
      dataFim: new Date('2026-12-02'),
      finalidade: 'Pendurar quadros',
    });

    expect(prisma.locacao.create.mock.calls[0][0].data.finalidade).toBe('Pendurar quadros');
    expect(dto.finalidade).toBe('Pendurar quadros');
  });
});
