import type {
  AdminStats,
  ApiFieldErrors,
  AuthUser,
  CommerceSettings,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  SellerApplication,
  SellerOrder,
  Shop,
} from '../types';

export class ApiError extends Error {
  status: number;
  fields?: ApiFieldErrors;

  constructor(message: string, status: number, fields?: ApiFieldErrors) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(path, {
    method: options.method || 'GET',
    credentials: 'same-origin',
    headers:
      options.body === undefined
        ? { Accept: 'application/json' }
        : { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const record =
      payload && typeof payload === 'object'
        ? (payload as { error?: unknown; fields?: ApiFieldErrors })
        : {};
    throw new ApiError(
      typeof record.error === 'string'
        ? record.error
        : 'Something went wrong. Please try again.',
      response.status,
      record.fields,
    );
  }

  return (payload || {}) as T;
}

export type CreateOrderPayload = {
  items: Array<{ productId: number; quantity: number }>;
  contact: { fullName: string; email: string; phone: string };
  shippingAddress: {
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  promoCode: string;
  paymentMethod: 'cod';
  idempotencyKey: string;
};

export type UpsertProductPayload = {
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  stock: number;
  active: boolean;
  featured?: boolean;
  newArrival?: boolean;
};

export type ShopUpdatePayload = {
  name: string;
  description: string;
  category: string;
  contactEmail: string;
  contactPhone: string;
  logoUrl: string;
  bannerUrl: string;
};

const json = { 'Content-Type': 'application/json' };

export const api = {
  auth: {
    me: () => request<{ user: AuthUser | null }>('/api/auth/me'),
    login: (email: string, password: string) =>
      request<{ user: AuthUser }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      }),
    register: (fullName: string, email: string, password: string) =>
      request<{ user: AuthUser }>('/api/auth/register', {
        method: 'POST',
        body: { fullName, email, password },
      }),
    logout: () =>
      request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  },

  catalogue: {
    settings: () =>
      request<{ settings: CommerceSettings }>('/api/settings'),
    products: () => request<{ products: Product[] }>('/api/products'),
    product: (id: number) =>
      request<{ product: Product }>(`/api/products/${id}`),
    shops: () => request<{ shops: Shop[] }>('/api/shops'),
    shop: (slug: string) =>
      request<{ shop: Shop; products: Product[] }>(
        `/api/shops/${encodeURIComponent(slug)}`,
      ),
  },

  orders: {
    list: () => request<{ orders: Order[] }>('/api/orders'),
    get: (reference: string) =>
      request<{ order: Order }>(
        `/api/orders/${encodeURIComponent(reference)}`,
      ),
    create: (payload: CreateOrderPayload) =>
      request<{ order: Order; duplicate: boolean }>('/api/orders', {
        method: 'POST',
        body: payload,
      }),
  },

  account: {
    applications: () =>
      request<{ applications: SellerApplication[] }>(
        '/api/account/seller-applications',
      ),
    apply: (payload: {
      shopName: string;
      description: string;
      category: string;
      contactEmail: string;
      contactPhone: string;
      websiteUrl: string;
      logoUrl: string;
      bannerUrl: string;
    }) =>
      request<{ application: SellerApplication }>(
        '/api/account/seller-applications',
        { method: 'POST', body: payload },
      ),
  },

  seller: {
    shop: () => request<{ shop: Shop }>('/api/seller/shop'),
    updateShop: (payload: ShopUpdatePayload) =>
      request<{ shop: Shop }>('/api/seller/shop', {
        method: 'PATCH',
        body: payload,
      }),
    products: () =>
      request<{ products: Product[] }>('/api/seller/products'),
    createProduct: (payload: UpsertProductPayload) =>
      request<{ product: Product }>('/api/seller/products', {
        method: 'POST',
        body: payload,
      }),
    updateProduct: (id: number, payload: UpsertProductPayload) =>
      request<{ product: Product }>(`/api/seller/products/${id}`, {
        method: 'PATCH',
        body: payload,
      }),
    deleteProduct: (id: number) =>
      request<{ ok: boolean }>(`/api/seller/products/${id}`, {
        method: 'DELETE',
      }),
    orders: () =>
      request<{ orders: SellerOrder[] }>('/api/seller/orders'),
    updateFulfilment: (
      groupId: number,
      status: OrderStatus,
      note?: string,
    ) =>
      request<{ order: SellerOrder }>(
        `/api/seller/order-groups/${groupId}/status`,
        { method: 'PATCH', body: { status, note } },
      ),
  },

  admin: {
    stats: () => request<{ stats: AdminStats }>('/api/admin/stats'),
    applications: (status?: string) =>
      request<{ applications: SellerApplication[] }>(
        `/api/admin/applications${status ? `?status=${status}` : ''}`,
      ),
    approveApplication: (id: number) =>
      request<{ application: SellerApplication; shop: Shop }>(
        `/api/admin/applications/${id}/approve`,
        { method: 'POST', body: {} },
      ),
    rejectApplication: (id: number, reason: string) =>
      request<{ application: SellerApplication }>(
        `/api/admin/applications/${id}/reject`,
        { method: 'POST', body: { reason } },
      ),
    shops: () => request<{ shops: Shop[] }>('/api/admin/shops'),
    setShopStatus: (id: number, status: 'approved' | 'suspended') =>
      request<{ shop: Shop }>(`/api/admin/shops/${id}/status`, {
        method: 'PATCH',
        body: { status },
      }),
    products: () =>
      request<{ products: Product[] }>('/api/admin/products'),
    updateProduct: (id: number, payload: Partial<UpsertProductPayload>) =>
      request<{ product: Product }>(`/api/admin/products/${id}`, {
        method: 'PATCH',
        body: payload,
      }),
    orders: (status?: string) =>
      request<{ orders: Order[] }>(
        `/api/admin/orders${status ? `?status=${status}` : ''}`,
      ),
    order: (reference: string) =>
      request<{ order: Order }>(
        `/api/admin/orders/${encodeURIComponent(reference)}`,
      ),
    setPaymentStatus: (id: number, paymentStatus: PaymentStatus) =>
      request<{ order: Order }>(`/api/admin/orders/${id}/payment`, {
        method: 'PATCH',
        body: { paymentStatus },
      }),
    updateFulfilment: (
      groupId: number,
      status: OrderStatus,
      note?: string,
    ) =>
      request<{ order: Order }>(
        `/api/admin/order-groups/${groupId}/status`,
        {
          method: 'PATCH',
          body: { status, note },
        },
      ),
    settings: () =>
      request<{ settings: CommerceSettings }>('/api/admin/settings'),
    updateSettings: (payload: Partial<CommerceSettings>) =>
      request<{ settings: CommerceSettings }>('/api/admin/settings', {
        method: 'PATCH',
        body: payload,
      }),
  },

  uploads: {
    image: (dataUrl: string) =>
      request<{ url: string; size: number }>('/api/uploads', {
        method: 'POST',
        body: { dataUrl },
      }),
  },
};

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.readAsDataURL(file);
  });
}

export async function uploadImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    throw new ApiError('Choose a PNG, JPG or WebP image.', 422);
  }
  if (file.size > 1_500_000) {
    throw new ApiError('Images must be smaller than 1.5 MB.', 422);
  }
  const dataUrl = await readFileAsDataUrl(file);
  const result = await api.uploads.image(dataUrl);
  return result.url;
}

export { json };
