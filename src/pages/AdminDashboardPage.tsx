import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  ExternalLink,
  LoaderCircle,
  Package,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Store,
  Truck,
  Users,
  XCircle,
} from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { setCommerceSettings } from '../lib/commerce';
import { formatDateTime, formatOrderDate, formatPrice } from '../lib/format';
import {
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  SELLER_STATUS_OPTIONS,
} from '../lib/orders';
import type {
  AdminStats,
  CommerceSettings,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  SellerApplication,
  Shop,
} from '../types';
import { OrderStatusBadge } from '../components/OrderStatus';
import { PageHeader } from '../components/PageHeader';
import { RequireAuth } from '../components/RequireAuth';
import { SafeImage } from '../components/SafeImage';

type AdminTab =
  | 'overview'
  | 'applications'
  | 'shops'
  | 'orders'
  | 'products'
  | 'settings';

const applicationLabels = {
  pending: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
};

function AdminApplicationCard({
  application,
  onApprove,
  onReject,
}: {
  application: SellerApplication;
  onApprove: (id: number) => Promise<void>;
  onReject: (id: number, reason: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const approve = async () => {
    setBusy(true);
    setError('');
    try {
      await onApprove(application.id);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Could not approve application.',
      );
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (reason.trim().length < 5) {
      setError('Add a review note of at least 5 characters.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onReject(application.id, reason.trim());
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Could not reject application.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className={`admin-application glass application-${application.status}`}>
      <div className="admin-application-head">
        <div>
          <div className="application-status-head">
            <span className={`application-status status-${application.status}`}>
              {applicationLabels[application.status]}
            </span>
            <span className="application-reference">{application.reference}</span>
          </div>
          <h3>{application.shopName}</h3>
          <p>
            {application.applicantName} · {application.applicantEmail}
          </p>
        </div>
        <div className="admin-application-meta">
          <span>{formatDateTime(application.createdAt)}</span>
          <span>{application.category}</span>
        </div>
      </div>

      <p className="admin-application-description">{application.description}</p>

      <div className="admin-application-strip">
        <span>{application.contactEmail}</span>
        <span>{application.contactPhone}</span>
        {application.websiteUrl && (
          <a href={application.websiteUrl} target="_blank" rel="noreferrer">
            Website <ExternalLink size={12} />
          </a>
        )}
        <button
          type="button"
          className="text-link"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
        >
          {expanded ? 'Hide details' : 'Inspect application'}
        </button>
      </div>

      {expanded && (
        <div className="admin-application-details">
          <div>
            <h4>Applicant</h4>
            <p>
              {application.applicantName}
              <br />
              {application.applicantEmail}
            </p>
          </div>
          <div>
            <h4>Shop contact</h4>
            <p>
              {application.contactEmail}
              <br />
              {application.contactPhone}
            </p>
          </div>
          <div>
            <h4>Category</h4>
            <p>{application.category}</p>
          </div>
          <div>
            <h4>Submitted</h4>
            <p>{formatDateTime(application.createdAt)}</p>
          </div>
          {(application.logoUrl || application.bannerUrl) && (
            <div className="admin-application-images">
              {application.logoUrl && (
                <SafeImage
                  src={application.logoUrl}
                  alt=""
                  className="application-logo-img"
                  sizes="64px"
                />
              )}
              {application.bannerUrl && (
                <SafeImage
                  src={application.bannerUrl}
                  alt=""
                  className="application-banner-img"
                  sizes="220px"
                />
              )}
            </div>
          )}
        </div>
      )}

      {application.status === 'rejected' && application.rejectionReason && (
        <p className="application-reason">
          <strong>Review note:</strong> {application.rejectionReason}
        </p>
      )}

      {application.status === 'pending' && (
        <div className="admin-application-actions">
          {!rejecting ? (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setRejecting(true)}
                disabled={busy}
              >
                <XCircle size={15} />
                Reject
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void approve()}
                disabled={busy}
              >
                {busy ? (
                  <LoaderCircle size={15} className="spin" />
                ) : (
                  <Check size={15} />
                )}
                Approve and open shop
              </button>
            </>
          ) : (
            <div className="reject-box">
              <label htmlFor={`reject-${application.id}`}>Review note</label>
              <textarea
                id={`reject-${application.id}`}
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setError('');
                }}
                placeholder="Explain what needs to change before resubmission."
              />
              <div className="reject-actions">
                <button
                  type="button"
                  className="text-link"
                  onClick={() => {
                    setRejecting(false);
                    setError('');
                  }}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-small"
                  onClick={() => void reject()}
                  disabled={busy}
                >
                  {busy ? <LoaderCircle size={14} className="spin" /> : null}
                  Reject application
                </button>
              </div>
            </div>
          )}
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

function AdminProductRow({
  product,
  onSaved,
}: {
  product: Product;
  onSaved: (product: Product) => void;
}) {
  const [price, setPrice] = useState(String(product.price));
  const [stock, setStock] = useState(String(product.stock));
  const [active, setActive] = useState(product.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const dirty =
    price !== String(product.price) ||
    stock !== String(product.stock) ||
    active !== product.active;

  const save = async () => {
    const nextPrice = Number(price);
    const nextStock = Number(stock);
    if (!Number.isInteger(nextPrice) || nextPrice < 1) {
      setError('Enter a valid price.');
      return;
    }
    if (!Number.isInteger(nextStock) || nextStock < 0) {
      setError('Enter a valid stock count.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const result = await api.admin.updateProduct(product.id, {
        price: nextPrice,
        stock: nextStock,
        active,
      });
      onSaved(result.product);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Could not update product.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`admin-product-row${active ? '' : ' is-off'}`}>
      <SafeImage
        src={product.image}
        alt=""
        className="admin-product-img"
        sizes="56px"
      />
      <div className="admin-product-copy">
        <strong>{product.name}</strong>
        <span>
          {product.shopName} · {product.category}
        </span>
      </div>
      <label className="admin-inline-field">
        <span>Price</span>
        <input
          type="number"
          min="1"
          step="1"
          value={price}
          onChange={(event) => {
            setPrice(event.target.value);
            setError('');
          }}
        />
      </label>
      <label className="admin-inline-field">
        <span>Stock</span>
        <input
          type="number"
          min="0"
          step="1"
          value={stock}
          onChange={(event) => {
            setStock(event.target.value);
            setError('');
          }}
        />
      </label>
      <label className="admin-check">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
        Live
      </label>
      <button
        type="button"
        className="btn btn-ghost btn-small"
        onClick={() => void save()}
        disabled={!dirty || saving}
      >
        {saving ? <LoaderCircle size={14} className="spin" /> : null}
        Save
      </button>
      {error && (
        <p className="field-error admin-row-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function AdminDashboardContent() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<CommerceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [applicationFilter, setApplicationFilter] = useState<
    'pending' | 'all' | 'approved' | 'rejected'
  >('pending');
  const [orderFilter, setOrderFilter] = useState('');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [groupDrafts, setGroupDrafts] = useState<Record<number, string>>({});
  const [updatingGroup, setUpdatingGroup] = useState<number | null>(null);
  const [updatingPayment, setUpdatingPayment] = useState<number | null>(null);
  const [orderActionError, setOrderActionError] = useState<Record<string, string>>(
    {},
  );
  const [settingsForm, setSettingsForm] = useState({
    freeShippingThreshold: '',
    shippingFee: '',
    promoCode: '',
    promoRate: '',
    applicationsOpen: true,
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [
        statsResult,
        applicationsResult,
        shopsResult,
        ordersResult,
        productsResult,
        settingsResult,
      ] = await Promise.all([
        api.admin.stats(),
        api.admin.applications(),
        api.admin.shops(),
        api.admin.orders(),
        api.admin.products(),
        api.admin.settings(),
      ]);
      setStats(statsResult.stats);
      setApplications(applicationsResult.applications);
      setShops(shopsResult.shops);
      setOrders(ordersResult.orders);
      setProducts(productsResult.products);
      setSettings(settingsResult.settings);
      setSettingsForm({
        freeShippingThreshold: String(
          settingsResult.settings.freeShippingThreshold,
        ),
        shippingFee: String(settingsResult.settings.shippingFee),
        promoCode: settingsResult.settings.promoCode,
        promoRate: String(settingsResult.settings.promoRate),
        applicationsOpen: settingsResult.settings.applicationsOpen,
      });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not load the administration workspace.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3400);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const pendingApplications = useMemo(
    () => applications.filter((application) => application.status === 'pending'),
    [applications],
  );

  const filteredApplications = useMemo(
    () =>
      applicationFilter === 'all'
        ? applications
        : applications.filter(
            (application) => application.status === applicationFilter,
          ),
    [applications, applicationFilter],
  );

  const filteredOrders = useMemo(
    () =>
      orderFilter
        ? orders.filter((order) => order.status === orderFilter)
        : orders,
    [orders, orderFilter],
  );

  const approveApplication = async (id: number) => {
    const result = await api.admin.approveApplication(id);
    setApplications((current) =>
      current.map((application) =>
        application.id === id ? result.application : application,
      ),
    );
    setShops((current) => [...current, result.shop]);
    setNotice(`Approved ${result.application.shopName}`);
    setReloadKey((current) => current + 1);
  };

  const rejectApplication = async (id: number, reason: string) => {
    const result = await api.admin.rejectApplication(id, reason);
    setApplications((current) =>
      current.map((application) =>
        application.id === id ? result.application : application,
      ),
    );
    setNotice('Application rejected and review note saved');
  };

  const toggleShop = async (shop: Shop) => {
    const next = shop.status === 'approved' ? 'suspended' : 'approved';
    try {
      const result = await api.admin.setShopStatus(shop.id, next);
      setShops((current) =>
        current.map((item) => (item.id === shop.id ? result.shop : item)),
      );
      setNotice(
        next === 'suspended'
          ? `${shop.name} suspended`
          : `${shop.name} restored`,
      );
    } catch (cause) {
      setNotice(
        cause instanceof ApiError ? cause.message : 'Could not update shop status.',
      );
    }
  };

  const updatePayment = async (order: Order, paymentStatus: PaymentStatus) => {
    setUpdatingPayment(order.id);
    setOrderActionError((current) => ({ ...current, [order.reference]: '' }));
    try {
      const result = await api.admin.setPaymentStatus(order.id, paymentStatus);
      setOrders((current) =>
        current.map((item) => (item.id === result.order.id ? result.order : item)),
      );
      setNotice(`Payment marked ${paymentStatus}`);
    } catch (cause) {
      setOrderActionError((current) => ({
        ...current,
        [order.reference]:
          cause instanceof ApiError ? cause.message : 'Could not update payment.',
      }));
    } finally {
      setUpdatingPayment(null);
    }
  };

  const updateGroup = async (order: Order, groupId: number, status: string) => {
    setUpdatingGroup(groupId);
    setOrderActionError((current) => ({ ...current, [order.reference]: '' }));
    try {
      const result = await api.admin.updateFulfilment(
        groupId,
        status as OrderStatus,
        `Administrator updated fulfilment to ${status}.`,
      );
      setOrders((current) =>
        current.map((item) => (item.id === result.order.id ? result.order : item)),
      );
      setGroupDrafts((current) => ({ ...current, [groupId]: status }));
      setNotice(`Fulfilment updated to ${status}`);
    } catch (cause) {
      setOrderActionError((current) => ({
        ...current,
        [order.reference]:
          cause instanceof ApiError ? cause.message : 'Could not update fulfilment.',
      }));
    } finally {
      setUpdatingGroup(null);
    }
  };

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault();
    const threshold = Number(settingsForm.freeShippingThreshold);
    const fee = Number(settingsForm.shippingFee);
    const rate = Number(settingsForm.promoRate);
    if (!Number.isInteger(threshold) || threshold < 0) {
      setSettingsError('Enter a valid free-shipping threshold.');
      return;
    }
    if (!Number.isInteger(fee) || fee < 0) {
      setSettingsError('Enter a valid shipping fee.');
      return;
    }
    if (!Number.isFinite(rate) || rate < 0 || rate > 0.9) {
      setSettingsError('Promo rate must be between 0 and 0.9.');
      return;
    }
    if (settingsForm.promoCode.trim().length < 3) {
      setSettingsError('Enter a promo code of at least 3 characters.');
      return;
    }

    setSettingsSaving(true);
    setSettingsError('');
    try {
      const result = await api.admin.updateSettings({
        freeShippingThreshold: threshold,
        shippingFee: fee,
        promoCode: settingsForm.promoCode.trim().toUpperCase(),
        promoRate: rate,
        applicationsOpen: settingsForm.applicationsOpen,
      });
      setSettings(result.settings);
      setCommerceSettings(result.settings);
      setNotice('Marketplace settings saved');
    } catch (cause) {
      setSettingsError(
        cause instanceof ApiError ? cause.message : 'Could not save settings.',
      );
    } finally {
      setSettingsSaving(false);
    }
  };

  if (loading && !stats) {
    return (
      <section className="page-section shell">
        <div className="page-loading" role="status">
          <span className="spinner" />
          <p>Opening administration…</p>
        </div>
      </section>
    );
  }

  if (error && !stats) {
    return (
      <section className="page-section shell">
        <div className="empty-state glass">
          <span className="empty-icon" aria-hidden="true">
            <ShieldCheck size={24} />
          </span>
          <h1>Administration unavailable</h1>
          <p>{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => void load()}>
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      </section>
    );
  }

  const tabs: Array<{ id: AdminTab; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    {
      id: 'applications',
      label: 'Applications',
      count: pendingApplications.length,
    },
    { id: 'shops', label: 'Shops', count: shops.length },
    { id: 'orders', label: 'Orders', count: orders.length },
    { id: 'products', label: 'Products', count: products.length },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <section className="page-section shell dashboard-page admin-page">
      <PageHeader
        eyebrow="Administration"
        title={
          <>
            Marketplace control<span>.</span>
          </>
        }
        description="Review seller applications, manage shops, moderate the catalogue and oversee order fulfilment. Every action is checked against an administrator session on the server."
        actions={
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setReloadKey((current) => current + 1)}
          >
            <RefreshCw size={15} />
            Refresh data
          </button>
        }
      />

      {notice && (
        <div className="inline-notice" role="status">
          <Check size={15} />
          {notice}
        </div>
      )}
      {error && (
        <div className="dashboard-warning" role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>Some data could not be refreshed</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="dashboard-tabs" role="tablist" aria-label="Administration">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'is-active' : ''}
            onClick={() => setTab(item.id)}
          >
            {item.label}
            {item.count != null && <span>{item.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && stats && (
        <div className="dashboard-stack">
          <div className="dashboard-stats admin-stats">
            <div className="stat-card">
              <span className="stat-icon"><ClipboardCheck size={17} /></span>
              <span>Pending applications</span>
              <strong>{stats.applicationsPending}</strong>
              <small>{applications.length} total applications</small>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><Store size={17} /></span>
              <span>Approved shops</span>
              <strong>{stats.shopsApproved}</strong>
              <small>{stats.shopsSuspended} suspended</small>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><Package size={17} /></span>
              <span>Live products</span>
              <strong>{stats.productsActive}</strong>
              <small>Across all approved shops</small>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><Truck size={17} /></span>
              <span>Open orders</span>
              <strong>{stats.ordersOpen}</strong>
              <small>{stats.ordersTotal} orders all time</small>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><CircleDollarSign size={17} /></span>
              <span>Recorded order value</span>
              <strong>{formatPrice(stats.grossOrderValue)}</strong>
              <small>Excludes cancelled orders</small>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><Users size={17} /></span>
              <span>Accounts</span>
              <strong>{stats.customers + stats.sellers}</strong>
              <small>{stats.customers} customers · {stats.sellers} sellers</small>
            </div>
          </div>

          <div className="overview-grid">
            <section className="panel glass">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Approval queue</p>
                  <h2>Seller applications</h2>
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setTab('applications')}
                >
                  Review queue
                  <ArrowRight size={14} />
                </button>
              </div>
              {pendingApplications.length === 0 ? (
                <p className="panel-empty">
                  No applications are waiting for review.
                </p>
              ) : (
                <div className="compact-list">
                  {pendingApplications.slice(0, 4).map((application) => (
                    <div className="compact-row" key={application.id}>
                      <div>
                        <strong>{application.shopName}</strong>
                        <span>
                          {application.applicantName} · {application.category}
                        </span>
                      </div>
                      <span className="stock-pill">In review</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel glass">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Marketplace activity</p>
                  <h2>Recent orders</h2>
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setTab('orders')}
                >
                  Manage orders
                  <ArrowRight size={14} />
                </button>
              </div>
              {orders.length === 0 ? (
                <p className="panel-empty">No orders have been placed yet.</p>
              ) : (
                <div className="compact-list">
                  {orders.slice(0, 5).map((order) => (
                    <div className="compact-row order-compact" key={order.id}>
                      <div>
                        <strong>{order.reference}</strong>
                        <span>
                          {order.customer.fullName} · {formatPrice(order.total)}
                        </span>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {tab === 'applications' && (
        <div className="dashboard-stack">
          <div className="dashboard-toolbar">
            <div className="segmented-control" role="group" aria-label="Filter applications">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  className={applicationFilter === filter ? 'is-active' : ''}
                  aria-pressed={applicationFilter === filter}
                  onClick={() => setApplicationFilter(filter)}
                >
                  {filter === 'all'
                    ? 'All'
                    : applicationLabels[filter]}
                </button>
              ))}
            </div>
            <p>{filteredApplications.length} shown</p>
          </div>

          {filteredApplications.length === 0 ? (
            <div className="empty-state glass">
              <span className="empty-icon" aria-hidden="true">
                <ClipboardCheck size={24} />
              </span>
              <h2>Nothing in this queue</h2>
              <p>There are no seller applications matching this filter.</p>
            </div>
          ) : (
            <div className="admin-applications">
              {filteredApplications.map((application) => (
                <AdminApplicationCard
                  key={application.id}
                  application={application}
                  onApprove={approveApplication}
                  onReject={rejectApplication}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'shops' && (
        <div className="dashboard-stack">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Marketplace vendors</p>
              <h2>All shops</h2>
            </div>
            <span className="panel-count">{shops.length} shops</span>
          </div>

          <div className="admin-shops">
            {shops.map((shop) => (
              <article className="admin-shop glass" key={shop.id}>
                <div className="admin-shop-identity">
                  {shop.logoUrl ? (
                    <SafeImage
                      src={shop.logoUrl}
                      alt=""
                      className="admin-shop-logo"
                      sizes="52px"
                    />
                  ) : (
                    <span className="admin-shop-logo fallback" aria-hidden="true">
                      {shop.name.charAt(0)}
                    </span>
                  )}
                  <div>
                    <h3>{shop.name}</h3>
                    <span>{shop.ownerName || 'No owner linked'}</span>
                  </div>
                </div>
                <div className="admin-shop-meta">
                  <span>{shop.category}</span>
                  <span>{shop.productCount ?? 0} products</span>
                  <span>{formatOrderDate(shop.createdAt)}</span>
                </div>
                <div className="admin-shop-actions">
                  <OrderStatusBadge
                    status={shop.status === 'approved' ? 'confirmed' : 'cancelled'}
                    label={shop.status === 'approved' ? 'Approved' : 'Suspended'}
                  />
                  <Link className="text-link" to={`/shops/${shop.slug}`}>
                    View shop <ExternalLink size={12} />
                  </Link>
                  <button
                    type="button"
                    className={
                      shop.status === 'approved'
                        ? 'btn btn-ghost btn-small is-danger'
                        : 'btn btn-ghost btn-small'
                    }
                    onClick={() => void toggleShop(shop)}
                  >
                    {shop.status === 'approved' ? 'Suspend shop' : 'Restore shop'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="dashboard-stack">
          <div className="dashboard-toolbar">
            <div>
              <h2>Marketplace orders</h2>
              <p>Open an order to manage payment and per-shop fulfilment.</p>
            </div>
            <label className="filter-select">
              <span>Status</span>
              <div className="select-wrap">
                <select
                  value={orderFilter}
                  onChange={(event) => setOrderFilter(event.target.value)}
                >
                  <option value="">All orders</option>
                  {Object.entries(ORDER_STATUS_LABELS).map(([status, label]) => (
                    <option key={status} value={status}>
                      {label}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} aria-hidden="true" />
              </div>
            </label>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="empty-state glass">
              <span className="empty-icon" aria-hidden="true">
                <Truck size={24} />
              </span>
              <h2>No orders match this view</h2>
              <p>Orders will appear here as customers check out.</p>
            </div>
          ) : (
            <div className="admin-orders">
              {filteredOrders.map((order) => {
                const open = expandedOrder === order.reference;
                return (
                  <article className="admin-order glass" key={order.id}>
                    <button
                      type="button"
                      className="admin-order-head"
                      onClick={() =>
                        setExpandedOrder(open ? null : order.reference)
                      }
                      aria-expanded={open}
                    >
                      <div>
                        <p className="eyebrow">{formatOrderDate(order.createdAt)}</p>
                        <h3>{order.reference}</h3>
                        <span>
                          {order.customer.fullName} · {order.items.length} items ·{' '}
                          {order.groups.length} shops
                        </span>
                      </div>
                      <div className="admin-order-total">
                        <strong>{formatPrice(order.total)}</strong>
                        <div className="detail-badges">
                          <OrderStatusBadge status={order.status} />
                          <OrderStatusBadge
                            status={order.paymentStatus}
                            label={PAYMENT_STATUS_LABELS[order.paymentStatus]}
                          />
                        </div>
                      </div>
                      <ChevronDown
                        size={18}
                        className={open ? 'chevron-open' : ''}
                        aria-hidden="true"
                      />
                    </button>

                    {open && (
                      <div className="admin-order-detail">
                        <div className="detail-two-col">
                          <div className="detail-address">
                            <h4>Customer</h4>
                            <p>
                              {order.customer.fullName}
                              <br />
                              {order.customer.email}
                              <br />
                              {order.customer.phone}
                            </p>
                          </div>
                          <div className="detail-address">
                            <h4>Shipping</h4>
                            <p>
                              {order.shippingAddress.address}
                              <br />
                              {order.shippingAddress.city},{' '}
                              {order.shippingAddress.state}{' '}
                              {order.shippingAddress.postalCode}
                              <br />
                              {order.shippingAddress.country}
                            </p>
                          </div>
                        </div>

                        <div className="admin-order-toolbar">
                          <div>
                            <span>Payment</span>
                            <div className="select-wrap">
                              <select
                                value={order.paymentStatus}
                                onChange={(event) =>
                                  void updatePayment(
                                    order,
                                    event.target.value as PaymentStatus,
                                  )
                                }
                                disabled={updatingPayment === order.id}
                              >
                                <option value="pending">Pending</option>
                                <option value="paid">Paid</option>
                                <option value="refunded">Refunded</option>
                              </select>
                              <ChevronDown size={14} aria-hidden="true" />
                            </div>
                          </div>
                          <div className="admin-order-money">
                            <span>Subtotal {formatPrice(order.subtotal)}</span>
                            <span>Shipping {formatPrice(order.shipping)}</span>
                            <strong>Total {formatPrice(order.total)}</strong>
                          </div>
                        </div>

                        <div className="admin-groups">
                          {order.groups.map((group) => {
                            const locked =
                              group.status === 'delivered' ||
                              group.status === 'cancelled';
                            return (
                              <div className="admin-group" key={group.id}>
                                <div className="admin-group-head">
                                  <div>
                                    <h4>{group.shopName}</h4>
                                    <span>
                                      {group.items.length} items ·{' '}
                                      {formatPrice(
                                        group.items.reduce(
                                          (total, item) => total + item.lineTotal,
                                          0,
                                        ),
                                      )}
                                    </span>
                                  </div>
                                  <OrderStatusBadge status={group.status} />
                                </div>
                                <div className="admin-group-items">
                                  {group.items.map((item) => (
                                    <div key={item.id}>
                                      <span>
                                        {item.quantity} × {item.name}
                                      </span>
                                      <strong>{formatPrice(item.lineTotal)}</strong>
                                    </div>
                                  ))}
                                </div>
                                {!locked && (
                                  <div className="admin-group-controls">
                                    <div className="select-wrap">
                                      <select
                                        value={
                                          groupDrafts[group.id] || group.status
                                        }
                                        onChange={(event) =>
                                          setGroupDrafts((current) => ({
                                            ...current,
                                            [group.id]: event.target.value,
                                          }))
                                        }
                                        disabled={updatingGroup === group.id}
                                      >
                                        {SELLER_STATUS_OPTIONS.map((status) => (
                                          <option key={status} value={status}>
                                            {status.charAt(0).toUpperCase() +
                                              status.slice(1)}
                                          </option>
                                        ))}
                                      </select>
                                      <ChevronDown size={14} aria-hidden="true" />
                                    </div>
                                    <button
                                      type="button"
                                      className="btn btn-ghost btn-small"
                                      onClick={() =>
                                        void updateGroup(
                                          order,
                                          group.id,
                                          groupDrafts[group.id] || group.status,
                                        )
                                      }
                                      disabled={
                                        updatingGroup === group.id ||
                                        (groupDrafts[group.id] || group.status) ===
                                          group.status
                                      }
                                    >
                                      {updatingGroup === group.id ? (
                                        <LoaderCircle size={14} className="spin" />
                                      ) : (
                                        <Check size={14} />
                                      )}
                                      Update group
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="admin-order-events">
                          {order.events.slice(-5).reverse().map((event) => (
                            <div key={event.id}>
                              <span aria-hidden="true" />
                              <p>{event.note}</p>
                              <time dateTime={event.createdAt}>
                                {formatDateTime(event.createdAt)}
                              </time>
                            </div>
                          ))}
                        </div>

                        {orderActionError[order.reference] && (
                          <p className="field-error" role="alert">
                            {orderActionError[order.reference]}
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'products' && (
        <div className="dashboard-stack">
          <div className="dashboard-toolbar">
            <div>
              <h2>All products</h2>
              <p>
                Moderate visibility, price and stock across every shop. Seller
                descriptions and images remain owned by each shop.
              </p>
            </div>
            <span className="panel-count">{products.length} products</span>
          </div>

          <div className="admin-products glass">
            {products.map((product) => (
              <AdminProductRow
                key={product.id}
                product={product}
                onSaved={(saved) => {
                  setProducts((current) =>
                    current.map((item) =>
                      item.id === saved.id ? saved : item,
                    ),
                  );
                  setNotice(`${saved.name} saved`);
                }}
              />
            ))}
          </div>
        </div>
      )}

      {tab === 'settings' && settings && (
        <form className="settings-panel glass" onSubmit={saveSettings} noValidate>
          <div className="panel-head">
            <div>
              <p className="eyebrow">Marketplace economics</p>
              <h2>Commerce settings</h2>
            </div>
            <Settings2 size={18} />
          </div>

          <div className="settings-grid">
            <div>
              <label htmlFor="admin-threshold">Free-shipping threshold (INR)</label>
              <input
                id="admin-threshold"
                type="number"
                min="0"
                step="1"
                value={settingsForm.freeShippingThreshold}
                onChange={(event) => {
                  setSettingsForm((current) => ({
                    ...current,
                    freeShippingThreshold: event.target.value,
                  }));
                  setSettingsError('');
                }}
              />
              <p className="field-hint">
                Shipping becomes complimentary at or above this discounted
                subtotal.
              </p>
            </div>

            <div>
              <label htmlFor="admin-shipping">Shipping fee (INR)</label>
              <input
                id="admin-shipping"
                type="number"
                min="0"
                step="1"
                value={settingsForm.shippingFee}
                onChange={(event) => {
                  setSettingsForm((current) => ({
                    ...current,
                    shippingFee: event.target.value,
                  }));
                  setSettingsError('');
                }}
              />
            </div>

            <div>
              <label htmlFor="admin-promo-code">Promo code</label>
              <input
                id="admin-promo-code"
                value={settingsForm.promoCode}
                onChange={(event) => {
                  setSettingsForm((current) => ({
                    ...current,
                    promoCode: event.target.value.toUpperCase(),
                  }));
                  setSettingsError('');
                }}
                maxLength={24}
              />
            </div>

            <div>
              <label htmlFor="admin-promo-rate">Discount rate</label>
              <input
                id="admin-promo-rate"
                type="number"
                min="0"
                max="0.9"
                step="0.01"
                value={settingsForm.promoRate}
                onChange={(event) => {
                  setSettingsForm((current) => ({
                    ...current,
                    promoRate: event.target.value,
                  }));
                  setSettingsError('');
                }}
              />
              <p className="field-hint">Use a decimal: 0.1 is a 10% discount.</p>
            </div>
          </div>

          <label className="switch-field">
            <input
              type="checkbox"
              checked={settingsForm.applicationsOpen}
              onChange={(event) =>
                setSettingsForm((current) => ({
                  ...current,
                  applicationsOpen: event.target.checked,
                }))
              }
            />
            <span className="switch-track" aria-hidden="true">
              <span />
            </span>
            <span>
              <strong>Accept seller applications</strong>
              <small>
                When off, the application form is closed for customer accounts.
              </small>
            </span>
          </label>

          {settingsError && (
            <div className="form-alert" role="alert">
              {settingsError}
            </div>
          )}

          <div className="settings-actions">
            <p>
              Orders already placed keep the totals calculated when they were
              created.
            </p>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={settingsSaving}
            >
              {settingsSaving ? (
                <>
                  <LoaderCircle size={16} className="spin" />
                  Saving…
                </>
              ) : (
                <>
                  Save settings
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export function AdminDashboardPage() {
  return (
    <RequireAuth
      title="Administrator sign-in required"
      description="Marketplace administration is restricted to administrator accounts and enforced by the server for every request."
      allowRoles={['admin']}
    >
      <AdminDashboardContent />
    </RequireAuth>
  );
}
