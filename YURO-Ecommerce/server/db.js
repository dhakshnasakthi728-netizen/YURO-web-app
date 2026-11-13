import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { DATABASE_PATH, ROOT_DIR, UPLOADS_DIR } from './config.js';
import { hashPassword } from './passwords.js';

const catalogPath = path.join(ROOT_DIR, 'shared', 'catalog.json');
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export const db = new DatabaseSync(DATABASE_PATH);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'seller', 'admin')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT
  );

  CREATE TABLE IF NOT EXISTS shops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    logo_url TEXT NOT NULL DEFAULT '',
    banner_url TEXT NOT NULL DEFAULT '',
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'suspended')),
    owner_user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS seller_applications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    shop_name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    website_url TEXT NOT NULL DEFAULT '',
    logo_url TEXT NOT NULL DEFAULT '',
    banner_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT NOT NULL DEFAULT '',
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_id INTEGER NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE COLLATE NOCASE,
    category TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0),
    image TEXT NOT NULL,
    description TEXT NOT NULL,
    featured INTEGER NOT NULL DEFAULT 0,
    new_arrival INTEGER NOT NULL DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference TEXT NOT NULL UNIQUE,
    customer_user_id INTEGER NOT NULL REFERENCES users(id),
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cod',
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
    status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    promo_code TEXT NOT NULL DEFAULT '',
    subtotal INTEGER NOT NULL,
    discount INTEGER NOT NULL,
    shipping INTEGER NOT NULL,
    total INTEGER NOT NULL,
    idempotency_key TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (customer_user_id, idempotency_key)
  );

  CREATE TABLE IF NOT EXISTS order_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shop_id INTEGER NOT NULL REFERENCES shops(id),
    shop_name TEXT NOT NULL,
    shop_slug TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'placed' CHECK (status IN ('placed', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
    restocked INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    UNIQUE (order_id, shop_id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_group_id INTEGER NOT NULL REFERENCES order_groups(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL,
    shop_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    image TEXT NOT NULL,
    unit_price INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    line_total INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    group_id INTEGER REFERENCES order_groups(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_products_shop ON products(shop_id);
  CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_order_groups_shop ON order_groups(shop_id);
  CREATE INDEX IF NOT EXISTS idx_applications_user ON seller_applications(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
`);

const now = () => new Date().toISOString();

function insertSettings() {
  const defaults = {
    freeShippingThreshold: '3500',
    shippingFee: '149',
    promoCode: 'YURO10',
    promoRate: '0.1',
    applicationsOpen: 'true',
    marketplaceName: 'YURO',
  };
  const statement = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
  );
  for (const [key, value] of Object.entries(defaults)) statement.run(key, value);
}

function seedHouseShop() {
  let shop = db
    .prepare('SELECT * FROM shops WHERE slug = ?')
    .get('yuro-studio');
  if (!shop) {
    db.prepare(
      `INSERT INTO shops
        (slug, name, description, category, contact_email, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'approved', ?, ?)`,
    ).run(
      'yuro-studio',
      'YURO Studio',
      'The house edit: considered objects chosen by the YURO studio for a quieter everyday.',
      'CURATED',
      'studio@yuro.local',
      now(),
      now(),
    );
    shop = db.prepare('SELECT * FROM shops WHERE slug = ?').get('yuro-studio');
  }

  const productCount = db
    .prepare('SELECT COUNT(*) AS count FROM products WHERE shop_id = ?')
    .get(shop.id).count;

  if (productCount === 0) {
    const insert = db.prepare(
      `INSERT OR IGNORE INTO products
        (id, shop_id, name, slug, category, price, image, description, featured, new_arrival, stock, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 50, 1, ?, ?)`,
    );
    for (const product of catalog) {
      insert.run(
        product.id,
        shop.id,
        product.name,
        slugify(product.name),
        product.category,
        product.price,
        product.image,
        product.description,
        product.featured ? 1 : 0,
        product.newArrival ? 1 : 0,
        now(),
        now(),
      );
    }
  }

  return shop;
}

export function slugify(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function seedAdministrator() {
  const existing = db
    .prepare("SELECT id, email FROM users WHERE role = 'admin' LIMIT 1")
    .get();
  if (existing) return existing;

  const email = (process.env.ADMIN_EMAIL || 'admin@yuro.local')
    .trim()
    .toLowerCase();
  const providedPassword = process.env.ADMIN_PASSWORD;
  const password =
    providedPassword || crypto.randomBytes(12).toString('base64url');
  const timestamp = now();

  const alreadyRegistered = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(email);

  if (alreadyRegistered) {
    db.prepare(
      "UPDATE users SET role = 'admin', password_hash = ?, updated_at = ? WHERE id = ?",
    ).run(hashPassword(password), timestamp, alreadyRegistered.id);
  } else {
    db.prepare(
      `INSERT INTO users (email, password_hash, full_name, role, created_at, updated_at)
       VALUES (?, ?, ?, 'admin', ?, ?)`,
    ).run(
      email,
      hashPassword(password),
      'YURO Administrator',
      timestamp,
      timestamp,
    );
  }

  console.log('');
  console.log('  YURO administrator account');
  console.log(`  Email:    ${email}`);
  if (providedPassword) {
    console.log('  Password: provided through ADMIN_PASSWORD');
  } else {
    console.log(`  Password: ${password}`);
    console.log(
      '  Set ADMIN_EMAIL and ADMIN_PASSWORD before the first run to choose your own credentials.',
    );
  }
  console.log('');

  return { email };
}

insertSettings();
seedHouseShop();
seedAdministrator();

db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now());

export function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row?.value;
}

export function getPublicSettings() {
  return {
    freeShippingThreshold: Number(getSetting('freeShippingThreshold') || 3500),
    shippingFee: Number(getSetting('shippingFee') || 149),
    promoCode: getSetting('promoCode') || 'YURO10',
    promoRate: Number(getSetting('promoRate') || 0.1),
    applicationsOpen: getSetting('applicationsOpen') !== 'false',
    marketplaceName: getSetting('marketplaceName') || 'YURO',
  };
}
