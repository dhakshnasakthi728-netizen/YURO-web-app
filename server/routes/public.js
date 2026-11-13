import { Router } from 'express';
import { db, getPublicSettings } from '../db.js';
import { serializeProduct, serializeShop } from '../serializers.js';
import { ApiError, idValue } from '../validation.js';

export const publicRouter = Router();

const PRODUCT_SELECT = `
  SELECT p.*, s.name AS shop_name, s.slug AS shop_slug, s.status AS shop_status
  FROM products p
  JOIN shops s ON s.id = p.shop_id
`;

publicRouter.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'yuro-marketplace' });
});

publicRouter.get('/settings', (_req, res) => {
  res.json({ settings: getPublicSettings() });
});

publicRouter.get('/products', (_req, res) => {
  const products = db
    .prepare(
      `${PRODUCT_SELECT}
       WHERE p.active = 1 AND s.status = 'approved'
       ORDER BY p.featured DESC, p.new_arrival DESC, p.id ASC`,
    )
    .all()
    .map(serializeProduct);
  res.json({ products });
});

publicRouter.get('/products/:id', (req, res, next) => {
  try {
    const id = idValue(req.params.id);
    const row = db
      .prepare(
        `${PRODUCT_SELECT}
         WHERE p.id = ? AND p.active = 1 AND s.status = 'approved'`,
      )
      .get(id);
    if (!row) throw new ApiError(404, 'Product not found.');
    res.json({ product: serializeProduct(row) });
  } catch (error) {
    next(error);
  }
});

publicRouter.get('/shops', (_req, res) => {
  const shops = db
    .prepare(
      `SELECT s.*, u.full_name AS owner_name,
              (SELECT COUNT(*) FROM products p
               WHERE p.shop_id = s.id AND p.active = 1) AS product_count
       FROM shops s
       LEFT JOIN users u ON u.id = s.owner_user_id
       WHERE s.status = 'approved'
       ORDER BY s.id ASC`,
    )
    .all()
    .map((row) => ({
      ...serializeShop(row),
      contactEmail: undefined,
      contactPhone: undefined,
    }));
  res.json({ shops });
});

publicRouter.get('/shops/:slug', (req, res, next) => {
  try {
    const slug = String(req.params.slug || '').trim();
    const shopRow = db
      .prepare(
        `SELECT s.*, u.full_name AS owner_name
         FROM shops s
         LEFT JOIN users u ON u.id = s.owner_user_id
         WHERE s.slug = ? AND s.status = 'approved'`,
      )
      .get(slug);
    if (!shopRow) throw new ApiError(404, 'Shop not found.');

    const products = db
      .prepare(
        `${PRODUCT_SELECT}
         WHERE p.shop_id = ? AND p.active = 1 AND s.status = 'approved'
         ORDER BY p.featured DESC, p.new_arrival DESC, p.id ASC`,
      )
      .all(shopRow.id)
      .map(serializeProduct);

    res.json({
      shop: {
        ...serializeShop(shopRow),
        contactEmail: undefined,
        contactPhone: undefined,
      },
      products,
    });
  } catch (error) {
    next(error);
  }
});
