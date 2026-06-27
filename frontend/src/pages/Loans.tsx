import { FormEvent, useEffect, useState } from 'react';
import { LoanApplication, createLoan, getLoans } from '../api';

export default function Loans() {
  const [loans, setLoans] = useState<LoanApplication[]>([]);
  const [amount, setAmount] = useState('');
  const [termMonths, setTermMonths] = useState('36');
  const [purpose, setPurpose] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function refresh() {
    const data = await getLoans();
    setLoans(data.loans);
  }

  useEffect(() => {
    refresh().catch((e) => setError((e as Error).message));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const data = await createLoan({
        amount: Number(amount),
        termMonths: Number(termMonths),
        purpose,
      });
      setSuccess(`Loan application ${data.loan.id} submitted — status: ${data.loan.status}.`);
      setAmount('');
      setPurpose('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Apply for a Loan</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="loan-amount">Loan amount</label>
          <input
            id="loan-amount"
            data-testid="loan-amount"
            type="number"
            step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <label htmlFor="loan-term">Term (months)</label>
          <select
            id="loan-term"
            data-testid="loan-term"
            value={termMonths}
            onChange={(e) => setTermMonths(e.target.value)}
          >
            <option value="12">12</option>
            <option value="24">24</option>
            <option value="36">36</option>
            <option value="48">48</option>
            <option value="60">60</option>
          </select>
          <label htmlFor="loan-purpose">Purpose</label>
          <input
            id="loan-purpose"
            data-testid="loan-purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
          />
          {error && <div className="error" data-testid="loan-error">{error}</div>}
          {success && (
            <div data-testid="loan-success" style={{ color: '#00875a', margin: '8px 0' }}>
              {success}
            </div>
          )}
          <button type="submit" data-testid="loan-submit">Submit Application</button>
        </form>
      </div>
      <div className="card">
        <h2>Your Applications</h2>
        <table data-testid="loans-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Amount</th>
              <th>Term</th>
              <th>Purpose</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((l) => (
              <tr key={l.id} data-testid={`loan-row-${l.id}`}>
                <td data-testid={`loan-id-${l.id}`}>{l.id}</td>
                <td>${l.amount.toFixed(2)}</td>
                <td>{l.termMonths} mo</td>
                <td>{l.purpose}</td>
                <td data-testid={`loan-status-${l.id}`}>{l.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
