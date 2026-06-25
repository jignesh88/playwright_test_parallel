import { FormEvent, useEffect, useState } from 'react';
import { createTransaction, getTransactions } from '../api';

type Transaction = {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  balanceAfter: number;
};

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [type, setType] = useState<'credit' | 'debit'>('credit');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function refresh() {
    const data = await getTransactions();
    setTransactions(data.transactions);
  }

  useEffect(() => {
    refresh().catch((e) => setError((e as Error).message));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const result = await createTransaction({
        type,
        amount: Number(amount),
        description,
      });
      setSuccess(`Transaction posted. New balance: $${result.balance.toFixed(2)}`);
      setAmount('');
      setDescription('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>New Transaction</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="type">Type</label>
          <select
            id="type"
            data-testid="tx-type"
            value={type}
            onChange={(e) => setType(e.target.value as 'credit' | 'debit')}
          >
            <option value="credit">Credit (Deposit)</option>
            <option value="debit">Debit (Withdraw)</option>
          </select>
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            data-testid="tx-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <label htmlFor="description">Description</label>
          <input
            id="description"
            data-testid="tx-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          {error && <div className="error" data-testid="tx-error">{error}</div>}
          {success && <div data-testid="tx-success" style={{ color: '#00875a', margin: '8px 0' }}>{success}</div>}
          <button type="submit" data-testid="tx-submit">Post Transaction</button>
        </form>
      </div>
      <div className="card">
        <h2>History</h2>
        <table data-testid="tx-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} data-testid={`tx-row-${t.id}`}>
                <td>{new Date(t.date).toLocaleString()}</td>
                <td className={t.type}>{t.type}</td>
                <td>{t.description}</td>
                <td className={t.type}>
                  {t.type === 'credit' ? '+' : '-'}${t.amount.toFixed(2)}
                </td>
                <td>${t.balanceAfter.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
