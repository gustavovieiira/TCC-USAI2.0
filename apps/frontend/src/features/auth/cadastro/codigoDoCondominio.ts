const CODIGO_VALIDO = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * O que o morador cola no cadastro manual: o código do condomínio ("residencial-aurora") ou o link
 * completo que o painel do síndico gera ("https://.../cadastro?condominio=residencial-aurora").
 * Devolve só o código ou null quando o texto não é nenhum dos dois.
 */
export function extrairCodigoDoCondominio(texto: string): string | null {
  const entrada = texto.trim();
  if (!entrada) return null;

  let candidato = entrada;
  if (/[/?=]/.test(entrada)) {
    try {
      const url = new URL(entrada.includes('://') ? entrada : `https://${entrada}`);
      candidato = url.searchParams.get('condominio') ?? '';
    } catch {
      return null;
    }
  }

  candidato = candidato.trim().toLowerCase();
  return CODIGO_VALIDO.test(candidato) && candidato.length <= 100 ? candidato : null;
}
