import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import type { CartItem, Order } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Checkout } from '../components/Checkout';
import { RequireAuth } from '../components/RequireAuth';

type CheckoutPageProps = {
  cart: CartItem[];
  onOrderComplete: (order: Order) => void;
  onRequireAuth: () => void;
};

function CheckoutContent({
  cart,
  onOrderComplete,
  onRequireAuth,
}: CheckoutPageProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  if (cart.length === 0) {
    return (
      <section className="page-section shell">
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            <ShoppingBag size={26} />
          </span>
          <h1>Your bag is empty</h1>
          <p>Add a piece to your bag before starting checkout.</p>
          <Link className="btn btn-primary" to="/shop">
            Explore the collection
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <Checkout
      page
      cart={cart}
      user={user}
      onClose={() => navigate('/cart')}
      onOrderComplete={onOrderComplete}
      onRequireAuth={onRequireAuth}
    />
  );
}

export function CheckoutPage(props: CheckoutPageProps) {
  return (
    <RequireAuth
      title="Sign in to check out"
      description="Your account keeps the order, delivery address and cash-on-delivery record in one place."
    >
      <CheckoutContent {...props} />
    </RequireAuth>
  );
}
