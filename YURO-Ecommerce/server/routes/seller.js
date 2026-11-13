import { Router } from 'express';
import { db, slugify } from '../db.js';
import { requireRole } from '../auth.js';
import { serializeProduct, serializeSellerOrder, serializeShop } from '../serializers.js';
import {
  ApiError,
  categoryValue,
  emailAddress,
  idValue,
  imageUrl,
  optionalImageUrl,
  priceValue,
  requiredText,
  stockValue,
} from '../validation.js';
import {
  FULFILMENT_STATUSES,
  addOrderEvent,
  recomputeOrderStatus,
  updateGroupStatus,
} from '../orders.js';

export const sellerRouter = Router();
sellerRouter.use(requireRole('seller'));

function ownShop(req) {
  const shop = db
    .prepare('SELECT * FROM shops WHERE owner_user_id = ?')
    .get(req.user.id);
  if (!shop) throw new ApiError(404, 'Seller shop not found.');
  return shop;
}

function requireApprovedShop(req) {
  const shop = ownShop(req);
  if (shop.status !== 'approved') {
    throw new ApiError(403, 'Your shop is suspended. Contact YURO support.');
  }
  return shop;
}

function productSelect(whereClause) {
  return `SELECT p.*, s.name AS shop_name, s.slug AS shop_slug, s.status AS shop_status
          FROM products p JOIN shops s ON s.id = p.shop_id
          WHERE ${whereClause}`;
}

function uniqueProductSlug(name, ignoreId = null) {
  const base = slugify(name) || `piece-${Date.now().toString(36)}`;
  let candidate = base;
  let counter = 1;
  while (true) {
    const row = ignoreId
      ? db
          .prepare('SELECT id FROM products WHERE slug = ? AND id != ?')
          .get(candidate, ignoreId)
      : db.prepare('SELECT id FROM products WHERE slug = ?').get(candidate);
    if (!row) return candidate;
    counter += 1;
    candidate = `${base}-${counter}`.slice(0, 90);
  }
}

function productPayload(body) {
  return {
    name: requiredText(body?.name, 'Product name', 2, 120),
    category: categoryValue(body?.category),
    price: priceValue(body?.price),
    image: imageUrl(body?.image, 'Product image'),
    description: requiredText(body?.description, 'Description', 10, 1200),
    stock: stockValue(body?.stock),
    active:
      typeof body?.active === 'boolean' ? (body.active ? 1 : 0) : 1,
  };
}

sellerRouter.get('/shop', (req, res, next) => {
  try {
    res.json({ shop: serializeShop(ownShop(req)) });
  } catch (error) {
    next(error);
  }
});

