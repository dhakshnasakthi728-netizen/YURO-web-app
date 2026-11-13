import { Router } from 'express';
import { db, getPublicSettings, slugify } from '../db.js';
import { requireRole } from '../auth.js';
import {
  serializeApplication,
  serializeOrder,
  serializeProduct,
  serializeShop,
} from '../serializers.js';
import {
  ApiError,
  categoryValue,
  idValue,
  imageUrl,
  oneOf,
  priceValue,
  requiredText,
  stockValue,
} from '../validation.js';
import {
  FULFILMENT_STATUSES,
  addOrderEvent,
  updateGroupStatus,
} from '../orders.js';

export const adminRouter = Router();
adminRouter.use(requireRole('admin'));

function uniqueShopSlug(name) {
  const base = slugify(name) || `shop-${Date.now().toString(36)}`;
  let candidate = base;
  let counter = 1;
  while (db.prepare('SELECT id FROM shops WHERE slug = ?').get(candidate)) {
    counter += 1;
    candidate = `${base}-${counter}`.slice(0, 90);
  }
  return candidate;
}

function uniqueProductSlug(name, ignoreId) {
  const base = slugify(name) || `piece-${Date.now().toString(36)}`;
  let candidate = base;
  let counter = 1;
  while (true) {
    const row = db
      .prepare('SELECT id FROM products WHERE slug = ? AND id != ?')
      .get(candidate, ignoreId);
    if (!row) return candidate;
    counter += 1;
    candidate = `${base}-${counter}`.slice(0, 90);
  }
}

adminRouter.get('/stats', (_req, res) => {
  const stats = {
    applicationsPending: db
      .prepare(
        "SELECT COUNT(*) AS count FROM seller_applications WHERE status = 'pending'",
      )
      .get().count,
    shopsApproved: db
      .prepare("SELECT COUNT(*) AS count FROM shops WHERE status = 'approved'")
      .get().count,
    shopsSuspended: db
      .prepare("SELECT COUNT(*) AS count FROM shops WHERE status = 'suspended'")
      .get().count,
    productsActive: db
      .prepare('SELECT COUNT(*) AS count FROM products WHERE active = 1')
      .get().count,
    ordersTotal: db.prepare('SELECT COUNT(*) AS count FROM orders').get().count,
    ordersOpen: db
      .prepare(
        "SELECT COUNT(*) AS count FROM orders WHERE status NOT IN ('delivered', 'cancelled')",
      )
      .get().count,
    grossOrderValue: db
      .prepare(
        "SELECT COALESCE(SUM(total), 0) AS total FROM orders WHERE status != 'cancelled'",
      )
      .get().total,
    customers: db
      .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'customer'")
      .get().count,
    sellers: db
      .prepare("SELECT COUNT(*) AS count FROM users WHERE role = 'seller'")
      .get().count,
  };
  res.json({ stats });
});

/* Seller applications -------------------------------------------------- */

adminRouter.get('/applications', (req, res) => {
  const status = String(req.query.status || '').trim();
  const rows =
    status && ['pending', 'approved', 'rejected'].includes(status)
      ? db
          .prepare(
            `SELECT a.*, u.full_name AS applicant_name, u.email AS applicant_email
             FROM seller_applications a
             JOIN users u ON u.id = a.user_id
             WHERE a.status = ?
             ORDER BY a.id DESC`,
          )
          .all(status)
      : db
          .prepare(
            `SELECT a.*, u.full_name AS applicant_name, u.email AS applicant_email
             FROM seller_applications a
             JOIN users u ON u.id = a.user_id
             ORDER BY a.id DESC`,
          )
          .all();
  res.json({ applications: rows.map(serializeApplication) });
});

