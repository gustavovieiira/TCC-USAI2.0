import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { UPLOADS_DIR } from '@/common/uploads';

const MURAL_UPLOADS_DIR = path.join(UPLOADS_DIR, 'mural');
fs.mkdirSync(MURAL_UPLOADS_DIR, { recursive: true });

/** Só JPEG, PNG e WebP (nada de SVG, que pode carregar script). O conteúdo é conferido depois do upload. */
const MIME_PARA_EXTENSAO: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, MURAL_UPLOADS_DIR),
  // Nome gerado, nunca o original: evita path traversal e colisão de arquivos.
  filename: (_req, file, callback) => {
    callback(null, `${randomUUID()}${MIME_PARA_EXTENSAO[file.mimetype] ?? ''}`);
  },
});

/** Foto de um post do Mural: campo `imagem`, até 5 MB por arquivo. */
export const uploadImagemPost = multer({
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
