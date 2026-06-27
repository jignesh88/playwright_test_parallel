const BASE = '/api';

export type AccountKind = 'checking' | 'savings';
export type PaymentType = 'ach' | 'card' | 'wire';
export type LoanStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

export type BankAccount = {
  id: string;
  kind: AccountKind;
  name: string;
  balance: number;
};

export type Transaction = {
  id: string;
  accountId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  balanceAfter: number;
};

export type NotificationSettings = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  marketingEnabled: boolean;
};

export type LoanApplication = {
  id: string;
  amount: number;
  termMonths: number;
  purpose: string;
  status: LoanStatus;
  submittedAt: string;
};

function token(): string | null {
  return localStorage.getItem('token');
}

function authHeader(): Record<string, string> {
  const t = token();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `${res.status} ${res.statusText}`);
  return body as T;
}

export async function login(username: string, password: string) {
  const data = await request<{ token: string; fullName: string }>('/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
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

export const getAccount = () =>
  request<{ username: string; fullName: string; balance: number }>('/account');

export const getAccounts = () => request<{ accounts: BankAccount[] }>('/accounts');

export const createAccount = (payload: { kind: AccountKind; name: string }) =>
  request<{ account: BankAccount }>('/accounts', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getTransactions = () =>
  request<{ transactions: Transaction[] }>('/transactions');

export const createTransaction = (payload: {
  accountId?: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
}) =>
  request<{ transaction: Transaction; balance: number }>('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const createTransfer = (payload: {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  memo?: string;
}) =>
  request<{ from: BankAccount; to: BankAccount }>('/transfers', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getSettings = () =>
  request<{ settings: NotificationSettings }>('/settings');

export const updateSettings = (settings: NotificationSettings) =>
  request<{ settings: NotificationSettings }>('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });

export const createPayment = (payload: {
  fromAccountId: string;
  payee: string;
  amount: number;
  paymentType: PaymentType;
}) =>
  request<{ transaction: Transaction; balance: number }>('/payments', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getLoans = () => request<{ loans: LoanApplication[] }>('/loans');

export const createLoan = (payload: {
  amount: number;
  termMonths: number;
  purpose: string;
}) =>
  request<{ loan: LoanApplication }>('/loans', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const getLoan = (id: string) =>
  request<{ loan: LoanApplication }>(`/loans/${id}`);
