import fs from 'fs';
import path from 'path';
import { UPLOADS_DIR, removerArquivosDeUpload } from '@/common/uploads';

const PASTA = path.join(UPLOADS_DIR, 'teste-remocao');

beforeAll(() => fs.mkdirSync(PASTA, { recursive: true }));
afterAll(() => fs.rmSync(PASTA, { recursive: true, force: true }));

function criar(nome: string): string {
  const caminho = path.join(PASTA, nome);
  fs.writeFileSync(caminho, 'x');
  return caminho;
}

describe('removerArquivosDeUpload', () => {
  it('apaga os arquivos pelo endereço, ignorando o domínio', async () => {
    const a = criar('a.jpg');
    const b = criar('b.png');

    await removerArquivosDeUpload([
      'http://localhost:3000/uploads/teste-remocao/a.jpg',
      'https://api.exemplo.com.br/uploads/teste-remocao/b.png',
    ]);

    expect(fs.existsSync(a)).toBe(false);
    expect(fs.existsSync(b)).toBe(false);
  });

  it('não sai da pasta de uploads, mesmo com ../ no endereço', async () => {
    const fora = path.join(UPLOADS_DIR, '..', 'package.json');
    const existia = fs.existsSync(fora);

    await removerArquivosDeUpload(['http://localhost:3000/uploads/../package.json']);
    await removerArquivosDeUpload(['http://localhost:3000/uploads/%2e%2e/package.json']);

    expect(fs.existsSync(fora)).toBe(existia);
  });

  it('ignora o que não é upload, endereços inválidos, vazios e arquivos que já não existem', async () => {
    const segura = criar('segura.jpg');

    await expect(
      removerArquivosDeUpload([
        'http://localhost:3000/outra-rota/segura.jpg',
        'isto-nao-e-url',
        '',
        null,
        undefined,
        'http://localhost:3000/uploads/teste-remocao/nao-existe.jpg',
      ]),
    ).resolves.toBeUndefined();

    expect(fs.existsSync(segura)).toBe(true);
  });
});
