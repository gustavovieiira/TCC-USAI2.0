import { MovimentacaoDetalheDTO, MovimentacaoResumoDTO, TermoDTO } from './movimentacoes.types';

export const termoRetirada: TermoDTO = {
  id: 'termo-1',
  tipo: 'RETIRADA',
  versao: 2,
  titulo: 'Termo de Responsabilidade — Retirada do Item',
  clausulas: [
    'O locatário declara ter recebido o item e os acessórios relacionados.',
    'É vedado emprestar, ceder ou sublocar o item a terceiros sem autorização.',
  ],
  declaracoes: [
    { id: 'recebimento', texto: 'Declaro que recebi o item e conferi as informações registradas.' },
    { id: 'ciencia', texto: 'Declaro que li e estou ciente dos termos de responsabilidade.' },
    { id: 'compromisso', texto: 'Comprometo-me a zelar pelo item e a comunicar ocorrências.' },
  ],
  statusRevisao: 'MODELO',
  aprovadoEm: null,
  createdAt: '2026-10-01T00:00:00.000Z',
};

export function buildResumo(overrides: Partial<MovimentacaoResumoDTO> = {}): MovimentacaoResumoDTO {
  return {
    id: 'mov-1',
    numero: 7,
    numeroDocumento: 'USAI-2026-000007',
    tipo: 'RETIRADA',
    status: 'AGUARDANDO_ACEITE',
    ocorridoEm: '2026-10-27T15:00:00.000Z',
    concluidaEm: null,
    estadoConservacao: 'BOM',
    entreguePor: { id: 'dono-1', nome: 'Davi Dono' },
    recebidoPor: { id: 'locatario-1', nome: 'Carla Locataria' },
    ...overrides,
  };
}

export function buildDetalhe(
  overrides: Partial<MovimentacaoDetalheDTO> = {},
): MovimentacaoDetalheDTO {
  return {
    ...buildResumo(),
    locacaoId: 'loc-1',
    statusLocacao: 'PAGA',
    acessorios: [
      { nome: 'Controle remoto', conferido: true },
      { nome: 'Cabo HDMI', conferido: false },
    ],
    observacoes: 'Pequeno risco na lateral',
    snapshot: {
      locacao: {
        id: 'loc-1',
        dataInicio: '2026-11-01T00:00:00.000Z',
        dataFim: '2026-11-03T00:00:00.000Z',
        valorTotal: 100,
        finalidade: 'Sessão de cinema no salão',
      },
      item: {
        id: 'item-1',
        titulo: 'Projetor Epson',
        descricao: 'Projetor full HD',
        categoria: 'Eletrônicos',
        fabricante: 'Epson',
        modelo: 'X49',
        numeroSerie: 'SN-123',
        acessorios: ['Controle remoto', 'Cabo HDMI'],
      },
      dono: {
        id: 'dono-1',
        nome: 'Davi Dono',
        apartamento: '101',
        condominio: 'Residencial Jardim Europa',
        cpfMascarado: null,
      },
      locatario: {
        id: 'locatario-1',
        nome: 'Carla Locataria',
        apartamento: '202',
        condominio: 'Residencial Jardim Europa',
        cpfMascarado: '***.***.***-88',
      },
    },
    termo: termoRetirada,
    aceite: null,
    eventos: [
      {
        id: 'e-1',
        acao: 'CRIADA',
        detalhe: 'Registro de retirada criado por Davi Dono.',
        createdAt: '2026-10-27T15:00:00.000Z',
        usuario: { id: 'dono-1', nome: 'Davi Dono' },
      },
    ],
    integridade: { hash: null, verificada: null },
    permissoes: { aceitar: true, cancelar: false, retificar: true },
    ...overrides,
  };
}

export const concluida: Partial<MovimentacaoDetalheDTO> = {
  status: 'CONCLUIDA',
  concluidaEm: '2026-10-27T16:00:00.000Z',
  aceite: {
    usuario: { id: 'locatario-1', nome: 'Carla Locataria' },
    aceitoEm: '2026-10-27T16:00:00.000Z',
    declaracoes: termoRetirada.declaracoes,
    assinatura: 'a'.repeat(64),
  },
  integridade: { hash: 'f'.repeat(64), verificada: true },
  permissoes: { aceitar: false, cancelar: false, retificar: true },
};
