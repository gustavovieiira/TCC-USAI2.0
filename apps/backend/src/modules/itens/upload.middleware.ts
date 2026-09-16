import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { UPLOADS_DIR } from '@/common/uploads';

const ITENS_UPLOADS_DIR = path.join(UPLOADS_DIR, 'itens');
fs.mkdirSync(ITENS_UPLOADS_DIR, { recursive: true });

/**
 * Só estes três formatos — evita aceitar algo como image/svg+xml, que pode carregar script e
 * criar XSS armazenado se servido de volta pelo navegador.
 */
const MIME_PARA_EXTENSAO: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, ITENS_UPLOADS_DIR),
  // Nome gerado, nunca o original — evita path traversal e colisão de arquivos.
  filename: (_req, file, callback) => {
    callback(null, `${randomUUID()}${MIME_PARA_EXTENSAO[file.mimetype] ?? ''}`);
  },
});

/** Uso: `uploadImagemItem(req, res, callback)` — ver itens.controller.ts#uploadImagem. */
export const uploadImagemItem = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!MIME_PARA_EXTENSAO[file.mimetype]) {
      callback(new Error('Formato de imagem não suportado. Use JPEG, PNG ou WebP.'));
      return;
    }
    callback(null, true);
  },
}).single('imagem');
