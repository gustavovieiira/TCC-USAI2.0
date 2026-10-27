import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { UPLOADS_DIR } from '@/common/uploads';

export const MARCA_UPLOADS_DIR = path.join(UPLOADS_DIR, 'marca');
fs.mkdirSync(MARCA_UPLOADS_DIR, { recursive: true });

/** Sem SVG de propósito: pode carregar script e virar XSS armazenado se aberto direto no navegador. */
const MIME_PARA_EXTENSAO: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, MARCA_UPLOADS_DIR),
  filename: (_req, file, callback) => {
    callback(null, `logo-${randomUUID()}${MIME_PARA_EXTENSAO[file.mimetype] ?? ''}`);
  },
});

/** Logo oficial: campo `logo`, até 2 MB, o arquivo é guardado como veio (sem recompressão). */
export const uploadLogo = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!MIME_PARA_EXTENSAO[file.mimetype]) {
      callback(new Error('Formato não suportado. Use PNG, JPEG ou WebP.'));
      return;
    }
    callback(null, true);
  },
}).single('logo');
