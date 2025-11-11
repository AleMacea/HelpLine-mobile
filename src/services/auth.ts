import { getJson, postJson } from './api';

export type AuthResponse = {
  token: string;
  userId: string;
  name: string;
  email: string;
  roles: string[];
};

export type MeResponse = {
  userId: string;
  name: string;
  email: string;
  roles: string[];
};

export async function registerUser(params: {
  name: string;
  email: string;
  password: string;
  kind: 'usuario' | 'analista' | 'admin';
}) {
  const role = params.kind === 'analista' ? 'Analyst' : params.kind === 'admin' ? 'Admin' : 'User';
  const body: any = { name: params.name, email: params.email, password: params.password, role, origin: 'mobile' };
  if (role === 'Analyst' || role === 'Admin') body.inviteToken = 'SUPORTE4280';
  return postJson<typeof body, AuthResponse>('/auth/register', body);
}

export async function loginUser(params: { email: string; password: string }) {
  return postJson<typeof params, AuthResponse>('/auth/login', params);
}

export async function getMe() {
  return getJson<MeResponse>('/auth/me');
}
