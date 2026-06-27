import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Account from './pages/Account';
import Accounts from './pages/Accounts';
import Transactions from './pages/Transactions';
import Transfer from './pages/Transfer';
import Settings from './pages/Settings';
import Payments from './pages/Payments';
import Loans from './pages/Loans';
import { isLoggedIn, logout } from './api';

function RequireAuth({ children }: { children: JSX.Element }) {
  return isLoggedIn() ? children : <Navigate to="/login" replace />;
}

function Nav() {
  const navigate = useNavigate();
  if (!isLoggedIn()) return null;
  return (
    <nav>
      <NavLink to="/account" data-testid="nav-account">Account</NavLink>
      <NavLink to="/accounts" data-testid="nav-accounts">Accounts</NavLink>
      <NavLink to="/transactions" data-testid="nav-transactions">Transactions</NavLink>
      <NavLink to="/transfer" data-testid="nav-transfer">Transfer</NavLink>
      <NavLink to="/payments" data-testid="nav-payments">Payments</NavLink>
      <NavLink to="/loans" data-testid="nav-loans">Loans</NavLink>
      <NavLink to="/settings" data-testid="nav-settings">Settings</NavLink>
      <div className="spacer" />
      <a
        href="#"
        data-testid="logout"
        onClick={(e) => {
          e.preventDefault();
          logout();
          navigate('/login');
        }}
      >
        Logout
      </a>
    </nav>
  );
}

export default function App() {
  return (
    <>
      <Nav />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/account" element={<RequireAuth><Account /></RequireAuth>} />
        <Route path="/accounts" element={<RequireAuth><Accounts /></RequireAuth>} />
        <Route path="/transactions" element={<RequireAuth><Transactions /></RequireAuth>} />
        <Route path="/transfer" element={<RequireAuth><Transfer /></RequireAuth>} />
        <Route path="/payments" element={<RequireAuth><Payments /></RequireAuth>} />
        <Route path="/loans" element={<RequireAuth><Loans /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="*" element={<Navigate to={isLoggedIn() ? '/account' : '/login'} replace />} />
      </Routes>
    </>
  );
}
