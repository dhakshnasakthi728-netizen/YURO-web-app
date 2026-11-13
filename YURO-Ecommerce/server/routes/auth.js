import { Router } from 'express';
import { db } from '../db.js';
import {
  destroySession,
  issueSession,
  publicUser,
} from '../auth.js';
import { hashPassword, verifyPassword } from '../passwords.js';
import {
  ApiError,
  emailAddress,
  passwordValue,
  requiredText,
} from '../validation.js';

export const authRouter = Router();

const attempts = new Map();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function attemptKey(req, email) {
  return `${req.ip || req.socket?.remoteAddress || 'unknown'}:${email}`;
}

function tooManyAttempts(key) {
  const record = attempts.get(key);
  if (!record) return false;
  if (Date.now() - record.startedAt > WINDOW_MS) {
    attempts.delete(key);
    return false;
  }
  return record.count >= MAX_ATTEMPTS;
}

function recordFailure(key) {
  const record = attempts.get(key);
  if (!record || Date.now() - record.startedAt > WINDOW_MS) {
    attempts.set(key, { count: 1, startedAt: Date.now() });
    return;
  }
  record.count += 1;
}

authRouter.get('/me', (req, res) => {
  res.json({ user: publicUser(req.user) });
});

authRouter.post('/register', (req, res, next) => {
  try {
    const fullName = requiredText(req.body?.fullName, 'Full name', 2, 120);
    const email = emailAddress(req.body?.email);
    const password = passwordValue(req.body?.password);

    const existing = db
      .prepare('SELECT id FROM users WHERE email = ?')
      .get(email);
    if (existing) {
      throw new ApiError(
        409,
        'An account with this email already exists. Sign in instead.',
      );
    }

    const timestamp = new Date().toISOString();
    const result = db
      .prepare(
        `INSERT INTO users (email, password_hash, full_name, role, created_at, updated_at)
         VALUES (?, ?, ?, 'customer', ?, ?)`,
      )
      .run(email, hashPassword(password), fullName, timestamp, timestamp);

    const user = {
      id: Number(result.lastInsertRowid),
      email,
      fullName,
      role: 'customer',
      createdAt: timestamp,
      shop: null,
    };

    issueSession(res, user.id, req);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/login', (req, res, next) => {
  try {
    const email = emailAddress(req.body?.email);
    const password =
      typeof req.body?.password === 'string' ? req.body.password : '';
    const key = attemptKey(req, email);

    if (tooManyAttempts(key)) {
      throw new ApiError(
        429,
        'Too many sign-in attempts. Wait a few minutes and try again.',
      );
    }

    const row = db
      .prepare(
        'SELECT id, email, full_name, role, created_at, password_hash FROM users WHERE email = ?',
      )
      .get(email);

    if (!row || !verifyPassword(password, row.password_hash)) {
      recordFailure(key);
      throw new ApiError(401, 'Email or password is incorrect.');
    }

    attempts.delete(key);
    issueSession(res, row.id, req);

    let shop = null;
    if (row.role === 'seller') {
      const shopRow = db
        .prepare(
          `SELECT id, slug, name, status, logo_url, banner_url
           FROM shops WHERE owner_user_id = ?`,
        )
        .get(row.id);
      if (shopRow) {
        shop = {
          id: shopRow.id,
          slug: shopRow.slug,
          name: shopRow.name,
          status: shopRow.status,
          logoUrl: shopRow.logo_url,
          bannerUrl: shopRow.banner_url,
        };
      }
    }

    res.json({
      user: publicUser({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        role: row.role,
        createdAt: row.created_at,
        shop,
      }),
    });
  } catch (error) {
    next(error);
  }
});

authRouter.post('/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});
