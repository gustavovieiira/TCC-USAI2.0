import fs from 'fs';
import path from 'path';

/**
 * Diretório onde uploads de arquivo são gravados em disco. Sobrescrevível via env pra isolar
 * os testes (e pra quando o deploy real trocar isso por um volume montado / storage externo).
 */
export const UPLOADS_DIR = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(__dirname, '../../uploads');

/**
 * Apaga do disco as imagens de um anúncio ou post que foi removido (ou de uma conta excluída). Recebe os endereços
 * (`.../uploads/mural/abc.jpg`) e só mexe dentro da pasta de uploads: qualquer endereço que tente sair dela é ignorado.
 * Falha em apagar um arquivo (já não existe, por exemplo) nunca derruba a operação.
 */
export async function removerArquivosDeUpload(
  enderecos: Array<string | null | undefined>,
): Promise<void> {
  const raiz = path.resolve(UPLOADS_DIR) + path.sep;

  await Promise.all(
    enderecos.map(async (endereco) => {
      if (!endereco) return;
      try {
        const caminhoUrl = decodeURIComponent(new URL(endereco).pathname);
        if (!caminhoUrl.startsWith('/uploads/')) return;
        const arquivo = path.resolve(UPLOADS_DIR, caminhoUrl.slice('/uploads/'.length));
        if (!arquivo.startsWith(raiz)) return;
        await fs.promises.unlink(arquivo);
      } catch {
        // endereço inválido ou arquivo que já não existe: nada a fazer
      }
    }),
  );
}
