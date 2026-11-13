import {
  Ban,
  Check,
  CircleDot,
  PackageCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { OrderStatus as OrderStatusType, PaymentStatus } from '../types';
import {
  FULFILMENT_STEPS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  orderProgressIndex,
} from '../lib/orders';

const statusIcons: Record<OrderStatusType, LucideIcon> = {
  placed: CircleDot,
  confirmed: Check,
  processing: PackageCheck,
  shipped: Truck,
  delivered: PackageCheck,
  cancelled: Ban,
};

export function OrderStatusBadge({
  status,
  label,
}: {
  status: OrderStatusType | PaymentStatus | string;
  label?: string;
}) {
  return (
    <span className={`status-badge status-${status}`}>
      <span aria-hidden="true" />
      {label ||
        ORDER_STATUS_LABELS[status as OrderStatusType] ||
        PAYMENT_STATUS_LABELS[status as PaymentStatus] ||
        status}
    </span>
  );
}

export function OrderTimeline({
  status,
  compact = false,
}: {
  status: OrderStatusType;
  compact?: boolean;
}) {
  const activeIndex = orderProgressIndex(status);
  const cancelled = status === 'cancelled';

  if (cancelled) {
    return (
      <div className="order-cancelled-note">
        <Ban size={16} />
        <div>
          <strong>Order cancelled</strong>
          <span>This order will not be fulfilled. Any stock is released.</span>
        </div>
      </div>
    );
  }

  return (
    <ol
      className={`order-timeline${compact ? ' is-compact' : ''}`}
      aria-label={`Order progress: ${ORDER_STATUS_LABELS[status]}`}
    >
      {FULFILMENT_STEPS.map((step, index) => {
        const Icon = statusIcons[step];
        const complete = index < activeIndex;
        const active = index === activeIndex;
        return (
          <li
            key={step}
            className={`${complete ? 'is-complete' : ''}${
              active ? ' is-active' : ''
            }`}
          >
            <span className="timeline-marker" aria-hidden="true">
              {complete ? <Check size={13} /> : <Icon size={13} />}
            </span>
            <span className="timeline-copy">
              <strong>{ORDER_STATUS_LABELS[step]}</strong>
              {active && <span>Current stage</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