adminRouter.post('/applications/:id/approve', (req, res, next) => {
  let transactionOpen = false;
  try {
    const id = idValue(req.params.id);
    const application = db
      .prepare(
        `SELECT a.*, u.role AS applicant_role
         FROM seller_applications a
         JOIN users u ON u.id = a.user_id
         WHERE a.id = ?`,
      )
      .get(id);
    if (!application) throw new ApiError(404, 'Application not found.');
    if (application.status !== 'pending') {
      throw new ApiError(409, 'This application has already been reviewed.');
    }
    if (application.applicant_role !== 'customer') {
      throw new ApiError(409, 'This applicant is no longer a customer account.');
    }

    const existingShop = db
      .prepare('SELECT id FROM shops WHERE owner_user_id = ?')
      .get(application.user_id);
    if (existingShop) {
      throw new ApiError(409, 'This applicant already owns a shop.');
    }

    db.exec('BEGIN IMMEDIATE');
    transactionOpen = true;

    const timestamp = new Date().toISOString();
    const shopSlug = uniqueShopSlug(application.shop_name);
    const shopResult = db
      .prepare(
        `INSERT INTO shops
          (slug, name, description, category, logo_url, banner_url, contact_email,
           contact_phone, status, owner_user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved', ?, ?, ?)`,
      )
      .run(
        shopSlug,
        application.shop_name,
        application.description,
        application.category,
        application.logo_url,
        application.banner_url,
        application.contact_email,
        application.contact_phone,
        application.user_id,
        timestamp,
        timestamp,
      );

    db.prepare(
      "UPDATE users SET role = 'seller', updated_at = ? WHERE id = ?",
    ).run(timestamp, application.user_id);

    db.prepare(
      `UPDATE seller_applications
       SET status = 'approved', reviewed_by = ?, reviewed_at = ?
       WHERE id = ?`,
    ).run(req.user.id, timestamp, id);

    db.exec('COMMIT');
    transactionOpen = false;

    const reviewed = db
      .prepare(
        `SELECT a.*, u.full_name AS applicant_name, u.email AS applicant_email
         FROM seller_applications a
         JOIN users u ON u.id = a.user_id
         WHERE a.id = ?`,
      )
      .get(id);
    const shop = db
      .prepare('SELECT * FROM shops WHERE id = ?')
      .get(Number(shopResult.lastInsertRowid));

    res.json({
      application: serializeApplication(reviewed),
      shop: serializeShop(shop),
    });
  } catch (error) {
    if (transactionOpen) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // Ignore a transaction that has already closed.
      }
    }
    next(error);
  }
});

adminRouter.post('/applications/:id/reject', (req, res, next) => {
  try {
    const id = idValue(req.params.id);
    const application = db
      .prepare('SELECT * FROM seller_applications WHERE id = ?')
      .get(id);
    if (!application) throw new ApiError(404, 'Application not found.');
    if (application.status !== 'pending') {
      throw new ApiError(409, 'This application has already been reviewed.');
    }

    const reason = requiredText(
      req.body?.reason,
      'Rejection reason',
      5,
      500,
    );
    const timestamp = new Date().toISOString();
    db.prepare(
      `UPDATE seller_applications
       SET status = 'rejected', rejection_reason = ?, reviewed_by = ?, reviewed_at = ?
       WHERE id = ?`,
    ).run(reason, req.user.id, timestamp, id);

    const reviewed = db
      .prepare(
        `SELECT a.*, u.full_name AS applicant_name, u.email AS applicant_email
         FROM seller_applications a
         JOIN users u ON u.id = a.user_id
         WHERE a.id = ?`,
      )
      .get(id);
    res.json({ application: serializeApplication(reviewed) });
  } catch (error) {
    next(error);
  }
});

/* Shops --------------------------------------------------------------- */

