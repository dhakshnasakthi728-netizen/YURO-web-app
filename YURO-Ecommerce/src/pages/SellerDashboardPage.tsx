import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Archive,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  LoaderCircle,
  Package,
  Plus,
  RefreshCw,
  Settings2,
  Store,
  Truck,
  X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api, ApiError } from '../lib/api';
import type { UpsertProductPayload } from '../lib/api';
import { formatDateTime, formatPrice } from '../lib/format';
import { SELLER_STATUS_OPTIONS } from '../lib/orders';
import type {
  OrderStatus,
  Product,
  SellerOrder,
  Shop,
} from '../types';
import { ImageUploadField } from '../components/ImageUploadField';
import { OrderStatusBadge, OrderTimeline } from '../components/OrderStatus';
import { PageHeader } from '../components/PageHeader';
import { RequireAuth } from '../components/RequireAuth';
import { SafeImage } from '../components/SafeImage';

const categories = ['APPAREL', 'HOME', 'ACCESSORIES', 'FOOTWEAR'];

type DashboardTab = 'overview' | 'products' | 'orders' | 'shop';

type ProductFormState = {
  name: string;
  category: string;
  price: string;
  image: string;
  description: string;
  stock: string;
  active: boolean;
};

type ShopFormState = {
  name: string;
  description: string;
  category: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl: string;
  bannerUrl: string;
};

function productForm(product?: Product): ProductFormState {
  return {
    name: product?.name || '',
    category: product?.category || 'HOME',
    price: product ? String(product.price) : '',
    image: product?.image || '',
    description: product?.description || '',
    stock: product ? String(product.stock) : '0',
    active: product ? product.active : true,
  };
}

