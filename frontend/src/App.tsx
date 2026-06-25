import { Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Account from './pages/Account';
import Transactions from './pages/Transactions';
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
      <NavLink to="/transactions" data-testid="nav-transactions">Transactions</NavLink>
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
        <Route
          path="/account"
          element={
            <RequireAuth>
              <Account />
            </RequireAuth>
          }
        />
        <Route
          path="/transactions"
          element={
            <RequireAuth>
              <Transactions />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to={isLoggedIn() ? '/account' : '/login'} replace />} />
      </Routes>
    </>
  );
}
