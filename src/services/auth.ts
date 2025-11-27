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
  department?: string;
  inviteToken?: string;
  role?: 'user';
  origin?: 'mobile';
}) {
  const body: any = {
    name: params.name,
    email: params.email,
    password: params.password,
    department: params.department ?? 'Geral',
    role: 'User',
    origin: params.origin ?? 'mobile',
  };
  if (params.inviteToken) {
    body.inviteToken = params.inviteToken;
  }
  return postJson<typeof body, AuthResponse>('/auth/register', body);
}

export async function loginUser(params: { email: string; password: string }) {
  return postJson<typeof params, AuthResponse>('/auth/login', params);
}

export async function getMe() {
  return getJson<MeResponse>('/auth/me');
}
