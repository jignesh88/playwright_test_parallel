import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'demo-secret-key-not-for-production';
const PORT = Number(process.env.PORT) || 4100;

type Transaction = {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  balanceAfter: number;
};

type Account = {
  username: string;
  password: string;
  fullName: string;
  balance: number;
  transactions: Transaction[];
};

const accounts: Record<string, Account> = {
  demo: {
    username: 'demo',
    password: 'password123',
    fullName: 'Demo User',
    balance: 1000,
    transactions: [
      {
        id: 't0',
        type: 'credit',
        amount: 1000,
        description: 'Opening balance',
        date: new Date('2026-01-01').toISOString(),
        balanceAfter: 1000,
      },
    ],
  },
};

interface AuthedRequest extends Request {
  user?: { username: string };
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
  const account = accounts[username];
  if (!account || account.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token, fullName: account.fullName });
});

app.get('/api/account', auth, (req: AuthedRequest, res: Response) => {
  const account = accounts[req.user!.username];
  res.json({
    username: account.username,
    fullName: account.fullName,
    balance: account.balance,
  });
});

app.get('/api/transactions', auth, (req: AuthedRequest, res: Response) => {
  const account = accounts[req.user!.username];
  res.json({ transactions: account.transactions });
});

app.post('/api/transactions', auth, (req: AuthedRequest, res: Response) => {
  const { type, amount, description } = req.body ?? {};
  if (type !== 'credit' && type !== 'debit') {
    return res.status(400).json({ error: 'type must be credit or debit' });
  }
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.status(400).json({ error: 'amount must be a positive number' });
  }
  const account = accounts[req.user!.username];
  if (type === 'debit' && account.balance < numericAmount) {
    return res.status(400).json({ error: 'Insufficient funds' });
  }
  account.balance += type === 'credit' ? numericAmount : -numericAmount;
  const tx: Transaction = {
    id: `t${account.transactions.length}`,
    type,
    amount: numericAmount,
    description: String(description ?? '').slice(0, 120),
    date: new Date().toISOString(),
    balanceAfter: account.balance,
  };
  account.transactions.unshift(tx);
  res.status(201).json({ transaction: tx, balance: account.balance });
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Bank backend listening on http://localhost:${PORT}`);
});
