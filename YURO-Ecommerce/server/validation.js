import { CATEGORIES } from './config.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[\d\s().-]{7,20}$/;
const POSTAL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s-]{1,11}$/;
const SAFE_IMAGE_PATTERN = /^(https?:\/\/|\/uploads\/)[^\s]+$/i;

export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function requiredText(value, label, min = 1, max = 500) {
  if (typeof value !== 'string') {
    throw new ApiError(422, `${label} is required.`, {
      [label.toLowerCase().replace(/\s+/g, '')]: `${label} is required.`,
    });
  }
  const clean = value.trim();
  if (clean.length < min) {
    throw new ApiError(422, `${label} is required.`);
  }
  if (clean.length > max) {
    throw new ApiError(422, `${label} is too long.`);
  }
  return clean;
}

export function optionalText(value, max = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

export function emailAddress(value, label = 'Email') {
  const email = requiredText(value, label, 3, 254).toLowerCase();
  if (!EMAIL_PATTERN.test(email)) {
    throw new ApiError(422, `Enter a valid ${label.toLowerCase()}.`);
  }
  return email;
}

export function phoneNumber(value, label = 'Phone number') {
  const phone = requiredText(value, label, 7, 30);
  const digits = phone.replace(/\D/g, '');
  if (!PHONE_PATTERN.test(phone) || digits.length < 7 || digits.length > 15) {
    throw new ApiError(422, 'Enter a valid phone number with 7–15 digits.');
  }
  return phone;
}

export function postalCode(value) {
  const code = requiredText(value, 'Postal code', 2, 12);
  if (!POSTAL_PATTERN.test(code)) {
    throw new ApiError(422, 'Enter a valid postal code.');
  }
  return code;
}

export function passwordValue(value) {
  if (typeof value !== 'string' || value.length < 8) {
    throw new ApiError(422, 'Use at least 8 characters for your password.');
  }
  if (value.length > 128) {
    throw new ApiError(422, 'Password is too long.');
  }
  return value;
}

export function categoryValue(value) {
  const category = requiredText(value, 'Category', 3, 40).toUpperCase();
  if (!CATEGORIES.includes(category)) {
    throw new ApiError(422, 'Choose a valid category.');
  }
  return category;
}

export function priceValue(value) {
  const price = Number(value);
  if (!Number.isInteger(price) || price < 0 || price > 10_000_000) {
    throw new ApiError(422, 'Enter a valid price in rupees.');
  }
  return price;
}

export function stockValue(value) {
  const stock = Number(value);
  if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) {
    throw new ApiError(422, 'Enter a valid stock quantity.');
  }
  return stock;
}

export function imageUrl(value, label = 'Image') {
  const url = requiredText(value, label, 1, 1000);
  if (!SAFE_IMAGE_PATTERN.test(url)) {
    throw new ApiError(
      422,
      `${label} must be an http(s) image URL or an uploaded file.`,
    );
  }
  return url;
}

export function optionalImageUrl(value, label = 'Image') {
  if (!value) return '';
  return imageUrl(value, label);
}

export function idValue(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) {
    throw new ApiError(400, 'Invalid identifier.');
  }
  return id;
}

export function oneOf(value, allowed, label = 'Value') {
  if (!allowed.includes(value)) {
    throw new ApiError(422, `${label} is not valid.`);
  }
  return value;
}
