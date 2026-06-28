import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'demo-secret-key-not-for-production';
const PORT = Number(process.env.PORT) || 4100;

type AccountKind = 'checking' | 'savings';
type PaymentType = 'ach' | 'card' | 'wire';
type LoanStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

type Transaction = {
  id: string;
  accountId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  balanceAfter: number;
};

type BankAccount = {
  id: string;
  kind: AccountKind;
  name: string;
  balance: number;
};

type NotificationSettings = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  marketingEnabled: boolean;
};

type LoanApplication = {
  id: string;
  amount: number;
  termMonths: number;
  purpose: string;
  status: LoanStatus;
  submittedAt: string;
};

type User = {
  username: string;
  password: string;
  fullName: string;
  accounts: BankAccount[];
  transactions: Transaction[];
  settings: NotificationSettings;
  loans: LoanApplication[];
};

function seedUsers(): Record<string, User> {
  return {
    demo: {
      username: 'demo',
      password: 'password123',
      fullName: 'Demo User',
      accounts: [
        { id: 'a1', kind: 'checking', name: 'Everyday Checking', balance: 1000 },
        { id: 'a2', kind: 'savings', name: 'Rainy Day Savings', balance: 5000 },
      ],
      transactions: [
        {
          id: 't0',
          accountId: 'a1',
          type: 'credit',
          amount: 1000,
          description: 'Opening balance',
          date: new Date('2026-01-01').toISOString(),
          balanceAfter: 1000,
        },
        {
          id: 't1',
          accountId: 'a2',
          type: 'credit',
          amount: 5000,
          description: 'Opening balance',
          date: new Date('2026-01-01').toISOString(),
          balanceAfter: 5000,
        },
      ],
      settings: { emailEnabled: true, smsEnabled: false, marketingEnabled: false },
      loans: [],
    },
  };
}

const users = seedUsers();

interface AuthedRequest extends Request {
  user?: { username: string };
}

function currentUser(req: AuthedRequest): User {
  return users[req.user!.username];
}

function nextId(prefix: string, items: { id: string }[]): string {
  return `${prefix}${items.length + 1}`;
}

function auth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing token' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), JWT_SECRET) as { username: string };
    req.user = { username: decoded.username };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

app.post('/api/login', (req: Request, res: Response) => {
  const { username, password } = req.body ?? {};
  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, fullName: user.fullName });
});

// Test-only endpoint: mint an ephemeral user with seed accounts so each test
// owns its own backend state. Mounted only outside production.
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/_test/users', (req: Request, res: Response) => {
    const body = req.body ?? {};
    const randomId = Math.random().toString(36).slice(2, 10);
    const username = String(body.username ?? `test-${randomId}`).slice(0, 60);
    if (users[username]) {
      return res.status(409).json({ error: `User ${username} already exists` });
    }
    const password = String(body.password ?? `pw-${randomId}`);
    const fullName = String(body.fullName ?? `Test User ${randomId}`).slice(0, 60);
    const seedKinds: AccountKind[] = Array.isArray(body.seedAccounts) && body.seedAccounts.length
      ? body.seedAccounts.filter((k: unknown): k is AccountKind => k === 'checking' || k === 'savings')
      : ['checking', 'savings'];

    const accounts: BankAccount[] = seedKinds.map((kind, i) => ({
      id: `a${i + 1}`,
      kind,
      name: kind === 'checking' ? 'Everyday Checking' : 'Rainy Day Savings',
      balance: kind === 'checking' ? 1000 : 5000,
    }));

    const now = new Date().toISOString();
    const transactions: Transaction[] = accounts.map((a, i) => ({
      id: `t${i}`,
      accountId: a.id,
      type: 'credit',
      amount: a.balance,
      description: 'Opening balance',
      date: now,
      balanceAfter: a.balance,
    }));

    users[username] = {
      username,
      password,
      fullName,
      accounts,
      transactions,
      settings: { emailEnabled: false, smsEnabled: false, marketingEnabled: false },
      loans: [],
    };

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ username, password, fullName, token, accounts });
  });
}

app.get('/api/account', auth, (req: AuthedRequest, res: Response) => {
  const user = currentUser(req);
  const totalBalance = user.accounts.reduce((sum, a) => sum + a.balance, 0);
  res.json({
    username: user.username,
    fullName: user.fullName,
    balance: totalBalance,
  });
});

app.get('/api/accounts', auth, (req: AuthedRequest, res: Response) => {
  const user = currentUser(req);
  res.json({ accounts: user.accounts });
});

app.post('/api/accounts', auth, (req: AuthedRequest, res: Response) => {
  const { kind, name } = req.body ?? {};
  if (kind !== 'checking' && kind !== 'savings') {
    return res.status(400).json({ error: 'kind must be checking or savings' });
  }
  const trimmed = String(name ?? '').trim();
  if (!trimmed) {
    return res.status(400).json({ error: 'name is required' });
  }
  const user = currentUser(req);
  const account: BankAccount = {
    id: nextId('a', user.accounts),
    kind,
    name: trimmed.slice(0, 60),
    balance: 0,
  };
  user.accounts.push(account);
  res.status(201).json({ account });
});

app.get('/api/transactions', auth, (req: AuthedRequest, res: Response) => {
  const user = currentUser(req);
  res.json({ transactions: user.transactions });
});

