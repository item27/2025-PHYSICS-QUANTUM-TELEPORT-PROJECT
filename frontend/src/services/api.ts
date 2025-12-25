import { SessionState } from '@state/network/types';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8080';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }
  return (await response.json()) as T;
}

export async function createSession(): Promise<SessionState> {
  return request<SessionState>('/api/sessions', { method: 'POST' });
}

export async function fetchSession(id: string): Promise<SessionState> {
  return request<SessionState>(`/api/sessions/${id}`);
}

export async function joinSession(id: string, role: string, token?: string) {
  return request<{ token: string; role: string }>(`/api/sessions/${id}/join`, {
    method: 'POST',
    body: JSON.stringify({ role, token }),
  });
}

export async function advanceSession(id: string, token: string): Promise<SessionState> {
  return request<SessionState>(`/api/sessions/${id}/advance`, { method: 'POST', body: JSON.stringify({ token }) });
}

export async function leaveSession(id: string, token: string): Promise<SessionState> {
  return request<SessionState>(`/api/sessions/${id}/leave`, { method: 'POST', body: JSON.stringify({ token }) });
}
