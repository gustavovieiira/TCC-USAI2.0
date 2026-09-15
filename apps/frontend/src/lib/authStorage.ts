const ACCESS_TOKEN_KEY = 'usai:accessToken';
const REFRESH_TOKEN_KEY = 'usai:refreshToken';
const USER_KEY = 'usai:user';

export interface StoredUser {
  id: string;
  nome: string;
  email: string;
  papel: 'MORADOR' | 'SINDICO' | 'ADMIN';
  condominioId: string | null;
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
