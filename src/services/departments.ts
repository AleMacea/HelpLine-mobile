import { API_BASE } from './api';

export type DepartmentDto = {
  id: number;
  name: string;
};

export async function getDepartments(): Promise<DepartmentDto[]> {
  const response = await fetch(`${API_BASE}/departments`, { method: 'GET' });
  if (!response.ok) throw new Error('Não foi possível carregar os departamentos.');
  return response.json();
}
