import { FormEvent, useEffect, useState } from 'react';
import { AccountKind, BankAccount, createAccount, getAccounts } from '../api';

export default function Accounts() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [kind, setKind] = useState<AccountKind>('checking');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function refresh() {
    const data = await getAccounts();
    setAccounts(data.accounts);
  }

  useEffect(() => {
    refresh().catch((e) => setError((e as Error).message));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const data = await createAccount({ kind, name });
      setSuccess(`Account "${data.account.name}" created.`);
      setName('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Your Accounts</h1>
        <table data-testid="accounts-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} data-testid={`account-row-${a.id}`}>
                <td data-testid={`account-name-${a.id}`}>{a.name}</td>
                <td data-testid={`account-kind-${a.id}`}>{a.kind}</td>
                <td data-testid={`account-balance-${a.id}`}>${a.balance.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="card">
        <h2>Open a New Account</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="account-kind">Account type</label>
          <select
            id="account-kind"
            data-testid="new-account-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as AccountKind)}
          >
            <option value="checking">Checking</option>
            <option value="savings">Savings</option>
          </select>
          <label htmlFor="account-name">Nickname</label>
          <input
            id="account-name"
            data-testid="new-account-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          {error && <div className="error" data-testid="new-account-error">{error}</div>}
          {success && (
            <div data-testid="new-account-success" style={{ color: '#00875a', margin: '8px 0' }}>
              {success}
            </div>
          )}
          <button type="submit" data-testid="new-account-submit">Open Account</button>
        </form>
      </div>
    </div>
  );
}
