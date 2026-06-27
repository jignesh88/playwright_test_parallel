import { FormEvent, useEffect, useState } from 'react';
import { BankAccount, PaymentType, createPayment, getAccounts } from '../api';

export default function Payments() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [fromAccountId, setFromAccountId] = useState('');
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('ach');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function refresh() {
    const data = await getAccounts();
    setAccounts(data.accounts);
    if (!fromAccountId && data.accounts[0]) setFromAccountId(data.accounts[0].id);
  }

  useEffect(() => {
    refresh().catch((e) => setError((e as Error).message));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const result = await createPayment({
        fromAccountId,
        payee,
        amount: Number(amount),
        paymentType,
      });
      setSuccess(`Payment sent. New balance: $${result.balance.toFixed(2)}`);
      setPayee('');
      setAmount('');
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>Pay a Bill</h1>
        <form onSubmit={handleSubmit}>
          <label htmlFor="payment-from">From</label>
          <select
            id="payment-from"
            data-testid="payment-from"
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} (${a.balance.toFixed(2)})
              </option>
            ))}
          </select>
          <label htmlFor="payment-payee">Payee</label>
          <input
            id="payment-payee"
            data-testid="payment-payee"
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
            required
          />
          <label htmlFor="payment-amount">Amount</label>
          <input
            id="payment-amount"
            data-testid="payment-amount"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <label htmlFor="payment-type">Payment type</label>
          <select
            id="payment-type"
            data-testid="payment-type"
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value as PaymentType)}
          >
            <option value="ach">ACH</option>
            <option value="card">Card</option>
            <option value="wire">Wire</option>
          </select>
          {error && <div className="error" data-testid="payment-error">{error}</div>}
          {success && (
            <div data-testid="payment-success" style={{ color: '#00875a', margin: '8px 0' }}>
              {success}
            </div>
          )}
          <button type="submit" data-testid="payment-submit">Send Payment</button>
        </form>
      </div>
    </div>
  );
}
