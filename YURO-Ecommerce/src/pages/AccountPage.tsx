import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Heart,
  LogOut,
  Package,
  ShieldCheck,
  ShoppingBag,
  Store,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { formatOrderDate } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { RequireAuth } from '../components/RequireAuth';
import { ThemeMenu } from '../components/ThemeMenu';

const roleLabels = {
  customer: 'Customer',
  seller: 'Seller',
  admin: 'Administrator',
};

function AccountContent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  if (!user) return null;

  const firstName = user.fullName.trim().split(/\s+/)[0] || 'there';
  const memberSince = formatOrderDate(user.createdAt);

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logout();
      navigate('/');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <section className="page-section shell account-page">
      <PageHeader
        eyebrow="Your account"
        title={
          <>
            Hello, {firstName}<span>.</span>
          </>
        }
        description="Your profile, saved pieces, orders and marketplace access in one place."
        actions={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void signOut()}
            disabled={signingOut}
          >
            <LogOut size={15} />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        }
      />

      <div className="account-layout">
        <article className="account-card account-profile-card">
          <div className="account-profile-head">
            <span className="account-profile-avatar" aria-hidden="true">
              {user.fullName
                .split(/\s+/)
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase() || '')
                .join('')}
            </span>
            <div>
              <h2>{user.fullName}</h2>
              <p>{user.email}</p>
            </div>
          </div>

          <dl className="account-facts">
            <div>
              <dt>Role</dt>
              <dd>
                <span className={`role-pill role-${user.role}`}>
                  {roleLabels[user.role]}
                </span>
              </dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{memberSince}</dd>
            </div>
            <div>
              <dt>Account ID</dt>
              <dd>YURO-{String(user.id).padStart(4, '0')}</dd>
            </div>
            {user.role === 'seller' && user.shop && (
              <div>
                <dt>Shop</dt>
                <dd>{user.shop.name}</dd>
              </div>
            )}
          </dl>
        </article>

        <nav className="account-card account-shortcuts" aria-label="Account links">
          <h2>Your account</h2>
          <Link to="/orders">
            <Package size={17} />
            <span>
              <strong>My orders</strong>
              <small>Order history and delivery progress</small>
            </span>
            <ArrowRight size={14} />
          </Link>
          <Link to="/wishlist">
            <Heart size={17} />
            <span>
              <strong>Saved pieces</strong>
              <small>Pieces kept on this device</small>
            </span>
            <ArrowRight size={14} />
          </Link>
          <Link to="/cart">
            <ShoppingBag size={17} />
            <span>
              <strong>Shopping bag</strong>
              <small>Review your current selection</small>
            </span>
            <ArrowRight size={14} />
          </Link>
          <Link to="/shops">
            <Store size={17} />
            <span>
              <strong>Marketplace shops</strong>
              <small>Browse every approved seller</small>
            </span>
            <ArrowRight size={14} />
          </Link>

          {user.role === 'customer' && (
            <Link to="/become-a-seller">
              <Store size={17} />
              <span>
                <strong>Become a seller</strong>
                <small>Apply to open your own shop</small>
              </span>
              <ArrowRight size={14} />
            </Link>
          )}

          {user.role === 'seller' && (
            <Link to="/seller">
              <Store size={17} />
              <span>
                <strong>Seller dashboard</strong>
                <small>Products, orders and shop settings</small>
              </span>
              <ArrowRight size={14} />
            </Link>
          )}

          {user.role === 'admin' && (
            <Link to="/admin">
              <ShieldCheck size={17} />
              <span>
                <strong>Administration</strong>
                <small>Applications, shops and marketplace settings</small>
              </span>
              <ArrowRight size={14} />
            </Link>
          )}
        </nav>

        <article className="account-card account-appearance">
          <div>
            <h2>Appearance</h2>
            <p>
              Choose a light, dark or system theme. Your selection follows you
              across every route.
            </p>
          </div>
          <ThemeMenu />
          <p className="account-appearance-note">
            <UserRound size={13} />
            Theme and motion preferences are saved in this browser.
          </p>
        </article>
      </div>
    </section>
  );
}

export function AccountPage() {
  return (
    <RequireAuth
      title="Sign in to your account"
      description="Your YURO account keeps orders, saved pieces and seller access in one place."
    >
      <AccountContent />
    </RequireAuth>
  );
}
