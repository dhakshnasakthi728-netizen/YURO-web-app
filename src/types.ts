export type Role = 'customer' | 'seller' | 'admin';

export type ShopStatus = 'approved' | 'suspended';

export type ShopSummary = {
  id: number;
  slug: string;
  name: string;
  status: ShopStatus;
  logoUrl: string;
  bannerUrl: string;
};

export type AuthUser = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  createdAt: string;
  shop: ShopSummary | null;
};

export type Product = {
  id: number;
  name: string;
  category: string;
  price: number;
  image: string;
  description: string;
  featured: boolean;
  newArrival: boolean;
  stock: number;
  active: boolean;
  shopId: number;
  shopName: string;
  shopSlug: string;
  shopStatus: ShopStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type CartItem = {
  productId: number;
  quantity: number;
};

export type CartLine = {
  product: Product;
  quantity: number;
  lineTotal: number;
};

export type CartTotals = {
  itemCount: number;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  freeShippingRemaining: number;
};

export type CommerceSettings = {
  freeShippingThreshold: number;
  shippingFee: number;
  promoCode: string;
  promoRate: number;
  applicationsOpen: boolean;
  marketplaceName: string;
};

export type CheckoutForm = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type CheckoutErrors = Partial<Record<keyof CheckoutForm, string>>;

export type CheckoutStep = 1 | 2 | 3 | 4;

export type OrderStatus =
  | 'placed'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

export type PaymentStatus = 'pending' | 'paid' | 'refunded';

export type PaymentMethod = 'cod';

export type OrderEvent = {
  id: number;
  groupId: number | null;
  status: string;
  note: string;
  createdAt: string;
};

export type OrderItem = {
  id: number;
  productId: number;
  shopId: number;
  shopName: string;
  shopSlug: string;
  name: string;
  category: string;
  image: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type OrderGroup = {
  id: number;
  shopId: number;
  shopName: string;
  shopSlug: string;
  status: OrderStatus;
  updatedAt: string;
  items: OrderItem[];
  events: OrderEvent[];
};

export type Order = {
  id: number;
  reference: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  promoCode: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };
  shippingAddress: {
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  items: OrderItem[];
  groups: OrderGroup[];
  events: OrderEvent[];
};

export type SellerOrder = {
  id: number;
  reference: string;
  createdAt: string;
  paymentStatus: PaymentStatus;
  customer: {
    fullName: string;
    email: string;
    phone: string;
  };
  shippingAddress: Order['shippingAddress'];
  group: {
    id: number;
    status: OrderStatus;
    updatedAt: string;
    items: Omit<OrderItem, 'shopId' | 'shopName' | 'shopSlug'>[];
    events: OrderEvent[];
    subtotal: number;
  };
};

export type Shop = {
  id: number;
  slug: string;
  name: string;
  description: string;
  category: string;
  logoUrl: string;
  bannerUrl: string;
  contactEmail?: string;
  contactPhone?: string;
  status: ShopStatus;
  ownerUserId: number | null;
  ownerName: string | null;
  ownerEmail?: string | null;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationStatus = 'pending' | 'approved' | 'rejected';

export type SellerApplication = {
  id: number;
  reference: string;
  userId: number;
  applicantName: string | null;
  applicantEmail: string | null;
  shopName: string;
  description: string;
  category: string;
  contactEmail: string;
  contactPhone: string;
  websiteUrl: string;
  logoUrl: string;
  bannerUrl: string;
  status: ApplicationStatus;
  rejectionReason: string;
  reviewedAt: string | null;
  createdAt: string;
};

export type AdminStats = {
  applicationsPending: number;
  shopsApproved: number;
  shopsSuspended: number;
  productsActive: number;
  ordersTotal: number;
  ordersOpen: number;
  grossOrderValue: number;
  customers: number;
  sellers: number;
};

export type ApiFieldErrors = Record<string, string>;
