import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ArrowRight, Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ApiError } from '../lib/api';
import { isValidEmail } from '../lib/validation';

type AuthFormProps = {
  onSuccess: () => void;
  initialMode?: 'signin' | 'register';
};

type AuthField = 'fullName' | 'email' | 'password';

export function AuthForm({
  onSuccess,
  initialMode = 'signin',
}: AuthFormProps) {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'signin' | 'register'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<AuthField, string>>>({});
  const [generalError, setGeneralError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const errorRef = useRef<HTMLDivElement>(null);

  const changeMode = (next: 'signin' | 'register') => {
    setMode(next);
    setErrors({});
    setGeneralError('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const nextErrors: Partial<Record<AuthField, string>> = {};
    if (mode === 'register' && fullName.trim().length < 2) {
      nextErrors.fullName = 'Enter your full name.';
    }
    if (!isValidEmail(email)) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (password.length < 8) {
      nextErrors.password = 'Use at least 8 characters.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    setGeneralError('');
    try {
      if (mode === 'signin') {
        await login(email.trim(), password);
      } else {
        await register(fullName.trim(), email.trim(), password);
      }
      onSuccess();
    } catch (error) {
      if (error instanceof ApiError) {
        setGeneralError(error.message);
        if (error.fields) {
          setErrors(
            Object.fromEntries(
              Object.entries(error.fields).filter(([key]) =>
                ['fullName', 'email', 'password'].includes(key),
              ),
            ),
          );
        }
      } else {
        setGeneralError(
          'Could not reach the YURO server. Check your connection and try again.',
        );
      }
      window.setTimeout(() => errorRef.current?.focus(), 30);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="auth-form" onSubmit={submit} noValidate>
      <div className="auth-tabs" role="tablist" aria-label="Account access">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          className={mode === 'signin' ? 'is-active' : ''}
          onClick={() => changeMode('signin')}
        >
          Sign in
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'register'}
          className={mode === 'register' ? 'is-active' : ''}
          onClick={() => changeMode('register')}
        >
          Create account
        </button>
      </div>

      <div className="form-grid auth-fields">
        {mode === 'register' && (
          <div className="form-field-full">
            <label htmlFor="auth-full-name">Full name</label>
            <input
              id="auth-full-name"
              name="name"
              type="text"
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                setErrors((current) => ({ ...current, fullName: undefined }));
              }}
              autoComplete="name"
              placeholder="Your full name"
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'auth-full-name-error' : undefined}
            />
            {errors.fullName && (
              <p className="field-error" id="auth-full-name-error" role="alert">
                {errors.fullName}
              </p>
            )}
          </div>
        )}

        <div className="form-field-full">
          <label htmlFor="auth-email">Email address</label>
          <input
            id="auth-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors((current) => ({ ...current, email: undefined }));
            }}
            autoComplete="email"
            inputMode="email"
            placeholder="you@example.com"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? 'auth-email-error' : undefined}
          />
          {errors.email && (
            <p className="field-error" id="auth-email-error" role="alert">
              {errors.email}
            </p>
          )}
        </div>

        <div className="form-field-full password-field">
          <label htmlFor="auth-password">Password</label>
          <div className="password-input">
            <input
              id="auth-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({ ...current, password: undefined }));
              }}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder={mode === 'signin' ? 'Your password' : 'At least 8 characters'}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={
                errors.password ? 'auth-password-error' : 'auth-password-hint'
              }
            />
            <button
              type="button"
              className="icon-button password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password ? (
            <p className="field-error" id="auth-password-error" role="alert">
              {errors.password}
            </p>
          ) : (
            <p className="field-hint" id="auth-password-hint">
              {mode === 'register'
                ? 'Use 8 or more characters.'
                : 'Use the password you registered with.'}
            </p>
          )}
        </div>
      </div>

      {generalError && (
        <div
          className="form-alert"
          role="alert"
          tabIndex={-1}
          ref={errorRef}
        >
          {generalError}
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary auth-submit"
        disabled={submitting}
      >
        {submitting ? (
          <>
            <LoaderCircle size={16} className="spin" />
            {mode === 'signin' ? 'Signing in…' : 'Creating account…'}
          </>
        ) : (
          <>
            {mode === 'signin' ? 'Sign in' : 'Create account'}
            <ArrowRight size={16} />
          </>
        )}
      </button>

      <p className="auth-fineprint">
        {mode === 'signin'
          ? 'New to YURO? Create an account to keep orders and shop access in one place.'
          : 'Your account is used for order history, seller applications and marketplace access.'}
      </p>
    </form>
  );
}
