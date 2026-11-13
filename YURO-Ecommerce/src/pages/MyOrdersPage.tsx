import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Package,
  RefreshCw,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, ApiError } from '../lib/api';
import { formatOrderDate, formatPrice } from '../lib/format';
import { PAYMENT_STATUS_LABELS } from '../lib/orders';
import type { Order } from '../types';
import { PageHeader } from '../components/PageHeader';
import { OrderStatusBadge } from '../components/OrderStatus';
import { RequireAuth } from '../components/RequireAuth';
import { SafeImage } from '../components/SafeImage';

function OrderCard({ order }: { order: Order }) {
  const images = order.items.slice(0, 4);
  const extra = order.items.length - images.length;
  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <article className="order-card">
      <div className="order-card-head">
        <div>
          <p className="eyebrow">Order</p>
          <h2>{order.reference}</h2>
          <span className="order-date">{formatOrderDate(order.createdAt)}</span>
        </div>
        <div className="order-card-status">
          <OrderStatusBadge status={order.status} />
          <span className="payment-mini">
            {PAYMENT_STATUS_LABELS[order.paymentStatus]}
          </span>
        </div>
      </div>

      <div className="order-card-body">
        <div className="order-thumbnails" aria-hidden="true">
          {images.map((item) => (
            <SafeImage
              key={item.id}
              src={item.image}
              alt=""
              className="order-thumb"
              sizes="64px"
            />
          ))}
          {extra > 0 && <span className="order-thumb-more">+{extra}</span>}
        </div>

        <div className="order-card-items">
          <p>
            {order.items
              .slice(0, 2)
              .map((item) => item.name)
              .join(', ')}
            {order.items.length > 2 ? ` and ${order.items.length - 2} more` : ''}
          </p>
          <span>
            {itemCount} {itemCount === 1 ? 'piece' : 'pieces'} ·{' '}
            {order.groups.length}{' '}
            {order.groups.length === 1 ? 'shop' : 'shops'}
          </span>
        </div>

        <div className="order-card-total">
          <span>Total</span>
          <strong>{formatPrice(order.total)}</strong>
        </div>

        <Link
          to={`/orders/${order.reference}`}
          className="btn btn-ghost order-card-link"
        >
          View order
          <ArrowRight size={15} />
        </Link>
      </div>

      <div className="order-group-strip">
        {order.groups.map((group) => (
          <span key={group.id} className="order-group-chip">
            <Store size={12} />
            {group.shopName}
            <OrderStatusBadge status={group.status} />
          </span>
        ))}
      </div>
    </article>
  );
}

function OrdersList() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.orders.list();
      setOrders(result.orders);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not load your orders. Try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, user?.id]);

  return (
    <section className="page-section shell">
      <PageHeader
        eyebrow="Your account"
        title={
          <>
            Order history<span>.</span>
          </>
        }
        description="Every order placed with your account, across every shop in the marketplace."
        actions={
          <Link className="btn btn-ghost" to="/shop">
            <ShoppingBag size={15} />
            Continue shopping
          </Link>
        }
      />

      {loading ? (
        <div className="orders-loading" role="status">
          {[0, 1, 2].map((item) => (
            <div className="order-skeleton" key={item}>
              <span />
              <span />
              <span />
            </div>
          ))}
          <span className="sr-only">Loading orders…</span>
        </div>
      ) : error ? (
        <div className="empty-state glass">
          <span className="empty-icon" aria-hidden="true">
            <Package size={24} />
          </span>
          <h2>Orders could not be loaded</h2>
          <p>{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => void load()}>
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="empty-state glass orders-empty">
          <span className="empty-icon" aria-hidden="true">
            <Package size={26} />
          </span>
          <h2>No orders yet</h2>
          <p>
            When you place an order, it will appear here with its order number,
            payment status and delivery progress.
          </p>
          <Link className="btn btn-primary" to="/shop">
            Explore the marketplace
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          <div className="orders-summary-line">
            <span>
              {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </span>
            <button type="button" className="text-link" onClick={() => void load()}>
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
          <div className="orders-list">
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

export function MyOrdersPage() {
  return (
    <RequireAuth
      title="Sign in to see your orders"
      description="Order history follows your account, so it is available on any device after sign-in."
    >
      <OrdersList />
    </RequireAuth>
  );
}
