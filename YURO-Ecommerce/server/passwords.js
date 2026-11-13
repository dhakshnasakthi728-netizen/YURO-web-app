import crypto from 'node:crypto';

const KEY_LENGTH = 64;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH);
  return `scrypt$${salt}$${derived.toString('base64url')}`;
}

export function verifyPassword(password, stored) {
  if (typeof stored !== 'string') return false;
  const [algorithm, salt, encoded] = stored.split('$');
  if (algorithm !== 'scrypt' || !salt || !encoded) return false;

  try {
    const expected = Buffer.from(encoded, 'base64url');
    const actual = crypto.scryptSync(password, salt, expected.length);
    return (
      expected.length === actual.length &&
      crypto.timingSafeEqual(expected, actual)
    );
  } catch {
    return false;
  }
}

export function randomReference(prefix) {
  const year = new Date().getFullYear();
  const token = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${year}-${token}`;
}
