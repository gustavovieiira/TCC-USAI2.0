import crypto from 'node:crypto';

/** Segredos de desenvolvimento: servem só na máquina de quem programa e NUNCA em produção. */
const SEGREDO_ACESSO_DEV = 'dev-secret';
const SEGREDO_REFRESH_DEV = 'dev-refresh-secret';
const TAMANHO_MINIMO_SEGREDO = 32;

export function emProducao(): boolean {
  return process.env.NODE_ENV === 'production';
}

function lerSegredo(nome: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET', padraoDev: string): string {
  const valor = process.env[nome];

  if (emProducao()) {
    if (
      !valor ||
      valor.length < TAMANHO_MINIMO_SEGREDO ||
      valor === padraoDev ||
      /troque/i.test(valor)
    ) {
      // Quem forja um token com o segredo de desenvolvimento entra como qualquer usuário, inclusive Admin.
      throw new Error(
        `${nome} precisa ser definido em produção, com pelo menos ${TAMANHO_MINIMO_SEGREDO} caracteres aleatórios.`,
      );
    }
    return valor;
  }

  return valor ?? padraoDev;
}

/** Segredos usados para assinar e conferir os tokens de login. */
export function segredosJwt(): { accessSecret: string; refreshSecret: string } {
  return {
    accessSecret: lerSegredo('JWT_ACCESS_SECRET', SEGREDO_ACESSO_DEV),
    refreshSecret: lerSegredo('JWT_REFRESH_SECRET', SEGREDO_REFRESH_DEV),
  };
}

/**
 * Confere a configuração obrigatória antes de o servidor aceitar conexões. Em produção, um
 * servidor mal configurado (segredo padrão, CORS aberto, webhook sem token) não sobe: é melhor
 * falhar no início do que rodar inseguro.
 */
export function validarConfiguracao(): void {
  if (!emProducao()) return;

  const problemas: string[] = [];

  try {
    const { accessSecret, refreshSecret } = segredosJwt();
    if (accessSecret === refreshSecret) {
      problemas.push('JWT_ACCESS_SECRET e JWT_REFRESH_SECRET precisam ser diferentes.');
    }
  } catch (erro) {
    problemas.push((erro as Error).message);
  }

  if (!process.env.CORS_ORIGINS?.trim()) {
    problemas.push(
      'CORS_ORIGINS precisa listar a URL do front (por exemplo https://app.seudominio.com.br).',
    );
  }

  if (process.env.ASAAS_API_KEY && !process.env.ASAAS_WEBHOOK_TOKEN) {
    problemas.push(
      'ASAAS_WEBHOOK_TOKEN precisa ser definido quando a integração com o Asaas está ligada.',
    );
  }

  if (problemas.length > 0) {
    throw new Error(`Configuração insegura para produção:\n- ${problemas.join('\n- ')}`);
  }
}

/** Comparação em tempo constante (PIN, tokens): não vaza, pelo tempo de resposta, quantos caracteres batem. */
export function iguaisEmTempoConstante(a: string, b: string): boolean {
  const hashA = crypto.createHash('sha256').update(a).digest();
  const hashB = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}