function ProductEditor({
  product,
  saving,
  onCancel,
  onSave,
}: {
  product?: Product;
  saving: boolean;
  onCancel: () => void;
  onSave: (payload: UpsertProductPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<ProductFormState>(() => productForm(product));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const update = <K extends keyof ProductFormState>(
    key: K,
    value: ProductFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
    setError('');
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Use at least 2 characters.';
    if (!categories.includes(form.category)) next.category = 'Choose a category.';
    const price = Number(form.price);
    if (!Number.isInteger(price) || price < 1) {
      next.price = 'Enter a price in whole rupees.';
    }
    if (!form.image) next.image = 'Add a product image.';
    if (form.description.trim().length < 10) {
      next.description = 'Use at least 10 characters.';
    }
    const stock = Number(form.stock);
    if (!Number.isInteger(stock) || stock < 0 || stock > 100000) {
      next.stock = 'Enter a valid stock count.';
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      await onSave({
        name: form.name.trim(),
        category: form.category,
        price,
        image: form.image,
        description: form.description.trim(),
        stock,
        active: form.active,
      });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not save this product. Try again.',
      );
    }
  };

  return (
    <form className="product-editor glass" onSubmit={submit} noValidate>
      <div className="product-editor-head">
        <div>
          <p className="eyebrow">{product ? 'Edit piece' : 'New piece'}</p>
          <h2>{product ? product.name : 'Add a product'}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          onClick={onCancel}
          aria-label="Close product editor"
        >
          <X size={18} />
        </button>
      </div>

      <div className="form-grid">
        <div className="form-field-full">
          <label htmlFor="seller-product-name">Product name</label>
          <input
            id="seller-product-name"
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            maxLength={120}
            placeholder="e.g. Hand-thrown stoneware cup"
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && <p className="field-error">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="seller-product-category">Category</label>
          <select
            id="seller-product-category"
            value={form.category}
            onChange={(event) => update('category', event.target.value)}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category.charAt(0) + category.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="seller-product-price">Price (INR)</label>
          <input
            id="seller-product-price"
            type="number"
            min="1"
            step="1"
            value={form.price}
            onChange={(event) => update('price', event.target.value)}
            placeholder="2400"
            aria-invalid={Boolean(errors.price)}
          />
          {errors.price && <p className="field-error">{errors.price}</p>}
        </div>

        <div>
          <label htmlFor="seller-product-stock">Stock available</label>
          <input
            id="seller-product-stock"
            type="number"
            min="0"
            step="1"
            value={form.stock}
            onChange={(event) => update('stock', event.target.value)}
            aria-invalid={Boolean(errors.stock)}
          />
          {errors.stock && <p className="field-error">{errors.stock}</p>}
        </div>

        <div className="form-field-full">
          <label htmlFor="seller-product-description">Description</label>
          <textarea
            id="seller-product-description"
            rows={4}
            maxLength={1200}
            value={form.description}
            onChange={(event) => update('description', event.target.value)}
            placeholder="Materials, dimensions, care and the story behind the piece."
            aria-invalid={Boolean(errors.description)}
          />
          {errors.description && (
            <p className="field-error">{errors.description}</p>
          )}
        </div>
      </div>

      <ImageUploadField
        id="seller-product-image"
        label="Product image"
        value={form.image}
        onChange={(value) => update('image', value)}
        shape="product"
        hint="PNG, JPG or WebP, up to 1.5 MB. A square image works best."
      />
      {errors.image && <p className="field-error">{errors.image}</p>}

      <label className="switch-field">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(event) => update('active', event.target.checked)}
        />
        <span className="switch-track" aria-hidden="true">
          <span />
        </span>
        <span>
          <strong>Visible in the marketplace</strong>
          <small>Turn off to hide the piece without archiving it.</small>
        </span>
      </label>

      {error && (
        <div className="form-alert" role="alert">
          {error}
        </div>
      )}

      <div className="product-editor-actions">
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? (
            <>
              <LoaderCircle size={16} className="spin" />
              Saving…
            </>
          ) : (
            <>
              {product ? 'Save changes' : 'Publish product'}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function SellerDashboardContent() {
  const { user, refresh } = useAuth();
  const [tab, setTab] = useState<DashboardTab>('overview');
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [editingProduct, setEditingProduct] = useState<Product | 'new' | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [archiveCandidate, setArchiveCandidate] = useState<number | null>(null);
  const [statusDrafts, setStatusDrafts] = useState<Record<number, string>>({});
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [updatingGroup, setUpdatingGroup] = useState<number | null>(null);
  const [orderError, setOrderError] = useState<Record<number, string>>({});

  const [shopForm, setShopForm] = useState<ShopFormState>({
    name: '',
    description: '',
    category: 'HOME',
    contactEmail: '',
    contactPhone: '',
    logoUrl: '',
    bannerUrl: '',
  });
  const [shopErrors, setShopErrors] = useState<Record<string, string>>({});
  const [shopSaving, setShopSaving] = useState(false);
  const [shopError, setShopError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [shopResult, productsResult, ordersResult] = await Promise.all([
        api.seller.shop(),
        api.seller.products(),
        api.seller.orders(),
      ]);
      setShop(shopResult.shop);
      setProducts(productsResult.products);
      setOrders(ordersResult.orders);
      setShopForm({
        name: shopResult.shop.name,
        description: shopResult.shop.description,
        category: shopResult.shop.category,
        contactEmail: shopResult.shop.contactEmail || '',
        contactPhone: shopResult.shop.contactPhone || '',
        logoUrl: shopResult.shop.logoUrl || '',
        bannerUrl: shopResult.shop.bannerUrl || '',
      });
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not load your seller workspace.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey, user?.id]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const stats = useMemo(() => {
    const active = products.filter((product) => product.active);
    return {
      products: products.length,
      active: active.length,
      lowStock: active.filter((product) => product.stock > 0 && product.stock <= 3)
        .length,
      soldOut: active.filter((product) => product.stock === 0).length,
      openOrders: orders.filter(
        (order) => !['delivered', 'cancelled'].includes(order.group.status),
      ).length,
    };
  }, [products, orders]);

  const shopSuspended = shop?.status === 'suspended';

  const saveProduct = async (payload: UpsertProductPayload) => {
    setSavingProduct(true);
    try {
      if (editingProduct && editingProduct !== 'new') {
        const result = await api.seller.updateProduct(editingProduct.id, payload);
        setProducts((current) =>
          current.map((product) =>
            product.id === result.product.id ? result.product : product,
          ),
        );
        setNotice('Product updated');
      } else {
        const result = await api.seller.createProduct(payload);
        setProducts((current) => [result.product, ...current]);
        setNotice('Product published');
      }
      setEditingProduct(null);
    } finally {
      setSavingProduct(false);
    }
  };

  const archiveProduct = async (productId: number) => {
    try {
      await api.seller.deleteProduct(productId);
      setProducts((current) =>
        current.map((product) =>
          product.id === productId ? { ...product, active: false } : product,
        ),
      );
      setArchiveCandidate(null);
      setNotice('Product archived');
    } catch (cause) {
      setNotice(
        cause instanceof ApiError ? cause.message : 'Could not archive product.',
      );
    }
  };

  const updateFulfilment = async (order: SellerOrder) => {
    const status = (statusDrafts[order.group.id] ||
      order.group.status) as OrderStatus;
    if (status === order.group.status) {
      setOrderError((current) => ({
        ...current,
        [order.group.id]: 'Choose a different status to update.',
      }));
      return;
    }
    setUpdatingGroup(order.group.id);
    setOrderError((current) => ({ ...current, [order.group.id]: '' }));
    try {
      const result = await api.seller.updateFulfilment(
        order.group.id,
        status,
        notes[order.group.id] || undefined,
      );
      setOrders((current) =>
        current.map((item) =>
          item.group.id === result.order.group.id ? result.order : item,
        ),
      );
      setNotes((current) => ({ ...current, [order.group.id]: '' }));
      setStatusDrafts((current) => ({
        ...current,
        [order.group.id]: result.order.group.status,
      }));
      setNotice(`Fulfilment updated to ${result.order.group.status}`);
    } catch (cause) {
      setOrderError((current) => ({
        ...current,
        [order.group.id]:
          cause instanceof ApiError
            ? cause.message
            : 'Could not update fulfilment.',
      }));
    } finally {
      setUpdatingGroup(null);
    }
  };

  const updateShopField = (key: keyof ShopFormState, value: string) => {
    setShopForm((current) => ({ ...current, [key]: value }));
    setShopErrors((current) => ({ ...current, [key]: '' }));
    setShopError('');
  };

  const saveShop = async (event: FormEvent) => {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (shopForm.name.trim().length < 3) next.name = 'Use at least 3 characters.';
    if (shopForm.description.trim().length < 20) {
      next.description = 'Use at least 20 characters.';
    }
    if (!categories.includes(shopForm.category)) next.category = 'Choose a category.';
    if (!shopForm.contactEmail.includes('@')) {
      next.contactEmail = 'Enter a valid contact email.';
    }
    if (shopForm.contactPhone.replace(/\D/g, '').length < 7) {
      next.contactPhone = 'Enter a valid contact phone.';
    }
    setShopErrors(next);
    if (Object.keys(next).length > 0) return;

    setShopSaving(true);
    setShopError('');
    try {
      const result = await api.seller.updateShop({
        name: shopForm.name.trim(),
        description: shopForm.description.trim(),
        category: shopForm.category,
        contactEmail: shopForm.contactEmail.trim(),
        contactPhone: shopForm.contactPhone.trim(),
        logoUrl: shopForm.logoUrl,
        bannerUrl: shopForm.bannerUrl,
      });
      setShop(result.shop);
      setNotice('Shop details saved');
      void refresh();
    } catch (cause) {
      setShopError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not save shop details.',
      );
    } finally {
      setShopSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="page-section shell">
        <div className="page-loading" role="status">
          <span className="spinner" />
          <p>Opening your shop workspace…</p>
        </div>
      </section>
    );
  }

  if (error || !shop) {
    return (
      <section className="page-section shell">
        <div className="empty-state glass">
          <span className="empty-icon" aria-hidden="true">
            <Store size={24} />
          </span>
          <h1>Seller workspace unavailable</h1>
          <p>{error || 'No shop is linked to this seller account.'}</p>
          <button type="button" className="btn btn-primary" onClick={() => void load()}>
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      </section>
    );
  }

  const tabs: Array<{ id: DashboardTab; label: string; count?: number }> = [
    { id: 'overview', label: 'Overview' },
    { id: 'products', label: 'Products', count: products.length },
    { id: 'orders', label: 'Orders', count: stats.openOrders },
    { id: 'shop', label: 'Shop settings' },
  ];

  return (
    <section className="page-section shell dashboard-page">
      <PageHeader
        eyebrow="Seller workspace"
        title={
          <>
            {shop.name}<span>.</span>
          </>
        }
        description="Manage your collection, stock and the fulfilment of your own order items."
        actions={
          <div className="page-header-buttons">
            <Link className="btn btn-ghost" to={`/shops/${shop.slug}`}>
              <ArrowUpRight size={15} />
              View shop
            </Link>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
        }
      />

      {shopSuspended && (
        <div className="dashboard-warning" role="alert">
          <AlertTriangle size={18} />
          <div>
            <strong>Your shop is suspended</strong>
            <p>
              Products remain visible to you but publishing, shop edits and
              fulfilment updates are blocked by the server until an
              administrator restores access.
            </p>
          </div>
        </div>
      )}

      {notice && (
        <div className="inline-notice" role="status">
          <Check size={15} />
          {notice}
        </div>
      )}

      <div className="dashboard-tabs" role="tablist" aria-label="Seller dashboard">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'is-active' : ''}
            onClick={() => {
              setTab(item.id);
              setEditingProduct(null);
            }}
          >
            {item.label}
            {item.count != null && <span>{item.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="dashboard-stack">
          <div className="dashboard-stats">
            <div className="stat-card">
              <span className="stat-icon"><Package size={17} /></span>
              <span>Published pieces</span>
              <strong>{stats.active}</strong>
              <small>{stats.products} total in catalogue</small>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><AlertTriangle size={17} /></span>
              <span>Low or no stock</span>
              <strong>{stats.lowStock + stats.soldOut}</strong>
              <small>{stats.soldOut} sold out, {stats.lowStock} low</small>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><Truck size={17} /></span>
              <span>Open order groups</span>
              <strong>{stats.openOrders}</strong>
              <small>Across {orders.length} customer orders</small>
            </div>
            <div className="stat-card">
              <span className="stat-icon"><Store size={17} /></span>
              <span>Shop status</span>
              <strong className={shopSuspended ? 'is-warning' : ''}>
                {shopSuspended ? 'Paused' : 'Approved'}
              </strong>
              <small>{shop.category}</small>
            </div>
          </div>

          <div className="overview-grid">
            <section className="panel glass">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Inventory attention</p>
                  <h2>Pieces to review</h2>
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setTab('products')}
                >
                  All products
                  <ArrowRight size={14} />
                </button>
              </div>
              {products.filter((product) => product.active && product.stock <= 3)
                .length === 0 ? (
                <p className="panel-empty">Every published piece has healthy stock.</p>
              ) : (
                <div className="compact-list">
                  {products
                    .filter((product) => product.active && product.stock <= 3)
                    .slice(0, 5)
                    .map((product) => (
                      <div className="compact-row" key={product.id}>
                        <SafeImage
                          src={product.image}
                          alt=""
                          className="compact-img"
                          sizes="44px"
                        />
                        <div>
                          <strong>{product.name}</strong>
                          <span>{formatPrice(product.price)}</span>
                        </div>
                        <span className={product.stock === 0 ? 'stock-pill is-out' : 'stock-pill'}>
                          {product.stock === 0 ? 'Sold out' : `${product.stock} left`}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </section>

            <section className="panel glass">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Fulfilment</p>
                  <h2>Recent orders</h2>
                </div>
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setTab('orders')}
                >
                  All orders
                  <ArrowRight size={14} />
                </button>
              </div>
              {orders.length === 0 ? (
                <p className="panel-empty">No orders for your shop yet.</p>
              ) : (
                <div className="compact-list">
                  {orders.slice(0, 5).map((order) => (
                    <div className="compact-row order-compact" key={order.group.id}>
                      <div>
                        <strong>{order.reference}</strong>
                        <span>{order.customer.fullName}</span>
                      </div>
                      <OrderStatusBadge status={order.group.status} />
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {tab === 'products' && (
        <div className="dashboard-stack">
          {editingProduct && (
            <ProductEditor
              product={
                editingProduct === 'new' ? undefined : editingProduct
              }
              saving={savingProduct}
              onCancel={() => setEditingProduct(null)}
              onSave={saveProduct}
            />
          )}

          {!editingProduct && (
            <div className="dashboard-toolbar">
              <p>
                {products.length} {products.length === 1 ? 'piece' : 'pieces'} in
                your shop
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setEditingProduct('new')}
                disabled={shopSuspended}
              >
                <Plus size={16} />
                Add product
              </button>
            </div>
          )}

          {shopSuspended && (
            <p className="permission-note">
              Publishing is blocked while your shop is suspended.
            </p>
          )}

          {products.length === 0 && !editingProduct ? (
            <div className="empty-state glass">
              <span className="empty-icon" aria-hidden="true">
                <Package size={24} />
              </span>
              <h2>Your shop is ready for its first piece</h2>
              <p>Publish a product with a clear description, image and stock count.</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setEditingProduct('new')}
              >
                <Plus size={16} />
                Add product
              </button>
            </div>
          ) : (
            <div className="seller-product-list">
              {products.map((product) => (
                <article className="seller-product glass" key={product.id}>
                  <SafeImage
                    src={product.image}
                    alt={product.name}
                    className="seller-product-img"
                    sizes="120px"
                  />
                  <div className="seller-product-copy">
                    <p className="eyebrow">
                      {product.category} · {product.id}
                    </p>
                    <h3>{product.name}</h3>
                    <div className="seller-product-meta">
                      <strong>{formatPrice(product.price)}</strong>
                      <span>{product.stock} in stock</span>
                      <span className={product.active ? 'is-live' : 'is-hidden'}>
                        {product.active ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                  </div>
                  <div className="seller-product-actions">
                    {archiveCandidate === product.id ? (
                      <div className="archive-confirm">
                        <span>Archive this piece?</span>
                        <button
                          type="button"
                          className="text-link is-danger"
                          onClick={() => void archiveProduct(product.id)}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="text-link"
                          onClick={() => setArchiveCandidate(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="btn btn-ghost btn-small"
                          onClick={() => setEditingProduct(product)}
                          disabled={shopSuspended}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="icon-button"
                          onClick={() => setArchiveCandidate(product.id)}
                          disabled={shopSuspended || !product.active}
                          aria-label={`Archive ${product.name}`}
                        >
                          <Archive size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div className="dashboard-stack">
          <div className="panel-head">
            <div>
              <p className="eyebrow">Your fulfilment</p>
              <h2>Order groups</h2>
            </div>
            <button
              type="button"
              className="text-link"
              onClick={() => setRefreshKey((current) => current + 1)}
            >
              <RefreshCw size={14} />
              Refresh orders
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="empty-state glass">
              <span className="empty-icon" aria-hidden="true">
                <Truck size={24} />
              </span>
              <h2>No orders yet</h2>
              <p>
                When a customer orders from your shop, only your items and
                delivery details will appear here.
              </p>
            </div>
          ) : (
            <div className="seller-orders">
              {orders.map((order) => {
                const locked =
                  order.group.status === 'delivered' ||
                  order.group.status === 'cancelled';
                return (
                  <article className="seller-order glass" key={order.group.id}>
                    <div className="seller-order-head">
                      <div>
                        <p className="eyebrow">Order {order.reference}</p>
                        <h3>{order.customer.fullName}</h3>
                        <span>{formatDateTime(order.createdAt)}</span>
                      </div>
                      <div className="detail-badges">
                        <OrderStatusBadge status={order.group.status} />
                        <OrderStatusBadge
                          status={order.paymentStatus}
                          label={`Payment ${order.paymentStatus}`}
                        />
                      </div>
                    </div>

                    <OrderTimeline status={order.group.status} compact />

                    <div className="seller-order-grid">
                      <div>
                        <div className="fulfilment-items">
                          {order.group.items.map((item) => (
                            <div className="fulfilment-item" key={item.id}>
                              <SafeImage
                                src={item.image}
                                alt={item.name}
                                className="fulfilment-img"
                                sizes="56px"
                              />
                              <div>
                                <p>{item.name}</p>
                                <span>{formatPrice(item.unitPrice)} × {item.quantity}</span>
                              </div>
                              <strong>{formatPrice(item.lineTotal)}</strong>
                            </div>
                          ))}
                        </div>
                        <div className="seller-order-subtotal">
                          <span>Your items</span>
                          <strong>{formatPrice(order.group.subtotal)}</strong>
                        </div>
                      </div>

                      <div className="seller-address">
                        <h4>Deliver to</h4>
                        <p>
                          {order.customer.fullName}
                          <br />
                          {order.shippingAddress.address}
                          <br />
                          {order.shippingAddress.city},{' '}
                          {order.shippingAddress.state}{' '}
                          {order.shippingAddress.postalCode}
                          <br />
                          {order.shippingAddress.country}
                        </p>
                        <p className="seller-contact">
                          {order.customer.phone}
                          <br />
                          {order.customer.email}
                        </p>
                      </div>
                    </div>

                    {!locked && (
                      <div className="fulfilment-update">
                        <div className="fulfilment-controls">
                          <label>
                            <span>Fulfilment status</span>
                            <div className="select-wrap">
                              <select
                                value={
                                  statusDrafts[order.group.id] || order.group.status
                                }
                                onChange={(event) =>
                                  setStatusDrafts((current) => ({
                                    ...current,
                                    [order.group.id]: event.target.value,
                                  }))
                                }
                                disabled={updatingGroup === order.group.id}
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
                          </label>
                          <label>
                            <span>Note (optional)</span>
                            <input
                              value={notes[order.group.id] || ''}
                              onChange={(event) =>
                                setNotes((current) => ({
                                  ...current,
                                  [order.group.id]: event.target.value,
                                }))
                              }
                              maxLength={300}
                              placeholder="e.g. Handed to courier"
                              disabled={updatingGroup === order.group.id}
                            />
                          </label>
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => void updateFulfilment(order)}
                            disabled={
                              updatingGroup === order.group.id || shopSuspended
                            }
                          >
                            {updatingGroup === order.group.id ? (
                              <LoaderCircle size={15} className="spin" />
                            ) : (
                              <Check size={15} />
                            )}
                            Update
                          </button>
                        </div>
                        {orderError[order.group.id] && (
                          <p className="field-error" role="alert">
                            {orderError[order.group.id]}
                          </p>
                        )}
                        <p className="permission-note">
                          Only your shop&apos;s items and status are updated. The
                          overall customer order is recalculated by the server.
                        </p>
                      </div>
                    )}

                    {order.group.events.length > 0 && (
                      <div className="group-events">
                        {[...order.group.events]
                          .slice(-3)
                          .reverse()
                          .map((event) => (
                            <div className="group-event" key={event.id}>
                              <span aria-hidden="true" />
                              <p>{event.note}</p>
                              <time dateTime={event.createdAt}>
                                {formatDateTime(event.createdAt)}
                              </time>
                            </div>
                          ))}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === 'shop' && (
        <form className="shop-settings glass" onSubmit={saveShop} noValidate>
          <div className="panel-head">
            <div>
              <p className="eyebrow">Public shop details</p>
              <h2>Shop settings</h2>
            </div>
            <Settings2 size={18} />
          </div>

          <div className="form-grid">
            <div className="form-field-full">
              <label htmlFor="shop-settings-name">Shop name</label>
              <input
                id="shop-settings-name"
                value={shopForm.name}
                onChange={(event) => updateShopField('name', event.target.value)}
                maxLength={80}
                disabled={shopSuspended}
                aria-invalid={Boolean(shopErrors.name)}
              />
              {shopErrors.name && <p className="field-error">{shopErrors.name}</p>}
            </div>

            <div className="form-field-full">
              <label htmlFor="shop-settings-description">Shop description</label>
              <textarea
                id="shop-settings-description"
                rows={5}
                maxLength={1200}
                value={shopForm.description}
                onChange={(event) =>
                  updateShopField('description', event.target.value)
                }
                disabled={shopSuspended}
                aria-invalid={Boolean(shopErrors.description)}
              />
              <div className="field-meta">
                <span>At least 20 characters.</span>
                <span>{shopForm.description.length}/1200</span>
              </div>
              {shopErrors.description && (
                <p className="field-error">{shopErrors.description}</p>
              )}
            </div>

            <div>
              <label htmlFor="shop-settings-category">Category</label>
              <select
                id="shop-settings-category"
                value={shopForm.category}
                onChange={(event) =>
                  updateShopField('category', event.target.value)
                }
                disabled={shopSuspended}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category.charAt(0) + category.slice(1).toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="shop-settings-phone">Contact phone</label>
              <input
                id="shop-settings-phone"
                type="tel"
                value={shopForm.contactPhone}
                onChange={(event) =>
                  updateShopField('contactPhone', event.target.value)
                }
                disabled={shopSuspended}
                aria-invalid={Boolean(shopErrors.contactPhone)}
              />
              {shopErrors.contactPhone && (
                <p className="field-error">{shopErrors.contactPhone}</p>
              )}
            </div>

            <div className="form-field-full">
              <label htmlFor="shop-settings-email">Contact email</label>
              <input
                id="shop-settings-email"
                type="email"
                value={shopForm.contactEmail}
                onChange={(event) =>
                  updateShopField('contactEmail', event.target.value)
                }
                disabled={shopSuspended}
                aria-invalid={Boolean(shopErrors.contactEmail)}
              />
              {shopErrors.contactEmail && (
                <p className="field-error">{shopErrors.contactEmail}</p>
              )}
              <p className="field-hint">Kept private from public shop pages.</p>
            </div>
          </div>

          <div className="image-fields-grid">
            <ImageUploadField
              id="shop-settings-logo"
              label="Shop logo"
              value={shopForm.logoUrl}
              onChange={(value) => updateShopField('logoUrl', value)}
              shape="logo"
            />
            <ImageUploadField
              id="shop-settings-banner"
              label="Shop banner"
              value={shopForm.bannerUrl}
              onChange={(value) => updateShopField('bannerUrl', value)}
              shape="banner"
            />
          </div>

          {shopError && (
            <div className="form-alert" role="alert">
              {shopError}
            </div>
          )}

          <div className="shop-settings-actions">
            <p>Changes appear on your public shop immediately after saving.</p>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={shopSaving || shopSuspended}
            >
              {shopSaving ? (
                <>
                  <LoaderCircle size={16} className="spin" />
                  Saving…
                </>
              ) : (
                <>
                  Save shop details
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

export function SellerDashboardPage() {
  return (
    <RequireAuth
      title="Sign in to your seller workspace"
      description="Seller tools are limited to approved shop owners and verified again by the server on every request."
      allowRoles={['seller']}
    >
      <SellerDashboardContent />
    </RequireAuth>
  );
}
