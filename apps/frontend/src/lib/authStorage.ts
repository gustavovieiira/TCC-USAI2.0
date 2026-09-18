const ACCESS_TOKEN_KEY = 'usai:accessToken';
const REFRESH_TOKEN_KEY = 'usai:refreshToken';
const USER_KEY = 'usai:user';

export type Papel = 'MORADOR' | 'SINDICO' | 'ADMIN';

export interface StoredUser {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  condominioId: string | null;
  apartamento: string | null;
}

export function saveSession(accessToken: string, refreshToken: string, user: StoredUser) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as StoredUser) : null;
}

/** Atualiza só os dados do usuário guardados (ex.: depois de editar o perfil), sem tocar nos tokens. */
export function updateStoredUser(user: StoredUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/**
 * Página inicial de cada papel — pra onde vai o login/cadastro, o clique no logo "USAI" e o
 * fallback do `RoleRoute` quando o papel não bate com a rota. Admin ainda não tem acesso ao Mural
 * (não pertence a um condomínio), por isso cai no próprio painel em vez de entrar num loop de
 * redirecionamento.
 */
export function homeRouteFor(papel?: Papel): string {
  if (papel === 'ADMIN') return '/admin';
  return '/mural';
}