app.post('/api/transactions', auth, (req: AuthedRequest, res: Response) => {
  const { accountId, type, amount, description } = req.body ?? {};
  if (type !== 'credit' && type !== 'debit') {
    return res.status(400).json({ error: 'type must be credit or debit' });
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  const user = currentUser(req);
  const account =
    user.accounts.find((a) => a.id === accountId) ?? user.accounts[0];
  if (!account) {
    return res.status(400).json({ error: 'No account available' });
  }
  if (type === 'debit' && account.balance < numericAmount) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }
  account.balance += type === 'credit' ? numericAmount : -numericAmount;
  const tx: Transaction = {
    id: nextId('t', user.transactions),
    accountId: account.id,
    type,
    amount: numericAmount,
    description: String(description ?? '').slice(0, 120),
    date: new Date().toISOString(),
    balanceAfter: account.balance,
  };
  user.transactions.unshift(tx);
  res.status(201).json({ transaction: tx, balance: account.balance });
});

app.post('/api/transfers', auth, (req: AuthedRequest, res: Response) => {
  const { fromAccountId, toAccountId, amount, memo } = req.body ?? {};
  if (!fromAccountId || !toAccountId) {
    return res.status(400).json({ error: 'fromAccountId and toAccountId required' });
  }
  if (fromAccountId === toAccountId) {
    return res.status(400).json({ error: 'Source and destination must differ' });
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  const user = currentUser(req);
  const from = user.accounts.find((a) => a.id === fromAccountId);
  const to = user.accounts.find((a) => a.id === toAccountId);
  if (!from || !to) {
    return res.status(404).json({ error: 'Account not found' });
  }
  if (from.balance < numericAmount) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }
  from.balance -= numericAmount;
  to.balance += numericAmount;
  const memoText = String(memo ?? '').slice(0, 120) || `Transfer to ${to.name}`;
  const debitTx: Transaction = {
    id: nextId('t', user.transactions),
    accountId: from.id,
    type: 'debit',
    amount: numericAmount,
    description: memoText,
    date: new Date().toISOString(),
    balanceAfter: from.balance,
  };
  user.transactions.unshift(debitTx);
  const creditTx: Transaction = {
    id: nextId('t', user.transactions),
    accountId: to.id,
    type: 'credit',
    amount: numericAmount,
    description: `Transfer from ${from.name}`,
    date: new Date().toISOString(),
    balanceAfter: to.balance,
  };
  user.transactions.unshift(creditTx);
  res.status(201).json({ from, to });
});

app.get('/api/settings', auth, (req: AuthedRequest, res: Response) => {
  res.json({ settings: currentUser(req).settings });
});

app.put('/api/settings', auth, (req: AuthedRequest, res: Response) => {
  const { emailEnabled, smsEnabled, marketingEnabled } = req.body ?? {};
  const user = currentUser(req);
  user.settings = {
    emailEnabled: Boolean(emailEnabled),
    smsEnabled: Boolean(smsEnabled),
    marketingEnabled: Boolean(marketingEnabled),
  };
  res.json({ settings: user.settings });
});

app.post('/api/payments', auth, (req: AuthedRequest, res: Response) => {
  const { fromAccountId, payee, amount, paymentType } = req.body ?? {};
  if (!['ach', 'card', 'wire'].includes(paymentType)) {
    return res.status(400).json({ error: 'paymentType must be ach, card, or wire' });
  }
  const trimmedPayee = String(payee ?? '').trim();
  if (!trimmedPayee) {
    return res.status(400).json({ error: 'payee is required' });
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  const user = currentUser(req);
  const account = user.accounts.find((a) => a.id === fromAccountId);
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }
  if (account.balance < numericAmount) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }
  account.balance -= numericAmount;
  const tx: Transaction = {
    id: nextId('t', user.transactions),
    accountId: account.id,
    type: 'debit',
    amount: numericAmount,
    description: `Payment to ${trimmedPayee.slice(0, 40)} (${(paymentType as PaymentType).toUpperCase()})`,
    date: new Date().toISOString(),
    balanceAfter: account.balance,
  };
  user.transactions.unshift(tx);
  res.status(201).json({ transaction: tx, balance: account.balance });
});

app.get('/api/loans', auth, (req: AuthedRequest, res: Response) => {
  res.json({ loans: currentUser(req).loans });
});

app.post('/api/loans', auth, (req: AuthedRequest, res: Response) => {
  const { amount, termMonths, purpose } = req.body ?? {};
  const numericAmount = Number(amount);
  const numericTerm = Number(termMonths);
  if (!Number.isFinite(numericAmount) || numericAmount < 500) {
    return res.status(400).json({ error: 'amount must be at least 500' });
  }
  if (!Number.isFinite(numericTerm) || ![12, 24, 36, 48, 60].includes(numericTerm)) {
    return res.status(400).json({ error: 'termMonths must be one of 12, 24, 36, 48, 60' });
  }
  const trimmedPurpose = String(purpose ?? '').trim();
  if (!trimmedPurpose) {
    return res.status(400).json({ error: 'purpose is required' });
  }
  const user = currentUser(req);
  const initialStatus: LoanStatus =
    numericAmount > 50000 ? 'rejected' : numericAmount > 10000 ? 'under_review' : 'approved';
  const loan: LoanApplication = {
    id: nextId('l', user.loans),
    amount: numericAmount,
    termMonths: numericTerm,
    purpose: trimmedPurpose.slice(0, 120),
    status: initialStatus,
    submittedAt: new Date().toISOString(),
  };
  user.loans.unshift(loan);
  res.status(201).json({ loan });
});

app.get('/api/loans/:id', auth, (req: AuthedRequest, res: Response) => {
  const loan = currentUser(req).loans.find((l) => l.id === req.params.id);
  if (!loan) return res.status(404).json({ error: 'Loan not found' });
  res.json({ loan });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Bank backend listening on http://localhost:${PORT}`);
});