adminRouter.get('/shops', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT s.*, u.full_name AS owner_name, u.email AS owner_email,
              (SELECT COUNT(*) FROM products p WHERE p.shop_id = s.id) AS product_count
       FROM shops s
       LEFT JOIN users u ON u.id = s.owner_user_id
       ORDER BY s.id ASC`,
    )
    .all();
  res.json({ shops: rows.map(serializeShop) });
});

adminRouter.patch('/shops/:id/status', (req, res, next) => {
  try {
    const id = idValue(req.params.id);
    const status = oneOf(
      String(req.body?.status || ''),
      ['approved', 'suspended'],
      'Shop status',
    );
    const shop = db.prepare('SELECT * FROM shops WHERE id = ?').get(id);
    if (!shop) throw new ApiError(404, 'Shop not found.');
    db.prepare(
      'UPDATE shops SET status = ?, updated_at = ? WHERE id = ?',
    ).run(status, new Date().toISOString(), id);
    res.json({
      shop: serializeShop(db.prepare('SELECT * FROM shops WHERE id = ?').get(id)),
    });
  } catch (error) {
    next(error);
  }
});

/* Products ------------------------------------------------------------ */

adminRouter.get('/products', (_req, res) => {
  const rows = db
    .prepare(
      `SELECT p.*, s.name AS shop_name, s.slug AS shop_slug, s.status AS shop_status
       FROM products p JOIN shops s ON s.id = p.shop_id
       ORDER BY p.id DESC`,
    )
    .all();
  res.json({ products: rows.map(serializeProduct) });
});

adminRouter.patch('/products/:id', (req, res, next) => {
  try {
    const id = idValue(req.params.id);
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!product) throw new ApiError(404, 'Product not found.');

    const next = {
      name: req.body?.name == null
        ? product.name
        : requiredText(req.body.name, 'Product name', 2, 120),
      category: req.body?.category == null
        ? product.category
        : categoryValue(req.body.category),
      price: req.body?.price == null
        ? product.price
        : priceValue(req.body.price),
      image: req.body?.image == null
        ? product.image
        : imageUrl(req.body.image, 'Product image'),
      description: req.body?.description == null
        ? product.description
        : requiredText(req.body.description, 'Description', 10, 1200),
      stock: req.body?.stock == null
        ? product.stock
        : stockValue(req.body.stock),
      active:
        typeof req.body?.active === 'boolean'
          ? req.body.active
            ? 1
            : 0
          : product.active,
      featured:
        typeof req.body?.featured === 'boolean'
          ? req.body.featured
            ? 1
            : 0
          : product.featured,
      newArrival:
        typeof req.body?.newArrival === 'boolean'
          ? req.body.newArrival
            ? 1
            : 0
          : product.new_arrival,
    };
    const slug =
      next.name === product.name
        ? product.slug
        : uniqueProductSlug(next.name, id);
    const timestamp = new Date().toISOString();

    db.prepare(
      `UPDATE products
       SET name = ?, slug = ?, category = ?, price = ?, image = ?, description = ?,
           stock = ?, active = ?, featured = ?, new_arrival = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      next.name,
      slug,
      next.category,
      next.price,
      next.image,
      next.description,
      next.stock,
      next.active,
      next.featured,
      next.newArrival,
      timestamp,
      id,
    );

    const row = db
      .prepare(
        `SELECT p.*, s.name AS shop_name, s.slug AS shop_slug, s.status AS shop_status
         FROM products p JOIN shops s ON s.id = p.shop_id
         WHERE p.id = ?`,
      )
      .get(id);
    res.json({ product: serializeProduct(row) });
  } catch (error) {
    next(error);
  }
});

/* Orders -------------------------------------------------------------- */

adminRouter.get('/orders', (req, res) => {
  const status = String(req.query.status || '').trim();
  const rows =
    status &&
    ['placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(
      status,
    )
      ? db
          .prepare('SELECT * FROM orders WHERE status = ? ORDER BY id DESC LIMIT 200')
          .all(status)
      : db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200').all();
  res.json({
    orders: rows.map((row) => serializeOrder(row, { includeEvents: false })),
  });
});

