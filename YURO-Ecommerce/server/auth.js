import crypto from 'node:crypto';
import { db } from './db.js';
import {
  SESSION_COOKIE,
  SESSION_DAYS,
} from './config.js';

const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function parseCookies(cookieHeader = '') {
  const cookies = {};
  for (const part of cookieHeader.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(value);
    } catch {
      cookies[key] = value;
    }
  }
  return cookies;
}

function cookieFlags(req) {
  const secure =
    process.env.COOKIE_SECURE === 'true' ||
    (req?.secure === true && process.env.COOKIE_SECURE !== 'false');
  return `${secure ? '; Secure' : ''}; HttpOnly; SameSite=Lax; Path=/`;
}

export function issueSession(res, userId, req) {
  const token = crypto.randomBytes(32).toString('base64url');
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + SESSION_MS);

  db.prepare(
    `INSERT INTO sessions (id, user_id, created_at, expires_at, user_agent, ip_address)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    hashToken(token),
    userId,
    createdAt.toISOString(),
    expiresAt.toISOString(),
    String(req.headers['user-agent'] || '').slice(0, 250),
    String(req.ip || req.socket?.remoteAddress || '').slice(0, 80),
  );

  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${Math.floor(
      SESSION_MS / 1000,
    )}${cookieFlags(req)}`,
  );
}

export function destroySession(req, res) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (token) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(hashToken(token));
  }
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Max-Age=0${cookieFlags(req)}`,
  );
}

function findSessionUser(token) {
  if (!token) return null;

  const row = db
    .prepare(
      `SELECT
         u.id, u.email, u.full_name, u.role, u.created_at,
         s.expires_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?`,
    )
    .get(hashToken(token));

  if (!row) return null;

  if (new Date(row.expires_at).getTime() <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(hashToken(token));
    return null;
  }

  const shop =
    row.role === 'seller'
      ? db
          .prepare(
            `SELECT id, slug, name, status, logo_url, banner_url
             FROM shops WHERE owner_user_id = ?`,
          )
          .get(row.id)
      : null;

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    createdAt: row.created_at,
    shop: shop
      ? {
          id: shop.id,
          slug: shop.slug,
          name: shop.name,
          status: shop.status,
          logoUrl: shop.logo_url,
          bannerUrl: shop.banner_url,
        }
      : null,
  };
}

export function authenticate(req, _res, next) {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  req.user = findSessionUser(token);
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    res.status(401).json({ error: 'Sign in to continue.' });
    return;
  }
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ error: 'Sign in to continue.' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'You do not have permission to do that.' });
      return;
    }
    next();
  };
}

export function verifyRequestOrigin(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (origin) {
    try {
      if (new URL(origin).hostname !== req.hostname) {
        res.status(403).json({ error: 'Origin not allowed.' });
        return;
      }
    } catch {
      res.status(403).json({ error: 'Origin not allowed.' });
      return;
    }
  }
  next();
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt,
    shop: user.shop || null,
  };
}

export function currentUser(req) {
  return req.user || null;
}
