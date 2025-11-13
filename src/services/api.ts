import AsyncStorage from '@react-native-async-storage/async-storage';

// Base da API configurada no .env (EXPO_PUBLIC_API_BASE)
export const API_BASE = process.env.EXPO_PUBLIC_API_BASE || '';

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: any;
  userMessage: string;
  constructor(opts: { message: string; status: number; code?: string; details?: any; userMessage: string }) {
    super(opts.message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.code = opts.code;
    this.details = opts.details;
    this.userMessage = opts.userMessage;
  }
}

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

async function parseBody(res: Response) {
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { return await res.json(); } catch { return null; }
  }
  try { return await res.text(); } catch { return null; }
}

function toUserMessage(status: number, path: string, details: any): string {
  if (status === 0) {
    return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.';
  }
  if (status === 401) {
    return path.startsWith('/auth/login') ? 'E-mail ou senha inválidos.' : 'Sua sessão expirou. Faça login novamente.';
  }
  if (status === 403) return 'Você não tem permissão para realizar esta ação.';
  if (status === 404) return 'Recurso não encontrado.';
  if (status === 400 || status === 422) {
    if (details && typeof details === 'object') {
      const msg = details.title || details.detail || (details.errors ? Object.values(details.errors).flat().join(' ') : '');
      if (msg) return msg as string;
    }
    return 'Requisição inválida. Verifique os dados e tente novamente.';
  }
  if (status >= 500) return 'Erro temporário no servidor. Tente novamente mais tarde.';
  return 'Ocorreu um erro. Tente novamente.';
}

async function authFetch(path: string, init?: RequestInit) {
  if (!API_BASE) throw new ApiError({ message: 'api-base-missing', status: 0, userMessage: 'Configuração de API ausente.' });
  try {
    const res = await fetch(`${API_BASE}${path}`, await withAuth(init));
    return res;
  } catch (err: any) {
    throw new ApiError({ message: err?.message || 'network-error', status: 0, userMessage: 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.' });
  }
}

async function ensureOk(path: string, res: Response) {
  if (res.ok) return res;
  const body = await parseBody(res);
  const userMessage = toUserMessage(res.status, path, body);
  const code = body && (body.code || body.error);
  throw new ApiError({ message: `HTTP ${res.status}`, status: res.status, code, details: body, userMessage });
}

export async function getJson<T>(path: string): Promise<T> {
  const res = await authFetch(path);
  await ensureOk(path, res);
  return res.json() as Promise<T>;
}

export async function postJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await authFetch(path, { method: 'POST', body: JSON.stringify(body) });
  await ensureOk(path, res);
  return res.json() as Promise<TRes>;
}

export async function patchJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const res = await authFetch(path, { method: 'PATCH', body: JSON.stringify(body) });
  await ensureOk(path, res);
  return res.json() as Promise<TRes>;
}

export async function deleteJson<TRes>(path: string): Promise<TRes> {
  const res = await authFetch(path, { method: 'DELETE' });
  await ensureOk(path, res);
  return res.json() as Promise<TRes>;
}
