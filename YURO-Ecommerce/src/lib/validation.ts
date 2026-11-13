import type { CheckoutErrors, CheckoutForm } from '../types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[\d\s().-]{7,20}$/;
const POSTAL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s-]{1,11}$/;

export const initialCheckoutForm: CheckoutForm = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'India',
};

function isBlank(value: string): boolean {
  return value.trim().length === 0;
}

export function validateContact(form: CheckoutForm): CheckoutErrors {
  const errors: CheckoutErrors = {};
  const fullName = form.fullName.trim();
  const email = form.email.trim();
  const phone = form.phone.trim();
  const phoneDigits = phone.replace(/\D/g, '');

  if (fullName.length < 2) {
    errors.fullName = 'Please enter your full name.';
  }

  if (isBlank(email)) {
    errors.email = 'Email address is required.';
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = 'Enter a valid email, such as name@example.com.';
  }

  if (isBlank(phone)) {
    errors.phone = 'Phone number is required.';
  } else if (!PHONE_PATTERN.test(phone) || phoneDigits.length < 7 || phoneDigits.length > 15) {
    errors.phone = 'Enter a valid phone number with 7–15 digits.';
  }

  return errors;
}

export function validateShipping(form: CheckoutForm): CheckoutErrors {
  const errors: CheckoutErrors = {};

  if (form.address.trim().length < 5) {
    errors.address = 'Enter your street address.';
  }

  if (form.city.trim().length < 2) {
    errors.city = 'City is required.';
  }

  if (form.state.trim().length < 2) {
    errors.state = 'State or region is required.';
  }

  if (!POSTAL_PATTERN.test(form.postalCode.trim())) {
    errors.postalCode = 'Enter a valid postal code.';
  }

  if (form.country.trim().length < 2) {
    errors.country = 'Country is required.';
  }

  return errors;
}

export function hasErrors(errors: CheckoutErrors): boolean {
  return Object.keys(errors).length > 0;
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}
