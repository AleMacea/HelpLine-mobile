import AsyncStorage from '@react-native-async-storage/async-storage';

// Base da API configurada no .env (EXPO_PUBLIC_API_BASE)
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || '';

const TOKEN_KEY = 'auth.token';

export async function setToken(token: string) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function clearToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

async function withAuth(init: RequestInit = {}) {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as any || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  return { ...init, headers } as RequestInit;
}

export async function authFetch(path: string, init?: RequestInit) {
  if (!API_BASE) throw new Error('API_BASE não configurado. Defina EXPO_PUBLIC_API_BASE no .env');
  const res = await fetch(`${API_BASE}${path}`, await withAuth(init));
  return res;
}

async function ensureOk(res: Response) {
  if (!res.ok) {
    let detail: any = undefined;
    try { detail = await res.json(); } catch {}
    const msg = `HTTP ${res.status}${detail ? `: ${JSON.stringify(detail)}` : ''}`;
    throw new Error(msg);
  }
  return res;
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await ensureOk(await authFetch(path));
  return res.json() as Promise<T>;
}

export async function postJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await ensureOk(await authFetch(path, { method: 'POST', body: JSON.stringify(body) }));
  return res.json() as Promise<TRes>;
}

export async function patchJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await ensureOk(await authFetch(path, { method: 'PATCH', body: JSON.stringify(body) }));
  return res.json() as Promise<TRes>;
}

export async function deleteJson<TRes>(path: string): Promise<TRes> {
  const res = await ensureOk(await authFetch(path, { method: 'DELETE' }));
  return res.json() as Promise<TRes>;
}

