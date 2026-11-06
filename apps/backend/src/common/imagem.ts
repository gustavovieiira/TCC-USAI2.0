import fs from 'fs';
import { AppError } from './errors';

/** Os primeiros bytes de cada formato aceito. O tipo informado pelo navegador (`mimetype`) não prova nada. */
export function formatoDaImagem(inicio: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (inicio.length >= 3 && inicio[0] === 0xff && inicio[1] === 0xd8 && inicio[2] === 0xff) {
    return 'jpeg';
  }
  if (
    inicio.length >= 8 &&
    inicio.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }
  if (
    inicio.length >= 12 &&
    inicio.subarray(0, 4).toString('latin1') === 'RIFF' &&
    inicio.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

/**
 * Depois do upload, confere o conteúdo do arquivo: se não for mesmo JPEG, PNG ou WebP, apaga e recusa.
 * Sem isso, qualquer arquivo (um HTML com script, por exemplo) passaria só por declarar `image/png`.
 */
export async function garantirImagemReal(caminho: string): Promise<void> {
  let inicio = Buffer.alloc(0);

  try {
    const arquivo = await fs.promises.open(caminho, 'r');
    try {
      const lido = Buffer.alloc(12);
      const { bytesRead } = await arquivo.read(lido, 0, 12, 0);
      inicio = lido.subarray(0, bytesRead);
    } finally {
      await arquivo.close();
    }
  } catch {
    // Arquivo ilegível: tratado como inválido logo abaixo.
  }

  if (!formatoDaImagem(inicio)) {
    await fs.promises.unlink(caminho).catch(() => undefined);
    throw new AppError(
      'O arquivo enviado não é uma imagem válida (use JPEG, PNG ou WebP).',
      400,
      'UPLOAD_INVALIDO',
    );
  }
}
