import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = path.dirname(fileURLToPath(import.meta.url));

export const ROOT_DIR = path.resolve(serverDir, '..');
export const SERVER_DIR = serverDir;
export const DATA_DIR = path.join(serverDir, 'data');
export const UPLOADS_DIR = path.join(serverDir, 'uploads');
export const DATABASE_PATH =
  process.env.DATABASE_PATH || path.join(DATA_DIR, 'yuro.sqlite');
export const PORT = Number(process.env.PORT || 4173);
export const IS_PRODUCTION =
  process.env.NODE_ENV === 'production' || process.argv.includes('--production');
export const SESSION_COOKIE = 'yuro_session';
export const SESSION_DAYS = 30;
export const MAX_IMAGE_BYTES = 1.5 * 1024 * 1024;

export const CATEGORIES = ['APPAREL', 'HOME', 'ACCESSORIES', 'FOOTWEAR'];
