import { EstadoConservacao, StatusMovimentacao, TipoMovimentacao } from './movimentacoes.types';

export const ROTULO_TIPO: Record<TipoMovimentacao, string> = {
  RETIRADA: 'Retirada',
  DEVOLUCAO: 'Devolução',
};

export const ROTULO_STATUS: Record<StatusMovimentacao, string> = {
  AGUARDANDO_ACEITE: 'Aguardando aceite',
  CONCLUIDA: 'Concluída',
  CANCELADA: 'Cancelada',
};

export const CLASSE_STATUS: Record<StatusMovimentacao, string> = {
  AGUARDANDO_ACEITE: 'bg-mostarda-100 text-mostarda-700',
  CONCLUIDA: 'bg-jade-100 text-jade-700',
  CANCELADA: 'bg-carmim-100 text-carmim-700',
};

export const ROTULO_ESTADO: Record<EstadoConservacao, string> = {
  OTIMO: 'Ótimo (como novo)',
  BOM: 'Bom (sinais leves de uso)',
  REGULAR: 'Regular (desgaste visível)',
  COM_AVARIAS: 'Com avarias (danos a registrar)',
};

export const ROTULO_EVENTO: Record<string, string> = {
  CRIADA: 'Registro criado',
  ACEITE_REGISTRADO: 'Aceite registrado',
  CANCELADA: 'Registro cancelado',
  RETIFICACAO: 'Retificação',
};
