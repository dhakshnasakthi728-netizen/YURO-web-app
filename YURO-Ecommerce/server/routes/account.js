import { Router } from 'express';
import { db, getPublicSettings } from '../db.js';
import { requireAuth } from '../auth.js';
import { randomReference } from '../passwords.js';
import { serializeApplication } from '../serializers.js';
import {
  ApiError,
  categoryValue,
  emailAddress,
  optionalImageUrl,
  optionalText,
  phoneNumber,
  requiredText,
} from '../validation.js';

export const accountRouter = Router();
accountRouter.use(requireAuth);

function applicationReference() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const reference = randomReference('SA');
    if (
      !db
        .prepare('SELECT id FROM seller_applications WHERE reference = ?')
        .get(reference)
    ) {
      return reference;
    }
  }
  return `SA-${Date.now().toString(36).toUpperCase()}`;
}

function website(value) {
  const url = optionalText(value, 500);
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('invalid protocol');
    }
    return parsed.toString();
  } catch {
    throw new ApiError(422, 'Enter a valid website URL including https://.');
  }
}

accountRouter.get('/seller-applications', (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, u.full_name AS applicant_name, u.email AS applicant_email
       FROM seller_applications a
       JOIN users u ON u.id = a.user_id
       WHERE a.user_id = ?
       ORDER BY a.id DESC`,
    )
    .all(req.user.id);
  res.json({ applications: rows.map(serializeApplication) });
});

accountRouter.post('/seller-applications', (req, res, next) => {
  try {
    if (req.user.role !== 'customer') {
      throw new ApiError(
        403,
        req.user.role === 'seller'
          ? 'Your seller account is already active.'
          : 'Administrator accounts cannot apply to open a shop.',
      );
    }
    if (!getPublicSettings().applicationsOpen) {
      throw new ApiError(403, 'Seller applications are currently closed.');
    }

    const existing = db
      .prepare(
        `SELECT id, status FROM seller_applications
         WHERE user_id = ? AND status IN ('pending', 'approved')
         ORDER BY id DESC LIMIT 1`,
      )
      .get(req.user.id);
    if (existing) {
      throw new ApiError(
        409,
        existing.status === 'pending'
          ? 'You already have a pending application.'
          : 'Your shop application has already been approved.',
      );
    }

    const shopName = requiredText(req.body?.shopName, 'Shop name', 3, 80);
    const description = requiredText(
      req.body?.description,
      'Shop description',
      20,
      1200,
    );
    const category = categoryValue(req.body?.category);
    const contactEmail = emailAddress(req.body?.contactEmail, 'Contact email');
    const contactPhone = phoneNumber(req.body?.contactPhone);
    const websiteUrl = website(req.body?.websiteUrl);
    const logoUrl = optionalImageUrl(req.body?.logoUrl, 'Logo');
    const bannerUrl = optionalImageUrl(req.body?.bannerUrl, 'Banner');

    const reference = applicationReference();
    const timestamp = new Date().toISOString();

    const result = db
      .prepare(
        `INSERT INTO seller_applications
          (reference, user_id, shop_name, description, category, contact_email,
           contact_phone, website_url, logo_url, banner_url, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .run(
        reference,
        req.user.id,
        shopName,
        description,
        category,
        contactEmail,
        contactPhone,
        websiteUrl,
        logoUrl,
        bannerUrl,
        timestamp,
      );

    const row = db
      .prepare(
        `SELECT a.*, u.full_name AS applicant_name, u.email AS applicant_email
         FROM seller_applications a
         JOIN users u ON u.id = a.user_id
         WHERE a.id = ?`,
      )
      .get(Number(result.lastInsertRowid));

    res.status(201).json({ application: serializeApplication(row) });
  } catch (error) {
    next(error);
  }
});