adminRouter.get('/orders/:reference', (req, res, next) => {
  try {
    const order = db
      .prepare('SELECT * FROM orders WHERE reference = ?')
      .get(String(req.params.reference).trim());
    if (!order) throw new ApiError(404, 'Order not found.');
    res.json({ order: serializeOrder(order) });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/orders/:id/payment', (req, res, next) => {
  try {
    const id = idValue(req.params.id);
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) throw new ApiError(404, 'Order not found.');
    const paymentStatus = oneOf(
      String(req.body?.paymentStatus || ''),
      ['pending', 'paid', 'refunded'],
      'Payment status',
    );
    const timestamp = new Date().toISOString();
    db.prepare(
      'UPDATE orders SET payment_status = ?, updated_at = ? WHERE id = ?',
    ).run(paymentStatus, timestamp, id);
    addOrderEvent(
      id,
      null,
      order.status,
      `Payment marked ${paymentStatus}.`,
      req.user.id,
    );
    const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    res.json({ order: serializeOrder(updated) });
  } catch (error) {
    next(error);
  }
});

adminRouter.patch('/order-groups/:id/status', (req, res, next) => {
  try {
    const id = idValue(req.params.id);
    const group = db.prepare('SELECT * FROM order_groups WHERE id = ?').get(id);
    if (!group) throw new ApiError(404, 'Fulfilment group not found.');
    const nextStatus = String(req.body?.status || '');
    if (!FULFILMENT_STATUSES.includes(nextStatus)) {
      throw new ApiError(422, 'Choose a valid fulfilment status.');
    }
    updateGroupStatus({
      group,
      nextStatus,
      actorUserId: req.user.id,
      note: req.body?.note
        ? String(req.body.note).slice(0, 300)
        : `Administrator updated fulfilment to ${nextStatus}.`,
      allowedStatuses: FULFILMENT_STATUSES,
    });
    const order = db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .get(group.order_id);
    res.json({ order: serializeOrder(order) });
  } catch (error) {
    next(error);
  }
});

/* Settings ------------------------------------------------------------ */

adminRouter.get('/settings', (_req, res) => {
  res.json({ settings: getPublicSettings() });
});

adminRouter.patch('/settings', (req, res, next) => {
  try {
    const updates = {};
    if (req.body?.freeShippingThreshold != null) {
      const value = Number(req.body.freeShippingThreshold);
      if (!Number.isInteger(value) || value < 0 || value > 10_000_000) {
        throw new ApiError(422, 'Enter a valid free-shipping threshold.');
      }
      updates.freeShippingThreshold = String(value);
    }
    if (req.body?.shippingFee != null) {
      const value = Number(req.body.shippingFee);
      if (!Number.isInteger(value) || value < 0 || value > 100_000) {
        throw new ApiError(422, 'Enter a valid shipping fee.');
      }
      updates.shippingFee = String(value);
    }
    if (req.body?.promoCode != null) {
      const code = requiredText(req.body.promoCode, 'Promo code', 3, 24)
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, '');
      if (!code) throw new ApiError(422, 'Enter a valid promo code.');
      updates.promoCode = code;
    }
    if (req.body?.promoRate != null) {
      const rate = Number(req.body.promoRate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 0.9) {
        throw new ApiError(422, 'Promo rate must be between 0 and 0.9.');
      }
      updates.promoRate = String(rate);
    }
    if (req.body?.applicationsOpen != null) {
      updates.applicationsOpen = req.body.applicationsOpen ? 'true' : 'false';
    }
    if (req.body?.marketplaceName != null) {
      updates.marketplaceName = requiredText(
        req.body.marketplaceName,
        'Marketplace name',
        2,
        40,
      );
    }

    const statement = db.prepare(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    );
    for (const [key, value] of Object.entries(updates)) {
      statement.run(key, value);
    }

    res.json({ settings: getPublicSettings() });
  } catch (error) {
    next(error);
  }
});
