import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import type { Role } from '../types';
import { AuthForm } from './AuthForm';
import { Brand } from './Brand';

type RequireAuthProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  allowRoles?: Role[];
};

export function RequireAuth({
  children,
  title = 'Sign in to continue',
  description = 'Your account keeps orders, applications and marketplace access in one place.',
  allowRoles,
}: RequireAuthProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <section className="page-section shell">
        <div className="page-loading" role="status" aria-label="Loading account">
          <span className="spinner" />
          <p>Checking your account…</p>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="page-section shell auth-page-section">
        <div className="auth-page-card">
          <div className="auth-page-intro">
            <Brand />
            <div>
              <p className="eyebrow">Your YURO account</p>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
            <span className="auth-page-lock">
              <LockKeyhole size={14} />
              Access is checked again on the server for every action.
            </span>
          </div>
          <div className="auth-page-form">
            <AuthForm onSuccess={() => undefined} />
          </div>
        </div>
      </section>
    );
  }

  if (allowRoles && !allowRoles.includes(user.role)) {
    const destination =
      user.role === 'admin'
        ? { to: '/admin', label: 'Open administration' }
        : user.role === 'seller'
          ? { to: '/seller', label: 'Open seller dashboard' }
          : { to: '/orders', label: 'Open my orders' };

    return (
      <section className="page-section shell">
        <div className="empty-state glass access-state">
          <span className="empty-icon" aria-hidden="true">
            <LockKeyhole size={24} />
          </span>
          <h1>This area is for a different account role</h1>
          <p>
            Your account is signed in as a {user.role}. The server will not
            allow actions outside that role.
          </p>
          <Link className="btn btn-primary" to={destination.to}>
            {destination.label}
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    );
  }

  return <>{children}</>;
}
