import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  LockKeyhole,
  MapPin,
  ShieldCheck,
  User,
} from 'lucide-react';
import type {
  AuthUser,
  CartItem,
  CartLine,
  CartTotals,
  CheckoutErrors,
  CheckoutForm,
  CheckoutStep,
  Order,
} from '../types';
import { calculateTotals, getCartLines } from '../lib/cart';
import { getCommerceSettings } from '../lib/commerce';
import { formatPrice } from '../lib/format';
import { reduceMotionRequested } from '../lib/motion';
import {
  hasErrors,
  validateContact,
  validateShipping,
} from '../lib/validation';
import { api, ApiError } from '../lib/api';
import { useDialog } from '../hooks/useDialog';
import { Brand } from './Brand';
import { FormField } from './FormField';
import { SafeImage } from './SafeImage';

type CheckoutProps = {
  cart: CartItem[];
  user: AuthUser;
  onClose: () => void;
  onOrderComplete: (order: Order) => void;
  onRequireAuth: () => void;
  page?: boolean;
};

const steps: Array<{ id: CheckoutStep; label: string }> = [
  { id: 1, label: 'Contact' },
  { id: 2, label: 'Shipping' },
  { id: 3, label: 'Review' },
  { id: 4, label: 'Payment' },
];

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `order-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function OrderSummary({
  lines,
  totals,
}: {
  lines: CartLine[];
  totals: CartTotals;
}) {
  return (
    <aside className="checkout-summary glass" aria-label="Order summary">
      <div className="summary-head">
        <h2>Order summary</h2>
        <span>
          {totals.itemCount} {totals.itemCount === 1 ? 'piece' : 'pieces'}
        </span>
      </div>

      <div className="checkout-summary-items">
        {lines.map((line) => (
          <div className="summary-item" key={line.product.id}>
            <div className="summary-item-media">
              <SafeImage
                src={line.product.image}
                alt={line.product.name}
                className="summary-item-img"
                sizes="56px"
              />
              <span className="summary-qty" aria-hidden="true">
                {line.quantity}
              </span>
            </div>
            <div className="summary-item-copy">
              <p>{line.product.name}</p>
              <small>
                {line.product.shopName} · {formatPrice(line.product.price)} ×{' '}
                {line.quantity}
              </small>
            </div>
            <span className="summary-item-total">
              {formatPrice(line.lineTotal)}
            </span>
          </div>
        ))}
      </div>

      <div className="summary-totals">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>{formatPrice(totals.subtotal)}</span>
        </div>
        {totals.discount > 0 && (
          <div className="summary-row summary-discount">
            <span>Promotion</span>
            <span>−{formatPrice(totals.discount)}</span>
          </div>
        )}
        <div className="summary-row">
          <span>Shipping</span>
          <span>
            {totals.shipping === 0
              ? 'Complimentary'
              : formatPrice(totals.shipping)}
          </span>
        </div>
        <div className="summary-row summary-total">
          <span>Total</span>
          <strong>{formatPrice(totals.total)}</strong>
        </div>
      </div>

      {totals.freeShippingRemaining > 0 ? (
        <p className="summary-hint">
          Add {formatPrice(totals.freeShippingRemaining)} more for complimentary
          shipping.
        </p>
      ) : (
        <p className="summary-hint summary-hint-good">
          Complimentary shipping included.
        </p>
      )}
      <p className="summary-note">
        Final totals are verified by the marketplace server when the order is
        placed.
      </p>
    </aside>
  );
}

export function Checkout({
  cart,
  user,
  onClose,
  onOrderComplete,
  onRequireAuth,
  page = false,
}: CheckoutProps) {
  const settings = getCommerceSettings();
  const [step, setStep] = useState<CheckoutStep>(1);
  const [form, setForm] = useState<CheckoutForm>({
    fullName: user.fullName,
    email: user.email,
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India',
  });
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [promoInput, setPromoInput] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const submissionInFlightRef = useRef(false);
  const idempotencyKeyRef = useRef(newIdempotencyKey());
  const submitErrorRef = useRef<HTMLDivElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const lines = getCartLines(cart);
  const totals = calculateTotals(cart, promoApplied);

  const closeSafely = () => {
    if (!submitting) onClose();
  };

  const dialogRef = useDialog(!page, closeSafely);

  useEffect(() => {
    const reduceMotion = reduceMotionRequested();
    if (page) {
      window.scrollTo({
        top: 0,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    } else {
      dialogRef.current?.scrollTo({
        top: 0,
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
    }
    const focusTimer = window.setTimeout(() => {
      stepHeadingRef.current?.focus({ preventScroll: true });
    }, 40);
    return () => window.clearTimeout(focusTimer);
  }, [step, dialogRef, page]);

  useEffect(() => {
    if (submitError) submitErrorRef.current?.focus();
  }, [submitError]);

  const updateField = (field: keyof CheckoutForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const validateField = (field: keyof CheckoutForm) => {
    const fieldErrors =
      ['fullName', 'email', 'phone'].includes(field)
        ? validateContact(form)
        : validateShipping(form);
    setErrors((current) => {
      const next = { ...current };
      if (fieldErrors[field]) {
        next[field] = fieldErrors[field];
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const focusFirstError = (nextErrors: CheckoutErrors) => {
    const fields: Array<keyof CheckoutForm> =
      step === 1
        ? ['fullName', 'email', 'phone']
        : ['address', 'city', 'state', 'postalCode', 'country'];
    const firstInvalid = fields.find((field) => Boolean(nextErrors[field]));
    if (firstInvalid) {
      window.requestAnimationFrame(() => {
        document.getElementById(firstInvalid)?.focus();
      });
    }
  };

  const continueToNextStep = () => {
    if (step === 1) {
      const nextErrors = validateContact(form);
      setErrors(nextErrors);
      if (hasErrors(nextErrors)) {
        focusFirstError(nextErrors);
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      const nextErrors = validateShipping(form);
      setErrors(nextErrors);
      if (hasErrors(nextErrors)) {
        focusFirstError(nextErrors);
        return;
      }
      setStep(3);
      return;
    }

    if (step === 3) {
      setStep(4);
      setErrors({});
    }
  };

  const goBack = () => {
    if (step === 1) return;
    setStep((step - 1) as CheckoutStep);
    setErrors({});
    setSubmitError('');
  };

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase();

    if (!code) {
      setPromoApplied(false);
      setPromoMessage({ type: 'error', text: 'Enter a promotion code.' });
      return;
    }

    if (code !== settings.promoCode.toUpperCase()) {
      setPromoApplied(false);
      setPromoMessage({
        type: 'error',
        text: 'That promotion code is not recognised.',
      });
      return;
    }

    setPromoApplied(true);
    setPromoMessage({
      type: 'success',
      text: `${code} applied — ${Math.round(
        settings.promoRate * 100,
      )}% off your subtotal.`,
    });
  };

  const removePromo = () => {
    setPromoApplied(false);
    setPromoInput('');
    setPromoMessage(null);
  };

  const placeOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting || submissionInFlightRef.current) return;

    if (cart.length === 0) {
      setSubmitError('Your bag is empty. Add a piece before checking out.');
      return;
    }

    if (!acknowledged) {
      setSubmitError(
        'Confirm that payment will be collected on delivery before placing the order.',
      );
      return;
    }

    for (const line of lines) {
      if (line.product.stock < line.quantity) {
        setSubmitError(
          `${line.product.name} now has only ${line.product.stock} available. Update your bag and try again.`,
        );
        return;
      }
    }

    submissionInFlightRef.current = true;
    setSubmitting(true);
    setSubmitError('');

    try {
      const result = await api.orders.create({
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        contact: {
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
        shippingAddress: {
          address: form.address.trim(),
          city: form.city.trim(),
          state: form.state.trim(),
          postalCode: form.postalCode.trim(),
          country: form.country.trim(),
        },
        promoCode: promoApplied ? promoInput.trim().toUpperCase() : '',
        paymentMethod: 'cod',
        idempotencyKey: idempotencyKeyRef.current,
      });

      onOrderComplete(result.order);
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
        if (error.status === 401) {
          setSubmitError('Your session has expired. Sign in again to place the order.');
        }
      } else {
        setSubmitError(
          'Could not reach the YURO server. Your bag is unchanged. Try again.',
        );
      }
      window.setTimeout(() => submitErrorRef.current?.focus(), 30);
    } finally {
      submissionInFlightRef.current = false;
      setSubmitting(false);
    }
  };

  const stepper = (
    <ol className="checkout-progress" aria-label="Checkout progress">
      {steps.map((item) => {
        const state =
          item.id === step ? 'is-active' : item.id < step ? 'is-complete' : '';
        return (
          <li key={item.id} className={state}>
            <span className="step-dot" aria-hidden="true">
              {item.id < step ? <Check size={12} /> : item.id}
            </span>
            <span className="step-label">{item.label}</span>
            {item.id === step && <span className="sr-only">Current step</span>}
          </li>
        );
      })}
    </ol>
  );

  const topBar = page ? (
    <div className="checkout-titlebar">
      <Link className="text-link" to="/cart">
        <ArrowLeft size={14} />
        Back to bag
      </Link>
      <span className="checkout-demo-pill">
        <LockKeyhole size={12} />
        Account checkout · Cash on delivery
      </span>
    </div>
  ) : (
    <div className="checkout-topbar">
      <Brand compact />
      <span className="checkout-demo-pill">
        <LockKeyhole size={12} />
        Account checkout · Cash on delivery
      </span>
      <button
        type="button"
        className="icon-button"
        onClick={closeSafely}
        disabled={submitting}
        aria-label="Close checkout"
      >
        {submitting ? <span className="spinner small" /> : '✕'}
      </button>
    </div>
  );

  return (
    <div
      className={`checkout-screen${page ? ' is-page' : ''}`}
      role={page ? undefined : 'dialog'}
      aria-modal={page ? undefined : true}
      aria-label="Checkout"
      ref={dialogRef}
      tabIndex={-1}
    >
      {topBar}

      <div className="checkout-shell">
        <div className="checkout-main">
          {stepper}

          {cart.length === 0 ? (
            <div className="checkout-empty glass">
              <h2>Your bag is empty</h2>
              <p>Add a piece to your bag before starting checkout.</p>
              <button type="button" className="btn btn-primary" onClick={onClose}>
                Back to the collection
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <>
              {step === 1 && (
                <form
                  className="checkout-step"
                  onSubmit={(event) => {
                    event.preventDefault();
                    continueToNextStep();
                  }}
                  noValidate
                >
                  <div className="step-heading">
                    <p className="eyebrow">Step 1 of 4</p>
                    <h1 ref={stepHeadingRef} tabIndex={-1}>
                      Contact information
                    </h1>
                    <p>
                      These details are saved with your order and shared only
                      with the shops fulfilling it.
                    </p>
                  </div>

                  <div className="form-grid">
                    <div className="form-field-full">
                      <FormField
                        id="fullName"
                        label="Full name"
                        value={form.fullName}
                        onChange={(value) => updateField('fullName', value)}
                        onBlur={() => validateField('fullName')}
                        error={errors.fullName}
                        autoComplete="name"
                        placeholder="Your full name"
                      />
                    </div>
                    <FormField
                      id="email"
                      label="Email address"
                      type="email"
                      value={form.email}
                      onChange={(value) => updateField('email', value)}
                      onBlur={() => validateField('email')}
                      error={errors.email}
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                    />
                    <FormField
                      id="phone"
                      label="Phone number"
                      type="tel"
                      value={form.phone}
                      onChange={(value) => updateField('phone', value)}
                      onBlur={() => validateField('phone')}
                      error={errors.phone}
                      autoComplete="tel"
                      inputMode="tel"
                      placeholder="+91 98765 43210"
                    />
                  </div>

                  <p className="form-footnote">
                    <LockKeyhole size={13} />
                    Orders are stored in your YURO account, not in editable
                    browser storage.
                  </p>

                  <div className="checkout-actions">
                    <button type="button" className="btn btn-quiet" onClick={onClose}>
                      <ArrowLeft size={15} />
                      Back to store
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Continue to shipping
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </form>
              )}

              {step === 2 && (
                <form
                  className="checkout-step"
                  onSubmit={(event) => {
                    event.preventDefault();
                    continueToNextStep();
                  }}
                  noValidate
                >
                  <div className="step-heading">
                    <p className="eyebrow">Step 2 of 4</p>
                    <h1 ref={stepHeadingRef} tabIndex={-1}>
                      Shipping information
                    </h1>
                    <p>
                      Enter the delivery address for this order. You can use a
                      different address on your next order.
                    </p>
                  </div>

                  <div className="form-grid">
                    <div className="form-field-full">
                      <FormField
                        id="address"
                        label="Street address"
                        value={form.address}
                        onChange={(value) => updateField('address', value)}
                        onBlur={() => validateField('address')}
                        error={errors.address}
                        autoComplete="street-address"
                        placeholder="14 Meridian Lane, Apt 3B"
                      />
                    </div>
                    <FormField
                      id="city"
                      label="City"
                      value={form.city}
                      onChange={(value) => updateField('city', value)}
                      onBlur={() => validateField('city')}
                      error={errors.city}
                      autoComplete="address-level2"
                      placeholder="Mumbai"
                    />
                    <FormField
                      id="state"
                      label="State / region"
                      value={form.state}
                      onChange={(value) => updateField('state', value)}
                      onBlur={() => validateField('state')}
                      error={errors.state}
                      autoComplete="address-level1"
                      placeholder="Maharashtra"
                    />
                    <FormField
                      id="postalCode"
                      label="Postal code"
                      value={form.postalCode}
                      onChange={(value) => updateField('postalCode', value)}
                      onBlur={() => validateField('postalCode')}
                      error={errors.postalCode}
                      autoComplete="postal-code"
                      inputMode="numeric"
                      maxLength={12}
                      placeholder="400001"
                    />
                    <FormField
                      id="country"
                      label="Country"
                      value={form.country}
                      onChange={(value) => updateField('country', value)}
                      onBlur={() => validateField('country')}
                      error={errors.country}
                      autoComplete="country-name"
                      placeholder="India"
                    />
                  </div>

                  <div className="checkout-actions">
                    <button type="button" className="btn btn-quiet" onClick={goBack}>
                      <ArrowLeft size={15} />
                      Contact
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Review order
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </form>
              )}

              {step === 3 && (
                <form
                  className="checkout-step"
                  onSubmit={(event) => {
                    event.preventDefault();
                    continueToNextStep();
                  }}
                >
                  <div className="step-heading">
                    <p className="eyebrow">Step 3 of 4</p>
                    <h1 ref={stepHeadingRef} tabIndex={-1}>
                      Review your order
                    </h1>
                    <p>
                      Check your details and totals. Orders containing pieces
                      from more than one shop are fulfilled by each shop
                      separately.
                    </p>
                  </div>

                  <div className="review-card glass">
                    <div className="review-head">
                      <h2>
                        <User size={15} />
                        Contact
                      </h2>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setStep(1)}
                      >
                        Edit
                      </button>
                    </div>
                    <p>{form.fullName}</p>
                    <p>
                      {form.email} · {form.phone}
                    </p>
                  </div>

                  <div className="review-card glass">
                    <div className="review-head">
                      <h2>
                        <MapPin size={15} />
                        Shipping address
                      </h2>
                      <button
                        type="button"
                        className="text-link"
                        onClick={() => setStep(2)}
                      >
                        Edit
                      </button>
                    </div>
                    <p>
                      {form.address}
                      <br />
                      {form.city}, {form.state} {form.postalCode}
                      <br />
                      {form.country}
                    </p>
                  </div>

                  <div className="promo-card glass">
                    <div>
                      <h2>Promotion</h2>
                      <p>Have a code from the studio or a shop?</p>
                    </div>

                    {promoApplied ? (
                      <div className="promo-applied">
                        <span>
                          <Check size={14} />
                          {promoInput.trim().toUpperCase()} applied
                        </span>
                        <button
                          type="button"
                          className="text-link"
                          onClick={removePromo}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="promo-form">
                        <label className="sr-only" htmlFor="promo-code">
                          Promotion code
                        </label>
                        <input
                          id="promo-code"
                          type="text"
                          value={promoInput}
                          onChange={(event) => {
                            setPromoInput(event.target.value);
                            setPromoMessage(null);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              applyPromo();
                            }
                          }}
                          placeholder="Enter code"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={applyPromo}
                        >
                          Apply
                        </button>
                      </div>
                    )}

                    {promoMessage && (
                      <p
                        className={`promo-message ${
                          promoMessage.type === 'error' ? 'is-error' : ''
                        }`}
                        role="status"
                      >
                        {promoMessage.text}
                      </p>
                    )}
                  </div>

                  <div className="review-trust">
                    <span>
                      <ShieldCheck size={15} />
                      Totals are calculated by the marketplace server
                    </span>
                    <span>
                      <Banknote size={15} />
                      No card details are collected
                    </span>
                  </div>

                  <div className="checkout-actions">
                    <button type="button" className="btn btn-quiet" onClick={goBack}>
                      <ArrowLeft size={15} />
                      Shipping
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Continue to payment
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </form>
              )}

              {step === 4 && (
                <form className="checkout-step" onSubmit={placeOrder}>
                  <div className="step-heading">
                    <p className="eyebrow">Step 4 of 4</p>
                    <h1 ref={stepHeadingRef} tabIndex={-1}>
                      Payment on delivery
                    </h1>
                    <p>
                      Cash on delivery is the available payment method. No online
                      payment is taken when you place this order.
                    </p>
                  </div>

                  <fieldset className="payment-options" disabled={submitting}>
                    <legend>Payment method</legend>
                    <label className="payment-option is-selected">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked
                        readOnly
                      />
                      <span className="payment-radio" aria-hidden="true" />
                      <span className="payment-copy">
                        <strong>Cash on delivery</strong>
                        <small>
                          Pay the courier when your order arrives. Payment status
                          will show as pending until then.
                        </small>
                      </span>
                      <Banknote size={18} aria-hidden="true" />
                    </label>
                  </fieldset>

                  <label className="checkbox-field">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(event) => {
                        setAcknowledged(event.target.checked);
                        setSubmitError('');
                      }}
                      disabled={submitting}
                    />
                    <span className="checkbox-box" aria-hidden="true">
                      {acknowledged && <Check size={12} />}
                    </span>
                    <span>
                      I understand that payment will be collected in cash when
                      this order is delivered.
                    </span>
                  </label>

                  {submitError && (
                    <div
                      className="payment-error"
                      role="alert"
                      ref={submitErrorRef}
                      tabIndex={-1}
                    >
                      <AlertTriangle size={17} />
                      <p>{submitError}</p>
                      {submitError.includes('session has expired') && (
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => {
                            onClose();
                            onRequireAuth();
                          }}
                        >
                          Sign in again
                        </button>
                      )}
                    </div>
                  )}

                  <div className="checkout-actions">
                    <button
                      type="button"
                      className="btn btn-quiet"
                      onClick={goBack}
                      disabled={submitting}
                    >
                      <ArrowLeft size={15} />
                      Review
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting || !acknowledged || cart.length === 0}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner" />
                          Placing order…
                        </>
                      ) : (
                        <>
                          Place order · {formatPrice(totals.total)}
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </div>

                  <p className="payment-caption">
                    <LockKeyhole size={13} />
                    Your order number is shown immediately after the order is
                    created and saved to your account.
                  </p>
                </form>
              )}
            </>
          )}
        </div>

        {cart.length > 0 && <OrderSummary lines={lines} totals={totals} />}
      </div>
    </div>
  );
}