sellerRouter.patch('/shop', (req, res, next) => {
  try {
    const shop = requireApprovedShop(req);
    const name = requiredText(req.body?.name, 'Shop name', 3, 80);
    const description = requiredText(
      req.body?.description,
      'Shop description',
      20,
      1200,
    );
    const category = categoryValue(req.body?.category);
    const contactEmail = emailAddress(req.body?.contactEmail, 'Contact email');
    const contactPhone = requiredText(
      req.body?.contactPhone,
      'Contact phone',
      7,
      30,
    );
    const logoUrl = optionalImageUrl(req.body?.logoUrl, 'Logo');
    const bannerUrl = optionalImageUrl(req.body?.bannerUrl, 'Banner');
    const timestamp = new Date().toISOString();

    db.prepare(
      `UPDATE shops
       SET name = ?, description = ?, category = ?, contact_email = ?,
           contact_phone = ?, logo_url = ?, banner_url = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      name,
      description,
      category,
      contactEmail,
      contactPhone,
      logoUrl,
      bannerUrl,
      timestamp,
      shop.id,
    );

    res.json({
      shop: serializeShop(db.prepare('SELECT * FROM shops WHERE id = ?').get(shop.id)),
    });
  } catch (error) {
    next(error);
  }
});

sellerRouter.get('/products', (req, res, next) => {
  try {
    const shop = ownShop(req);
    const rows = db
      .prepare(
        `${productSelect('p.shop_id = ?')} ORDER BY p.created_at DESC, p.id DESC`,
      )
      .all(shop.id);
    res.json({ products: rows.map(serializeProduct) });
  } catch (error) {
    next(error);
  }
});

sellerRouter.post('/products', (req, res, next) => {
  try {
    const shop = requireApprovedShop(req);
    const payload = productPayload(req.body);
    const timestamp = new Date().toISOString();
    const slug = uniqueProductSlug(payload.name);

    const result = db
      .prepare(
        `INSERT INTO products
          (shop_id, name, slug, category, price, image, description, featured,
           new_arrival, stock, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?, ?)`,
      )
      .run(
        shop.id,
        payload.name,
        slug,
        payload.category,
        payload.price,
        payload.image,
        payload.description,
        payload.stock,
        payload.active,
        timestamp,
        timestamp,
      );

    const row = db
      .prepare(productSelect('p.id = ?'))
      .get(Number(result.lastInsertRowid));
    res.status(201).json({ product: serializeProduct(row) });
  } catch (error) {
    next(error);
  }
});

sellerRouter.patch('/products/:id', (req, res, next) => {
  try {
    const shop = requireApprovedShop(req);
    const id = idValue(req.params.id);
    const existing = db
      .prepare('SELECT * FROM products WHERE id = ? AND shop_id = ?')
      .get(id, shop.id);
    if (!existing) throw new ApiError(404, 'Product not found.');

    const payload = productPayload(req.body);
    const slug =
      payload.name === existing.name
        ? existing.slug
        : uniqueProductSlug(payload.name, id);
    const timestamp = new Date().toISOString();

    db.prepare(
      `UPDATE products
       SET name = ?, slug = ?, category = ?, price = ?, image = ?,
           description = ?, stock = ?, active = ?, updated_at = ?
       WHERE id = ? AND shop_id = ?`,
    ).run(
      payload.name,
      slug,
      payload.category,
      payload.price,
      payload.image,
      payload.description,
      payload.stock,
      payload.active,
      timestamp,
      id,
      shop.id,
    );

    res.json({
      product: serializeProduct(
        db.prepare(productSelect('p.id = ?')).get(id),
      ),
    });
  } catch (error) {
    next(error);
  }
});

sellerRouter.delete('/products/:id', (req, res, next) => {
  try {
    const shop = requireApprovedShop(req);
    const id = idValue(req.params.id);
    const existing = db
      .prepare('SELECT id FROM products WHERE id = ? AND shop_id = ?')
      .get(id, shop.id);
    if (!existing) throw new ApiError(404, 'Product not found.');

    db.prepare(
      'UPDATE products SET active = 0, updated_at = ? WHERE id = ?',
    ).run(new Date().toISOString(), id);
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

sellerRouter.get('/orders', (req, res, next) => {
  try {
    const shop = ownShop(req);
    const rows = db
      .prepare(
        `SELECT o.*, og.id AS group_id, og.status AS group_status,
                og.updated_at AS group_updated_at
         FROM order_groups og
         JOIN orders o ON o.id = og.order_id
         WHERE og.shop_id = ?
         ORDER BY o.id DESC
         LIMIT 100`,
      )
      .all(shop.id);

    const orders = rows.map((row) => {
      const group = db
        .prepare('SELECT * FROM order_groups WHERE id = ?')
        .get(row.group_id);
      return serializeSellerOrder(row, group);
    });
    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

sellerRouter.patch('/order-groups/:id/status', (req, res, next) => {
  try {
    const shop = requireApprovedShop(req);
    const groupId = idValue(req.params.id);
    const group = db
      .prepare('SELECT * FROM order_groups WHERE id = ? AND shop_id = ?')
      .get(groupId, shop.id);
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
        : `Seller updated fulfilment to ${nextStatus}.`,
      allowedStatuses: FULFILMENT_STATUSES,
    });

    const order = db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .get(group.order_id);
    const updatedGroup = db
      .prepare('SELECT * FROM order_groups WHERE id = ?')
      .get(groupId);
    res.json({ order: serializeSellerOrder(order, updatedGroup) });
  } catch (error) {
    next(error);
  }
});
