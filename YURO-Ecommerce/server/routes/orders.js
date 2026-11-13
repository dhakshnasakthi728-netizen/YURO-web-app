import crypto from 'node:crypto';
import { Router } from 'express';
import { db, getPublicSettings } from '../db.js';
import { requireAuth } from '../auth.js';
import { randomReference } from '../passwords.js';
import { serializeOrder } from '../serializers.js';
import {
  ApiError,
  emailAddress,
  phoneNumber,
  postalCode,
  requiredText,
} from '../validation.js';
import {
  addOrderEvent,
  calculateTotals,
} from '../orders.js';

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

function referenceFor(prefix) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const reference = randomReference(prefix);
    const exists = db
      .prepare('SELECT id FROM orders WHERE reference = ?')
      .get(reference);
    if (!exists) return reference;
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${crypto
    .randomBytes(2)
    .toString('hex')
    .toUpperCase()}`;
}

ordersRouter.get('/', (req, res) => {
  const rows = db
    .prepare(
      'SELECT * FROM orders WHERE customer_user_id = ? ORDER BY id DESC LIMIT 100',
    )
    .all(req.user.id);
  res.json({
    orders: rows.map((row) => serializeOrder(row, { includeEvents: false })),
  });
});

ordersRouter.get('/:reference', (req, res, next) => {
  try {
    const row = db
      .prepare(
        'SELECT * FROM orders WHERE reference = ? AND customer_user_id = ?',
      )
      .get(String(req.params.reference).trim(), req.user.id);
    if (!row) throw new ApiError(404, 'Order not found.');
    res.json({ order: serializeOrder(row) });
  } catch (error) {
    next(error);
  }
});

ordersRouter.post('/', (req, res, next) => {
  let transactionOpen = false;
  try {
    const idempotencyKey = requiredText(
      req.body?.idempotencyKey,
      'Idempotency key',
      8,
      120,
    );

    const existing = db
      .prepare(
        'SELECT * FROM orders WHERE customer_user_id = ? AND idempotency_key = ?',
      )
      .get(req.user.id, idempotencyKey);
    if (existing) {
      res.json({
        order: serializeOrder(existing),
        duplicate: true,
      });
      return;
    }

    const rawItems = Array.isArray(req.body?.items) ? req.body.items : [];
    if (rawItems.length === 0 || rawItems.length > 50) {
      throw new ApiError(422, 'Your bag is empty or contains too many items.');
    }

    const merged = new Map();
    for (const raw of rawItems) {
      const productId = Number(raw?.productId);
      const quantity = Number(raw?.quantity);
      if (!Number.isInteger(productId) || productId < 1) {
        throw new ApiError(422, 'Your bag contains an invalid product.');
      }
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        throw new ApiError(422, 'Choose a quantity between 1 and 99.');
      }
      merged.set(productId, Math.min(99, (merged.get(productId) || 0) + quantity));
    }

    const fullName = requiredText(
      req.body?.contact?.fullName,
      'Full name',
      2,
      120,
    );
    const email = emailAddress(req.body?.contact?.email);
    const phone = phoneNumber(req.body?.contact?.phone);
    const address = requiredText(
      req.body?.shippingAddress?.address,
      'Street address',
      5,
      250,
    );
    const city = requiredText(req.body?.shippingAddress?.city, 'City', 2, 100);
    const state = requiredText(
      req.body?.shippingAddress?.state,
      'State or region',
      2,
      100,
    );
    const postCode = postalCode(req.body?.shippingAddress?.postalCode);
    const country = requiredText(
      req.body?.shippingAddress?.country,
      'Country',
      2,
      100,
    );

    if (req.body?.paymentMethod && req.body.paymentMethod !== 'cod') {
      throw new ApiError(
        422,
        'Cash on delivery is the only payment method currently available.',
      );
    }

    const settings = getPublicSettings();
    const promoInput = String(req.body?.promoCode || '')
      .trim()
      .toUpperCase();
    if (promoInput && promoInput !== String(settings.promoCode).toUpperCase()) {
      throw new ApiError(422, 'That promo code is not recognised.');
    }

    db.exec('BEGIN IMMEDIATE');
    transactionOpen = true;

    const resolvedItems = [];
    for (const [productId, quantity] of merged) {
      const product = db
        .prepare(
          `SELECT p.*, s.name AS shop_name, s.slug AS shop_slug
           FROM products p
           JOIN shops s ON s.id = p.shop_id
           WHERE p.id = ? AND p.active = 1 AND s.status = 'approved'`,
        )
        .get(productId);
      if (!product) {
        throw new ApiError(409, 'A product in your bag is no longer available.');
      }
      if (product.stock < quantity) {
        throw new ApiError(
          409,
          `Only ${product.stock} of ${product.name} ${
            product.stock === 1 ? 'is' : 'are'
          } available.`,
        );
      }
      resolvedItems.push({
        ...product,
        quantity,
        lineTotal: product.price * quantity,
      });
    }

    const totals = calculateTotals(resolvedItems, settings, promoInput);
    const reference = referenceFor('YR');
    const timestamp = new Date().toISOString();

    const orderResult = db
      .prepare(
        `INSERT INTO orders
          (reference, customer_user_id, full_name, email, phone, address, city, state,
           postal_code, country, payment_method, payment_status, status, promo_code,
           subtotal, discount, shipping, total, idempotency_key, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cod', 'pending', 'placed', ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        reference,
        req.user.id,
        fullName,
        email,
        phone,
        address,
        city,
        state,
        postCode,
        country,
        totals.promoCode,
        totals.subtotal,
        totals.discount,
        totals.shipping,
        totals.total,
        idempotencyKey,
        timestamp,
        timestamp,
      );

    const orderId = Number(orderResult.lastInsertRowid);
    const groupsByShop = new Map();

    for (const item of resolvedItems) {
      if (!groupsByShop.has(item.shop_id)) {
        const groupResult = db
          .prepare(
            `INSERT INTO order_groups
              (order_id, shop_id, shop_name, shop_slug, status, updated_at)
             VALUES (?, ?, ?, ?, 'placed', ?)`,
          )
          .run(
            orderId,
            item.shop_id,
            item.shop_name,
            item.shop_slug,
            timestamp,
          );
        groupsByShop.set(item.shop_id, {
          id: Number(groupResult.lastInsertRowid),
          name: item.shop_name,
        });
      }
      const group = groupsByShop.get(item.shop_id);

      db.prepare(
        `INSERT INTO order_items
          (order_id, order_group_id, product_id, shop_id, name, category, image,
           unit_price, quantity, line_total, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        orderId,
        group.id,
        item.id,
        item.shop_id,
        item.name,
        item.category,
        item.image,
        item.price,
        item.quantity,
        item.lineTotal,
        timestamp,
      );

      db.prepare(
        'UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?',
      ).run(item.quantity, timestamp, item.id);
    }

    addOrderEvent(
      orderId,
      null,
      'placed',
      'Order placed. Payment is due on delivery.',
      req.user.id,
    );
    for (const [shopId, group] of groupsByShop) {
      addOrderEvent(
        orderId,
        group.id,
        'placed',
        `${group.name} received the order.`,
        req.user.id,
      );
      void shopId;
    }

    db.exec('COMMIT');
    transactionOpen = false;

    const order = db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .get(orderId);
    res.status(201).json({ order: serializeOrder(order), duplicate: false });
  } catch (error) {
    if (transactionOpen) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // The transaction may already have been closed by SQLite.
      }
    }

    if (error?.code === 'ERR_SQLITE_ERROR' && /UNIQUE/i.test(error.message)) {
      const existing = db
        .prepare(
          'SELECT * FROM orders WHERE customer_user_id = ? AND idempotency_key = ?',
        )
        .get(req.user.id, String(req.body?.idempotencyKey || ''));
      if (existing) {
        res.json({ order: serializeOrder(existing), duplicate: true });
        return;
      }
    }
    next(error);
  }
});
