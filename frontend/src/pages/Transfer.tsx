import { FormEvent, useEffect, useState } from 'react';
import { BankAccount, createTransfer, getAccounts } from '../api';

export default function Transfer() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function refresh() {
    const data = await getAccounts();
    setAccounts(data.accounts);
    if (!fromAccountId && data.accounts[0]) setFromAccountId(data.accounts[0].id);
    if (!toAccountId && data.accounts[1]) setToAccountId(data.accounts[1].id);
  }

  useEffect(() => {
    refresh().catch((e) => setError((e as Error).message));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const result = await createTransfer({
        fromAccountId,
        toAccountId,
        amount: Number(amount),
        memo,
      });
      setSuccess(
        `Transferred $${Number(amount).toFixed(2)} — ${result.from.name}: $${result.from.balance.toFixed(2)}, ${result.to.name}: $${result.to.balance.toFixed(2)}`
      );
      setAmount('');
      setMemo('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Transfer Between Accounts</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="from">From</label>
          <select
            id="from"
            data-testid="transfer-from"
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} (${a.balance.toFixed(2)})
              </option>
            ))}
          </select>
          <label htmlFor="to">To</label>
          <select
            id="to"
            data-testid="transfer-to"
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} (${a.balance.toFixed(2)})
              </option>
            ))}
          </select>
          <label htmlFor="transfer-amount">Amount</label>
          <input
            id="transfer-amount"
            data-testid="transfer-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <label htmlFor="memo">Memo (optional)</label>
          <input
            id="memo"
            data-testid="transfer-memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
          {error && <div className="error" data-testid="transfer-error">{error}</div>}
          {success && (
            <div data-testid="transfer-success" style={{ color: '#00875a', margin: '8px 0' }}>
              {success}
            </div>
          )}
          <button type="submit" data-testid="transfer-submit">Transfer</button>
        </form>
      </div>
    </div>
  );
}
