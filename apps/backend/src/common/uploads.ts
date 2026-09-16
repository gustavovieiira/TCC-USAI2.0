import path from 'path';

/**
 * Diretório onde uploads de arquivo são gravados em disco. Sobrescrevível via env pra isolar
 * os testes (e pra quando o deploy real trocar isso por um volume montado / storage externo).
 */
export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '../../uploads');
