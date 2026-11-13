import { db } from './db.js';

export const ORDER_STATUSES = [
  'placed',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export const FULFILMENT_STATUSES = [
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

export function calculateTotals(items, settings, promoCode = '') {
  const subtotal = items.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  );
  const normalizedPromo = String(promoCode || '').trim().toUpperCase();
  const validPromo =
    normalizedPromo &&
    normalizedPromo === String(settings.promoCode || '').toUpperCase();
  const discount = validPromo
    ? Math.round(subtotal * Number(settings.promoRate || 0))
    : 0;
  const discountedSubtotal = Math.max(0, subtotal - discount);
  const shipping =
    items.length === 0 ||
    discountedSubtotal >= Number(settings.freeShippingThreshold || 3500)
      ? 0
      : Number(settings.shippingFee || 149);

  return {
    subtotal,
    discount,
    shipping,
    total: discountedSubtotal + shipping,
    promoCode: validPromo ? normalizedPromo : '',
  };
}

export function deriveOrderStatus(groupStatuses) {
  if (groupStatuses.length === 0) return 'placed';
  if (groupStatuses.every((status) => status === 'cancelled')) {
    return 'cancelled';
  }
  if (
    groupStatuses.every(
      (status) => status === 'delivered' || status === 'cancelled',
    )
  ) {
    return 'delivered';
  }
  if (groupStatuses.some((status) => status === 'shipped')) {
    return 'shipped';
  }
  if (groupStatuses.some((status) => status === 'processing')) {
    return 'processing';
  }
  if (groupStatuses.some((status) => status === 'confirmed')) {
    return 'confirmed';
  }
  return 'placed';
}

export function addOrderEvent(
  orderId,
  groupId,
  status,
  note,
  actorUserId = null,
) {
  db.prepare(
    `INSERT INTO order_events
       (order_id, group_id, status, note, actor_user_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    orderId,
    groupId,
    status,
    String(note || '').slice(0, 500),
    actorUserId,
    new Date().toISOString(),
  );
}

export function recomputeOrderStatus(orderId, actorUserId = null) {
  const groups = db
    .prepare('SELECT status FROM order_groups WHERE order_id = ?')
    .all(orderId);
  const nextStatus = deriveOrderStatus(groups.map((group) => group.status));
  const current = db
    .prepare('SELECT status FROM orders WHERE id = ?')
    .get(orderId);

  if (current && current.status !== nextStatus) {
    db.prepare(
      'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
    ).run(nextStatus, new Date().toISOString(), orderId);
    addOrderEvent(
      orderId,
      null,
      nextStatus,
      `Overall order status updated to ${nextStatus}.`,
      actorUserId,
    );
  }
  return nextStatus;
}

export function restockCancelledGroup(groupId) {
  const group = db
    .prepare('SELECT * FROM order_groups WHERE id = ?')
    .get(groupId);
  if (!group || group.status !== 'cancelled' || group.restocked) return;

  const items = db
    .prepare(
      'SELECT product_id, quantity FROM order_items WHERE order_group_id = ?',
    )
    .all(groupId);
  const update = db.prepare(
    'UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?',
  );
  const timestamp = new Date().toISOString();
  for (const item of items) {
    update.run(item.quantity, timestamp, item.product_id);
  }
  db.prepare('UPDATE order_groups SET restocked = 1 WHERE id = ?').run(groupId);
}

export function updateGroupStatus({
  group,
  nextStatus,
  actorUserId,
  note,
  allowedStatuses,
}) {
  if (!allowedStatuses.includes(nextStatus)) {
    const error = new Error('That fulfilment status is not permitted.');
    error.status = 403;
    throw error;
  }
  if (group.status === 'delivered' || group.status === 'cancelled') {
    const error = new Error(
      'Completed or cancelled fulfilment groups cannot be changed.',
    );
    error.status = 409;
    throw error;
  }

  const timestamp = new Date().toISOString();
  db.prepare(
    'UPDATE order_groups SET status = ?, updated_at = ? WHERE id = ?',
  ).run(nextStatus, timestamp, group.id);

  addOrderEvent(
    group.order_id,
    group.id,
    nextStatus,
    note || `Fulfilment status updated to ${nextStatus}.`,
    actorUserId,
  );

  if (nextStatus === 'cancelled') {
    restockCancelledGroup(group.id);
  }

  const overallStatus = recomputeOrderStatus(group.order_id, actorUserId);
  return overallStatus;
}
