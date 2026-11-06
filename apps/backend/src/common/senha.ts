import { z } from 'zod';

/**
 * Senhas que aparecem em todas as listas de vazamento. A lista é curta de propósito: serve para barrar o
 * óbvio sem irritar quem usa uma senha razoável. Comparação sem diferenciar maiúsculas de minúsculas.
 */
const SENHAS_COMUNS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  '87654321',
  '11111111',
  '00000000',
  'password',
  'password1',
  'senha123',
  'senha1234',
  'senhasenha',
  'qwertyui',
  'qwerty123',
  'abcd1234',
  'abc12345',
  'iloveyou',
  'admin123',
  'usai1234',
  'brasil123',
  'mudar123',
]);

/** O bcrypt só lê os 72 primeiros bytes: acima disso a senha seria cortada sem aviso. */
const MAXIMO_BYTES_BCRYPT = 72;

export const MENSAGEM_SENHA_FRACA =
  'Essa senha é fácil de adivinhar. Escolha outra, misturando letras e números.';

export const senhaSchema = z
  .string()
  .min(8, 'Senha deve ter ao menos 8 caracteres')
  .refine(
    (s) => Buffer.byteLength(s, 'utf8') <= MAXIMO_BYTES_BCRYPT,
    'Senha muito longa (máximo de 72 caracteres)',
  )
  .refine((s) => !SENHAS_COMUNS.has(s.toLowerCase()), MENSAGEM_SENHA_FRACA)
  .refine((s) => new Set(s).size > 2, MENSAGEM_SENHA_FRACA);
