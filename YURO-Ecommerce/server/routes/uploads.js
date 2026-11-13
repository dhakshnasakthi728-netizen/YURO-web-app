import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { MAX_IMAGE_BYTES, UPLOADS_DIR } from '../config.js';
import { ApiError } from '../validation.js';

export const uploadsRouter = Router();
uploadsRouter.use(requireAuth);

const DATA_URL_PATTERN =
  /^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=\s]+)$/i;

uploadsRouter.post('/', (req, res, next) => {
  try {
    const dataUrl = String(req.body?.dataUrl || '');
    const match = DATA_URL_PATTERN.exec(dataUrl);
    if (!match) {
      throw new ApiError(422, 'Choose a PNG, JPG or WebP image.');
    }

    const extension = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
    const buffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
    if (buffer.length === 0 || buffer.length > MAX_IMAGE_BYTES) {
      throw new ApiError(422, 'Images must be smaller than 1.5 MB.');
    }

    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer, { mode: 0o644 });

    res.status(201).json({
      url: `/uploads/${filename}`,
      size: buffer.length,
    });
  } catch (error) {
    next(error);
  }
});
