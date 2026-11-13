import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ChevronDown,
  LogOut,
  Package,
  ShieldCheck,
  Store,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type AccountMenuProps = {
  onOpenAuth: () => void;
  onSignedOut: () => void;
  onNavigate?: () => void;
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

const roleLabels = {
  customer: 'Customer',
  seller: 'Seller',
  admin: 'Administrator',
};

export function AccountMenu({
  onOpenAuth,
  onSignedOut,
  onNavigate,
}: AccountMenuProps) {
  const { user, loading, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        containerRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (loading) {
    return (
      <span className="account-skeleton" aria-label="Loading account">
        <span />
      </span>
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        className="account-signin"
        onClick={onOpenAuth}
        aria-label="Sign in to your account"
        title="Sign in"
      >
        <UserRound size={17} />
        <span>Sign in</span>
      </button>
    );
  }

  const close = () => {
    setOpen(false);
    onNavigate?.();
  };

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      setOpen(false);
      onSignedOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="account-menu" ref={containerRef}>
      <button
        type="button"
        className={`account-trigger${
          location.pathname === '/account' ? ' is-active' : ''
        }`}
        aria-expanded={open}
        aria-controls="account-panel"
        aria-haspopup="dialog"
        aria-label={`Account menu for ${user.fullName}`}
        title="Account menu"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="account-avatar" aria-hidden="true">
          {initials(user.fullName)}
        </span>
        <span className="account-trigger-copy">
          <small>{roleLabels[user.role]}</small>
          <strong>{user.fullName.split(' ')[0]}</strong>
        </span>
        <ChevronDown size={14} aria-hidden="true" />
      </button>

      {open && (
        <div
          className="account-panel"
          id="account-panel"
          role="dialog"
          aria-label="Account menu"
        >
          <div className="account-panel-head">
            <span className="account-avatar large" aria-hidden="true">
              {initials(user.fullName)}
            </span>
            <div>
              <strong>{user.fullName}</strong>
              <span>{user.email}</span>
            </div>
            <span className={`role-pill role-${user.role}`}>
              {roleLabels[user.role]}
            </span>
          </div>

          <nav className="account-links" aria-label="Account">
            <Link to="/account" onClick={close}>
              <UserRound size={16} />
              My account
            </Link>

            <Link to="/orders" onClick={close}>
              <Package size={16} />
              My orders
            </Link>

            {user.role === 'customer' && (
              <Link to="/become-a-seller" onClick={close}>
                <Store size={16} />
                Become a seller
              </Link>
            )}

            {user.role === 'seller' && (
              <Link to="/seller" onClick={close}>
                <Store size={16} />
                Seller dashboard
              </Link>
            )}

            {user.role === 'admin' && (
              <Link to="/admin" onClick={close}>
                <ShieldCheck size={16} />
                Administration
              </Link>
            )}
          </nav>

          {user.role === 'seller' && user.shop?.status === 'suspended' && (
            <p className="account-warning">
              Your shop is suspended. Listing and fulfilment updates are paused.
            </p>
          )}

          <button
            type="button"
            className="account-signout"
            onClick={() => void signOut()}
            disabled={signingOut}
          >
            <LogOut size={15} />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}
