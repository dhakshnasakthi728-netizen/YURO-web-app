import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  CheckCircle2,
  MapPin,
  Package,
  Store,
  User,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { formatDateTime, formatOrderDate, formatPrice } from '../lib/format';
import {
  ORDER_STATUS_DESCRIPTIONS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../lib/orders';
import type { Order } from '../types';
import { PageHeader } from '../components/PageHeader';
import { OrderStatusBadge, OrderTimeline } from '../components/OrderStatus';
import { RequireAuth } from '../components/RequireAuth';
import { SafeImage } from '../components/SafeImage';

function OrderDetailContent() {
  const { reference = '' } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const justPlaced = searchParams.get('placed') === '1';

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.orders.get(reference);
      setOrder(result.order);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not load that order. Try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="page-section shell">
        <div className="page-loading" role="status">
          <span className="spinner" />
          <p>Loading order…</p>
        </div>
      </section>
    );
  }

  if (error || !order) {
    return (
      <section className="page-section shell">
        <div className="empty-state glass">
          <span className="empty-icon" aria-hidden="true">
            <Package size={24} />
          </span>
          <h1>Order not available</h1>
          <p>
            {error ||
              'This order does not exist or does not belong to your account.'}
          </p>
          <Link className="btn btn-primary" to="/orders">
            <ArrowLeft size={15} />
            Back to my orders
          </Link>
        </div>
      </section>
    );
  }

  const itemCount = order.items.reduce((total, item) => total + item.quantity, 0);
  const eventList = [...order.events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <section className="page-section shell order-detail-page">
      {justPlaced && (
        <div className="order-confirmation-banner" role="status">
          <span className="confirmation-icon" aria-hidden="true">
            <CheckCircle2 size={24} />
          </span>
          <div>
            <p className="eyebrow">Order received</p>
            <h2>Thank you. Your order is confirmed.</h2>
            <p>
              Your order number is <strong>{order.reference}</strong>. Payment
              will be collected on delivery. You can follow each shop&apos;s
              progress here at any time.
            </p>
          </div>
        </div>
      )}

      <PageHeader
        eyebrow={`Placed ${formatOrderDate(order.createdAt)}`}
        title={
          <>
            {order.reference}<span>.</span>
          </>
        }
        description={ORDER_STATUS_DESCRIPTIONS[order.status]}
        actions={
          <Link className="btn btn-ghost" to="/orders">
            <ArrowLeft size={15} />
            All orders
          </Link>
        }
      />

      <div className="order-detail-grid">
        <div className="order-detail-main">
          <section className="detail-card glass">
            <div className="detail-card-head">
              <div>
                <p className="eyebrow">Delivery progress</p>
                <h2>{ORDER_STATUS_LABELS[order.status]}</h2>
              </div>
              <div className="detail-badges">
                <OrderStatusBadge status={order.status} />
                <OrderStatusBadge
                  status={order.paymentStatus}
                  label={PAYMENT_STATUS_LABELS[order.paymentStatus]}
                />
              </div>
            </div>
            <OrderTimeline status={order.status} />
          </section>

          <section className="detail-card glass">
            <div className="detail-card-head">
              <div>
                <p className="eyebrow">Fulfilment</p>
                <h2>
                  {order.groups.length === 1
                    ? 'Your shop'
                    : `${order.groups.length} independent shops`}
                </h2>
              </div>
              <span className="detail-note">
                Each shop updates its own part of this order.
              </span>
            </div>

            <div className="fulfilment-groups">
              {order.groups.map((group) => (
                <article className="fulfilment-group" key={group.id}>
                  <div className="fulfilment-group-head">
                    <div>
                      <Link to={`/shops/${group.shopSlug}`} className="shop-inline">
                        <Store size={14} />
                        {group.shopName}
                      </Link>
                      <small>Updated {formatDateTime(group.updatedAt)}</small>
                    </div>
                    <OrderStatusBadge status={group.status} />
                  </div>

                  <div className="fulfilment-items">
                    {group.items.map((item) => (
                      <div className="fulfilment-item" key={item.id}>
                        <SafeImage
                          src={item.image}
                          alt={item.name}
                          className="fulfilment-img"
                          sizes="64px"
                        />
                        <div>
                          <p>{item.name}</p>
                          <span>
                            {formatPrice(item.unitPrice)} × {item.quantity}
                          </span>
                        </div>
                        <strong>{formatPrice(item.lineTotal)}</strong>
                      </div>
                    ))}
                  </div>

                  {group.events.length > 0 && (
                    <div className="group-events">
                      {[...group.events]
                        .sort(
                          (a, b) =>
                            new Date(b.createdAt).getTime() -
                            new Date(a.createdAt).getTime(),
                        )
                        .slice(0, 4)
                        .map((event) => (
                          <div className="group-event" key={event.id}>
                            <span aria-hidden="true" />
                            <p>{event.note}</p>
                            <time dateTime={event.createdAt}>
                              {formatDateTime(event.createdAt)}
                            </time>
                          </div>
                        ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="detail-card glass">
            <div className="detail-card-head">
              <div>
                <p className="eyebrow">Delivery details</p>
                <h2>Shipping and contact</h2>
              </div>
            </div>
            <div className="detail-two-col">
              <div className="detail-address">
                <h3>
                  <MapPin size={15} />
                  Shipping address
                </h3>
                <p>
                  {order.customer.fullName}
                  <br />
                  {order.shippingAddress.address}
                  <br />
                  {order.shippingAddress.city}, {order.shippingAddress.state}{' '}
                  {order.shippingAddress.postalCode}
                  <br />
                  {order.shippingAddress.country}
                </p>
              </div>
              <div className="detail-address">
                <h3>
                  <User size={15} />
                  Contact
                </h3>
                <p>
                  {order.customer.email}
                  <br />
                  {order.customer.phone}
                </p>
              </div>
            </div>
          </section>

          {eventList.length > 0 && (
            <section className="detail-card glass">
              <div className="detail-card-head">
                <div>
                  <p className="eyebrow">Activity</p>
                  <h2>Order updates</h2>
                </div>
              </div>
              <ol className="event-log">
                {eventList.slice(0, 8).map((event) => (
                  <li key={event.id}>
                    <span className="event-dot" aria-hidden="true" />
                    <div>
                      <strong>
                        {ORDER_STATUS_LABELS[
                          event.status as keyof typeof ORDER_STATUS_LABELS
                        ] || event.status}
                      </strong>
                      <p>{event.note}</p>
                    </div>
                    <time dateTime={event.createdAt}>
                      {formatDateTime(event.createdAt)}
                    </time>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>

        <aside className="order-summary-panel glass" aria-label="Order total">
          <div className="summary-head">
            <h2>Order total</h2>
            <span>
              {itemCount} {itemCount === 1 ? 'piece' : 'pieces'}
            </span>
          </div>

          <div className="order-summary-payment">
            <Banknote size={17} />
            <div>
              <strong>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</strong>
              <span>Cash on delivery</span>
            </div>
          </div>

          <div className="summary-totals">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="summary-row summary-discount">
                <span>Promotion {order.promoCode && `(${order.promoCode})`}</span>
                <span>−{formatPrice(order.discount)}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Shipping</span>
              <span>
                {order.shipping === 0
                  ? 'Complimentary'
                  : formatPrice(order.shipping)}
              </span>
            </div>
            <div className="summary-row summary-total">
              <span>Total</span>
              <strong>{formatPrice(order.total)}</strong>
            </div>
          </div>

          <p className="summary-note">
            This total was calculated and recorded by the marketplace server when
            the order was placed.
          </p>

          <Link className="btn btn-primary" to="/shop">
            Continue shopping
            <ArrowRight size={16} />
          </Link>
        </aside>
      </div>
    </section>
  );
}

export function OrderDetailPage() {
  return (
    <RequireAuth
      title="Sign in to view this order"
      description="Order details are tied to your account and are not stored in editable browser storage."
    >
      <OrderDetailContent />
    </RequireAuth>
  );
}
