/**
 * Origens do front autorizadas a chamar a API e o WebSocket pelo navegador. Por padrão só o front
 * local (Vite em :5173, ou o container do compose na mesma porta); em produção a lista vem de
 * `CORS_ORIGINS` (URLs separadas por vírgula), por exemplo `https://app.usai.com.br`.
 */
const ORIGENS_LOCAIS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export function origensPermitidas(): string[] {
  const configuradas = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean);

  return configuradas.length > 0 ? configuradas : ORIGENS_LOCAIS;
}
