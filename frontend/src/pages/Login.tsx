import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(username, password);
      navigate('/account');
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="container">
      <div className="card">
        <h1>RetailFlow Bank</h1>
        <p>Sign in to your account. Demo: <code>demo / password123</code></p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="username">Username</label>
          <input
            id="username"
            data-testid="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            data-testid="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          {error && <div className="error" data-testid="login-error">{error}</div>}
          <button type="submit" data-testid="login-submit">Sign in</button>
        </form>
      </div>
    </div>
  );
}
