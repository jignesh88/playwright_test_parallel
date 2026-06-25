import { useEffect, useState } from 'react';
import { getAccount } from '../api';

type AccountInfo = { username: string; fullName: string; balance: number };

export default function Account() {
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAccount()
      .then(setAccount)
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <div className="container"><div className="card error">{error}</div></div>;
  if (!account) return <div className="container"><div className="card">Loading…</div></div>;

  return (
    <div className="container">
      <div className="card">
        <h1>Account</h1>
        <p>Welcome, <strong data-testid="account-name">{account.fullName}</strong></p>
        <p>Username: <span data-testid="account-username">{account.username}</span></p>
      </div>
      <div className="card">
        <h2>Total Balance</h2>
        <div className="balance" data-testid="account-balance">
          ${account.balance.toFixed(2)}
        </div>
      </div>
    </div>
  );
}
