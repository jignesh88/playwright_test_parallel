const BASE = '/api';

function token(): string | null {
  return localStorage.getItem('token');
}

function authHeader(): Record<string, string> {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function login(username: string, password: string) {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Login failed');
  const data = await res.json();
  localStorage.setItem('token', data.token);
  localStorage.setItem('fullName', data.fullName);
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('fullName');
}

export function isLoggedIn(): boolean {
  return !!token();
}

export async function getAccount() {
  const res = await fetch(`${BASE}/account`, { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to load account');
  return res.json();
}

export async function getTransactions() {
  const res = await fetch(`${BASE}/transactions`, { headers: authHeader() });
  if (!res.ok) throw new Error('Failed to load transactions');
  return res.json();
}

export async function createTransaction(payload: {
  type: 'credit' | 'debit';
  amount: number;
  description: string;
}) {
  const res = await fetch(`${BASE}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Transaction failed');
  return res.json();
}
