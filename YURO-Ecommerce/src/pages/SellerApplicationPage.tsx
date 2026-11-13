import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  Store,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, ApiError } from '../lib/api';
import { formatDateTime } from '../lib/format';
import { reduceMotionRequested } from '../lib/motion';
import { isValidEmail } from '../lib/validation';
import type { SellerApplication } from '../types';
import { ImageUploadField } from '../components/ImageUploadField';
import { PageHeader } from '../components/PageHeader';
import { RequireAuth } from '../components/RequireAuth';

const categories = ['APPAREL', 'HOME', 'ACCESSORIES', 'FOOTWEAR'];

const statusMeta = {
  pending: {
    label: 'In review',
    icon: Clock3,
    description:
      'An administrator will review your shop details. You can keep shopping while you wait.',
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle2,
    description: 'Your shop is approved. The seller dashboard is now available.',
  },
  rejected: {
    label: 'Not approved',
    icon: XCircle,
    description:
      'The application was not approved. Read the review note and submit an updated application if you wish.',
  },
};

type FormState = {
  shopName: string;
  description: string;
  category: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  logoUrl: string;
  bannerUrl: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;

const emptyForm: FormState = {
  shopName: '',
  description: '',
  category: 'HOME',
  contactEmail: '',
  contactPhone: '',
  websiteUrl: '',
  logoUrl: '',
  bannerUrl: '',
};

function ApplicationStatusCard({ application }: { application: SellerApplication }) {
  const meta = statusMeta[application.status];
  const Icon = meta.icon;

  return (
    <div className={`application-status-card status-card-${application.status}`}>
      <span className="application-status-icon" aria-hidden="true">
        <Icon size={23} />
      </span>
      <div>
        <div className="application-status-head">
          <span className={`application-status status-${application.status}`}>
            {meta.label}
          </span>
          <span className="application-reference">{application.reference}</span>
        </div>
        <h2>{application.shopName}</h2>
        <p>{meta.description}</p>
        {application.status === 'rejected' && application.rejectionReason && (
          <p className="application-reason">
            <strong>Review note:</strong> {application.rejectionReason}
          </p>
        )}
        <div className="application-meta">
          <span>Submitted {formatDateTime(application.createdAt)}</span>
          <span>{application.category}</span>
          {application.reviewedAt && (
            <span>Reviewed {formatDateTime(application.reviewedAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ApplicationHistory({ applications }: { applications: SellerApplication[] }) {
  if (applications.length <= 1) return null;

  return (
    <section className="application-history glass">
      <div className="detail-card-head">
        <div>
          <p className="eyebrow">History</p>
          <h2>Your applications</h2>
        </div>
      </div>
      <div className="application-history-list">
        {applications.map((application) => (
          <div key={application.id}>
            <span className={`application-status status-${application.status}`}>
              {statusMeta[application.status].label}
            </span>
            <strong>{application.shopName}</strong>
            <small>{application.reference}</small>
            <time dateTime={application.createdAt}>
              {formatDateTime(application.createdAt)}
            </time>
          </div>
        ))}
      </div>
    </section>
  );
}

function ApplicationContent() {
  const { user, refresh } = useAuth();
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [applicationsOpen, setApplicationsOpen] = useState(true);
  const [form, setForm] = useState<FormState>({
    ...emptyForm,
    contactEmail: user?.email || '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [result, settings] = await Promise.all([
        api.account.applications(),
        api.catalogue.settings(),
      ]);
      setApplications(result.applications);
      setApplicationsOpen(settings.settings.applicationsOpen);
    } catch (cause) {
      setLoadError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not load seller applications.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'customer') void load();
    else setLoading(false);
  }, [load, user?.role]);

  const latest = applications[0] || null;
  const canApply =
    user?.role === 'customer' &&
    applicationsOpen &&
    (!latest || latest.status === 'rejected');

  useEffect(() => {
    if (latest?.status === 'rejected' && !form.shopName) {
      setForm({
        shopName: latest.shopName,
        description: latest.description,
        category: latest.category,
        contactEmail: latest.contactEmail,
        contactPhone: latest.contactPhone,
        websiteUrl: latest.websiteUrl,
        logoUrl: latest.logoUrl,
        bannerUrl: latest.bannerUrl,
      });
    }
  }, [latest, form.shopName]);

  const update = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError('');
  };

  const validate = (): FormErrors => {
    const next: FormErrors = {};
    if (form.shopName.trim().length < 3) next.shopName = 'Use at least 3 characters.';
    if (form.description.trim().length < 20) {
      next.description = 'Describe your shop in at least 20 characters.';
    }
    if (!categories.includes(form.category)) next.category = 'Choose a category.';
    if (!isValidEmail(form.contactEmail)) {
      next.contactEmail = 'Enter a valid contact email.';
    }
    const digits = form.contactPhone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      next.contactPhone = 'Enter a phone number with 7–15 digits.';
    }
    if (form.websiteUrl) {
      try {
        const url = new URL(form.websiteUrl);
        if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
      } catch {
        next.websiteUrl = 'Enter a full URL including https://.';
      }
    }
    return next;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    setSubmitError('');
    try {
      const result = await api.account.apply({
        shopName: form.shopName.trim(),
        description: form.description.trim(),
        category: form.category,
        contactEmail: form.contactEmail.trim(),
        contactPhone: form.contactPhone.trim(),
        websiteUrl: form.websiteUrl.trim(),
        logoUrl: form.logoUrl,
        bannerUrl: form.bannerUrl,
      });
      setApplications((current) => [result.application, ...current]);
      window.scrollTo({
        top: 0,
        behavior: reduceMotionRequested() ? 'auto' : 'smooth',
      });
    } catch (cause) {
      setSubmitError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not submit your application. Try again.',
      );
      if (cause instanceof ApiError && cause.status === 409) {
        void load();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (user?.role === 'seller' || user?.role === 'admin') {
    return (
      <section className="page-section shell">
        <PageHeader
          eyebrow="Seller access"
          title={
            <>
              {user.role === 'seller' ? 'Your shop is already open' : 'Seller administration'}
              <span>.</span>
            </>
          }
          description={
            user.role === 'seller'
              ? 'Manage your shop, products and order fulfilment from the seller dashboard.'
              : 'Seller applications are managed from the administrator dashboard.'
          }
          actions={
            <Link
              className="btn btn-primary"
              to={user.role === 'seller' ? '/seller' : '/admin'}
            >
              {user.role === 'seller' ? 'Open seller dashboard' : 'Open administration'}
              <ArrowRight size={16} />
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <section className="page-section shell sell-page">
      <PageHeader
        eyebrow="Sell on YURO"
        title={
          <>
            Open a considered shop<span>.</span>
          </>
        }
        description="Apply to join a marketplace built around independent shops, clear product detail and calm presentation. Every application is reviewed by an administrator."
      />

      {loading ? (
        <div className="page-loading" role="status">
          <span className="spinner" />
          <p>Loading your applications…</p>
        </div>
      ) : loadError ? (
        <div className="empty-state glass">
          <span className="empty-icon" aria-hidden="true">
            <AlertTriangle size={23} />
          </span>
          <h2>Applications could not be loaded</h2>
          <p>{loadError}</p>
          <button type="button" className="btn btn-primary" onClick={() => void load()}>
            Try again
          </button>
        </div>
      ) : latest && !canApply ? (
        <div className="sell-status-layout">
          <div>
            <ApplicationStatusCard application={latest} />
            {latest.status === 'approved' && (
              <button
                type="button"
                className="btn btn-primary application-refresh"
                onClick={() => void refresh()}
              >
                Refresh account access
                <ArrowRight size={15} />
              </button>
            )}
            {latest.status === 'pending' && (
              <p className="application-wait-note">
                <Clock3 size={14} />
                Applications are reviewed manually. You will see the decision
                here after signing in.
              </p>
            )}
            <ApplicationHistory applications={applications} />
          </div>

          <aside className="sell-aside glass">
            <h2>What a strong shop includes</h2>
            <ul>
              <li>
                <Check size={14} />
                A clear point of view, not a reseller catalogue
              </li>
              <li>
                <Check size={14} />
                Original product imagery and accurate descriptions
              </li>
              <li>
                <Check size={14} />
                Reliable stock and fulfilment information
              </li>
              <li>
                <Check size={14} />
                A reachable contact email and phone number
              </li>
            </ul>
            <p>
              Approved sellers can publish products, manage stock and update
              fulfilment for their own order items.
            </p>
          </aside>
        </div>
      ) : !applicationsOpen ? (
        <div className="empty-state glass">
          <span className="empty-icon" aria-hidden="true">
            <Store size={24} />
          </span>
          <h2>Applications are paused</h2>
          <p>
            YURO is not accepting new seller applications at the moment. Check
            back later or continue shopping.
          </p>
          <Link className="btn btn-primary" to="/shop">
            Explore the marketplace
          </Link>
        </div>
      ) : (
        <>
          {latest?.status === 'rejected' && (
            <ApplicationStatusCard application={latest} />
          )}

          <div className="sell-layout">
            <form className="sell-form glass" onSubmit={submit} noValidate>
              <div className="form-section-head">
                <span className="form-section-number">01</span>
                <div>
                  <h2>About your shop</h2>
                  <p>This is what customers will see when they visit your shop.</p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field-full">
                  <label htmlFor="shop-name">Shop name</label>
                  <input
                    id="shop-name"
                    value={form.shopName}
                    onChange={(event) => update('shopName', event.target.value)}
                    placeholder="e.g. Loom & Stone"
                    maxLength={80}
                    aria-invalid={Boolean(errors.shopName)}
                  />
                  {errors.shopName && (
                    <p className="field-error" role="alert">{errors.shopName}</p>
                  )}
                </div>

                <div className="form-field-full">
                  <label htmlFor="shop-description">Shop description</label>
                  <textarea
                    id="shop-description"
                    rows={5}
                    maxLength={1200}
                    value={form.description}
                    onChange={(event) => update('description', event.target.value)}
                    placeholder="Describe what you make, how you make it and what makes your shop distinct."
                    aria-invalid={Boolean(errors.description)}
                  />
                  <div className="field-meta">
                    <span>At least 20 characters.</span>
                    <span>{form.description.length}/1200</span>
                  </div>
                  {errors.description && (
                    <p className="field-error" role="alert">{errors.description}</p>
                  )}
                </div>

                <div className="form-field-full">
                  <label htmlFor="shop-category">Primary category</label>
                  <select
                    id="shop-category"
                    value={form.category}
                    onChange={(event) => update('category', event.target.value)}
                  >
                    {categories.map((category) => (
                      <option value={category} key={category}>
                        {category.charAt(0) + category.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-section-head">
                <span className="form-section-number">02</span>
                <div>
                  <h2>Contact and presentation</h2>
                  <p>Administrators use these details to review the application.</p>
                </div>
              </div>

              <div className="form-grid">
                <div className="form-field-full">
                  <label htmlFor="shop-email">Contact email</label>
                  <input
                    id="shop-email"
                    type="email"
                    value={form.contactEmail}
                    onChange={(event) => update('contactEmail', event.target.value)}
                    placeholder="hello@yourshop.com"
                    aria-invalid={Boolean(errors.contactEmail)}
                  />
                  {errors.contactEmail && (
                    <p className="field-error" role="alert">{errors.contactEmail}</p>
                  )}
                </div>

                <div className="form-field-full">
                  <label htmlFor="shop-phone">Contact phone</label>
                  <input
                    id="shop-phone"
                    type="tel"
                    value={form.contactPhone}
                    onChange={(event) => update('contactPhone', event.target.value)}
                    placeholder="+91 98765 43210"
                    aria-invalid={Boolean(errors.contactPhone)}
                  />
                  {errors.contactPhone && (
                    <p className="field-error" role="alert">{errors.contactPhone}</p>
                  )}
                </div>

                <div className="form-field-full">
                  <label htmlFor="shop-website">Website</label>
                  <input
                    id="shop-website"
                    type="url"
                    value={form.websiteUrl}
                    onChange={(event) => update('websiteUrl', event.target.value)}
                    placeholder="https://yourshop.com"
                    aria-invalid={Boolean(errors.websiteUrl)}
                  />
                  {errors.websiteUrl ? (
                    <p className="field-error" role="alert">{errors.websiteUrl}</p>
                  ) : (
                    <p className="field-hint">Optional.</p>
                  )}
                </div>
              </div>

              <div className="image-fields-grid">
                <ImageUploadField
                  id="shop-logo"
                  label="Shop logo"
                  value={form.logoUrl}
                  onChange={(value) => update('logoUrl', value)}
                  shape="logo"
                />
                <ImageUploadField
                  id="shop-banner"
                  label="Shop banner"
                  value={form.bannerUrl}
                  onChange={(value) => update('bannerUrl', value)}
                  shape="banner"
                />
              </div>

              {submitError && (
                <div className="form-alert" role="alert">
                  {submitError}
                </div>
              )}

              <div className="sell-submit">
                <p>
                  Submitting creates an application reference. It does not
                  publish products or create a seller role automatically.
                </p>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <LoaderCircle size={16} className="spin" />
                      Submitting application…
                    </>
                  ) : (
                    <>
                      Submit application
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>

            <aside className="sell-aside glass">
              <h2>How it works</h2>
              <ol className="sell-steps">
                <li>
                  <span>01</span>
                  <div>
                    <strong>Apply</strong>
                    <p>Share your shop name, category and contact details.</p>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>Review</strong>
                    <p>An administrator reviews the application and responds.</p>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>Open your shop</strong>
                    <p>
                      Once approved, publish products and manage your own
                      fulfilment.
                    </p>
                  </div>
                </li>
              </ol>
              <p className="sell-aside-note">
                YURO takes approvals seriously to keep product claims, stock and
                delivery standards honest.
              </p>
            </aside>
          </div>

          <ApplicationHistory applications={applications} />
        </>
      )}
    </section>
  );
}

export function SellerApplicationPage() {
  return (
    <RequireAuth
      title="Sign in to apply"
      description="Seller applications are tied to a verified account so the marketplace can review and manage shop access."
    >
      <ApplicationContent />
    </RequireAuth>
  );
}
