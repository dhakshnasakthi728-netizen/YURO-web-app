import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { products as fallbackProducts } from './data/products';
import { clampQuantity } from './lib/cart';
import { scrollToId, scrollToIdWhenReady } from './lib/scroll';
import { setCatalogue } from './lib/catalog';
import { getCommerceSettings, setCommerceSettings } from './lib/commerce';
import { api } from './lib/api';
import type {
  CatalogueAnchor,
  OpenCatalogueOptions,
  SortOption,
} from './lib/catalogue';
import type {
  CartItem,
  CommerceSettings,
  Order,
  Product,
  Shop,
} from './types';
import { useAuth } from './contexts/AuthContext';
import {
  loadCart,
  loadRecentlyViewed,
  loadWishlist,
  saveCart,
  saveRecentlyViewed,
  saveWishlist,
} from './lib/storage';
import { AppLayout } from './components/AppLayout';
import { AuthModal } from './components/AuthModal';
import { Toast } from './components/Toast';
import { HomePage } from './pages/HomePage';
import { CataloguePage } from './pages/CataloguePage';
import { ProductPage } from './pages/ProductPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { WishlistPage } from './pages/WishlistPage';
import { ShopsPage } from './pages/ShopsPage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { OrderDetailPage } from './pages/OrderDetailPage';
import { ShopPage } from './pages/ShopPage';
import { SellerApplicationPage } from './pages/SellerApplicationPage';
import { SellerDashboardPage } from './pages/SellerDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AccountPage } from './pages/AccountPage';
import { NotFoundPage } from './pages/NotFoundPage';

const sortOptions: SortOption[] = [
  'featured',
  'newest',
  'price-asc',
  'price-desc',
];

function readSort(value: string | null): SortOption {
  return sortOptions.includes(value as SortOption)
    ? (value as SortOption)
    : 'featured';
}

function routeTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/': 'YURO — Considered pieces from independent shops',
    '/shop': 'The shop — YURO',
    '/cart': 'Shopping bag — YURO',
    '/checkout': 'Checkout — YURO',
    '/wishlist': 'Saved pieces — YURO',
    '/shops': 'Independent shops — YURO',
    '/orders': 'My orders — YURO',
    '/account': 'My account — YURO',
    '/become-a-seller': 'Become a seller — YURO',
    '/sell': 'Become a seller — YURO',
    '/seller': 'Seller dashboard — YURO',
    '/admin': 'Administration — YURO',
  };

  if (titles[pathname]) return titles[pathname];
  if (pathname.startsWith('/product/')) return 'Piece — YURO';
  if (pathname.startsWith('/orders/')) return 'Order details — YURO';
  if (pathname.startsWith('/shops/')) return 'Shop — YURO';
  return 'YURO — Marketplace';
}

function RouteLifecycle() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    document.title = routeTitle(location.pathname);
  }, [location.pathname]);

  return null;
}

export default function App() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [products, setProducts] = useState<Product[]>(fallbackProducts);
  const [shops, setShops] = useState<Shop[]>([]);
  const [settings, setSettings] = useState<CommerceSettings>(
    getCommerceSettings(),
  );
  const [catalogueError, setCatalogueError] = useState('');
  const [catalogueLoading, setCatalogueLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>(loadCart);
  const [wishlist, setWishlist] = useState<number[]>(loadWishlist);
  const [recent, setRecent] = useState<number[]>(loadRecentlyViewed);
  const [cartPulse, setCartPulse] = useState(0);
  const [wishlistPulse, setWishlistPulse] = useState(0);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [sort, setSort] = useState<SortOption>('featured');
  const [authOpen, setAuthOpen] = useState(false);
  const [toast, setToast] = useState<{ id: number; message: string } | null>(
    null,
  );

  const toastTimer = useRef<number | null>(null);
  const authLandingRedirected = useRef(false);
  const isShopRoute = location.pathname === '/shop';

  useEffect(() => {
    if (loading) return;

    if (!user) {
      authLandingRedirected.current = false;
      return;
    }

    if (authLandingRedirected.current) return;
    authLandingRedirected.current = true;

    // Send an authenticated visitor straight to the product-first shop once.
    // After that, \"Our story\" can return to the launch page without bouncing.
    if (location.pathname === '/') {
      navigate('/shop', { replace: true });
    }
  }, [loading, location.pathname, navigate, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadMarketplace() {
      const [productResult, settingsResult, shopResult] =
        await Promise.allSettled([
          api.catalogue.products(),
          api.catalogue.settings(),
          api.catalogue.shops(),
        ]);
      if (cancelled) return;

      if (productResult.status === 'fulfilled') {
        setProducts(productResult.value.products);
        setCatalogue(productResult.value.products);
      }
      if (settingsResult.status === 'fulfilled') {
        setSettings(settingsResult.value.settings);
        setCommerceSettings(settingsResult.value.settings);
      }
      if (shopResult.status === 'fulfilled') {
        setShops(shopResult.value.shops);
      }

      const failure =
        productResult.status === 'rejected'
          ? productResult.reason
          : settingsResult.status === 'rejected'
            ? settingsResult.reason
            : null;

      setCatalogueError(
        failure
          ? failure instanceof Error
            ? failure.message
            : 'Could not reach the marketplace server.'
          : '',
      );
      setCatalogueLoading(false);
    }

    void loadMarketplace();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  useEffect(() => {
    saveWishlist(wishlist);
  }, [wishlist]);

  useEffect(() => {
    saveRecentlyViewed(recent);
  }, [recent]);

  useEffect(() => {
    const productMap = new Map(products.map((product) => [product.id, product]));
    setCart((current) => {
      let changed = false;
      const next = current.flatMap((item) => {
        const product = productMap.get(item.productId);
        if (!product || product.stock <= 0) {
          changed = true;
          return [];
        }
        const quantity = Math.min(item.quantity, product.stock, 99);
        if (quantity !== item.quantity) changed = true;
        return quantity > 0 ? [{ ...item, quantity }] : [];
      });
      return changed ? next : current;
    });

    setWishlist((current) => {
      const next = current.filter((id) => productMap.has(id));
      return next.length === current.length ? current : next;
    });

    setRecent((current) => {
      const next = current.filter((id) => productMap.has(id));
      return next.length === current.length ? current : next;
    });
  }, [products]);

  useEffect(() => {
    if (!isShopRoute) return;
    const params = new URLSearchParams(location.search);
    setSearch(params.get('search') ?? '');
    setCategory(params.get('category') || 'ALL');
    setSort(readSort(params.get('sort')));
  }, [isShopRoute, location.search]);

  useEffect(() => {
    const match = location.pathname.match(/^\/product\/(\d+)$/);
    if (!match) return;
    const productId = Number(match[1]);
    if (!products.some((product) => product.id === productId)) return;
    setRecent((current) =>
      [productId, ...current.filter((id) => id !== productId)].slice(0, 8),
    );
  }, [location.pathname, products]);

  useEffect(() => {
    return () => {
      if (toastTimer.current !== null) {
        window.clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const notify = useCallback((message: string) => {
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
    }
    setToast({ id: Date.now() + Math.random(), message });
    toastTimer.current = window.setTimeout(() => {
      setToast(null);
      toastTimer.current = null;
    }, 3000);
  }, []);

  const findProduct = useCallback(
    (productId: number) => products.find((product) => product.id === productId),
    [products],
  );

  const addToCart = useCallback(
    (productId: number, quantity = 1) => {
      const product = findProduct(productId);
      if (!product) return;
      if (product.stock <= 0) {
        notify(`${product.name} is currently sold out`);
        return;
      }

      const safeQuantity = clampQuantity(quantity, product.stock);
      const existing = cart.find((item) => item.productId === productId);
      const nextQuantity = existing
        ? Math.min(product.stock, 99, existing.quantity + safeQuantity)
        : safeQuantity;

      if (existing && nextQuantity === existing.quantity) {
        notify(`Only ${product.stock} of ${product.name} available`);
        return;
      }

      setCart((current) => {
        const currentExisting = current.find(
          (item) => item.productId === productId,
        );
        if (currentExisting) {
          return current.map((item) =>
            item.productId === productId
              ? { ...item, quantity: nextQuantity }
              : item,
          );
        }
        return [...current, { productId, quantity: nextQuantity }];
      });

      setCartPulse((pulse) => pulse + 1);
      notify(`${product.name} added to your bag`);
    },
    [cart, findProduct, notify],
  );

  const updateCartQuantity = useCallback(
    (productId: number, change: number) => {
      const product = findProduct(productId);
      const maximum = Math.min(99, product?.stock ?? 99);
      setCart((current) =>
        current.flatMap((item) => {
          if (item.productId !== productId) return [item];
          const nextQuantity = Math.min(
            maximum,
            Math.max(0, item.quantity + change),
          );
          if (nextQuantity <= 0) return [];
          return [{ ...item, quantity: nextQuantity }];
        }),
      );
    },
    [findProduct],
  );

  const removeFromCart = useCallback(
    (productId: number) => {
      const product = findProduct(productId);
      setCart((current) =>
        current.filter((item) => item.productId !== productId),
      );
      if (product) notify(`${product.name} removed from your bag`);
    },
    [findProduct, notify],
  );

  const toggleWishlist = useCallback(
    (productId: number) => {
      const product = findProduct(productId);
      if (!product) return;
      const saved = wishlist.includes(productId);

      setWishlist(
        saved
          ? wishlist.filter((id) => id !== productId)
          : [productId, ...wishlist],
      );
      // Respond to both saving and removing so the header heart always
      // acknowledges a real wishlist change.
      setWishlistPulse((pulse) => pulse + 1);
      notify(
        saved
          ? `${product.name} removed from wishlist`
          : `${product.name} saved to wishlist`,
      );
    },
    [findProduct, notify, wishlist],
  );

  const openProduct = useCallback(
    (productId: number) => {
      if (!findProduct(productId)) return;
      setAuthOpen(false);
      navigate(`/product/${productId}`);
    },
    [findProduct, navigate],
  );

  const openAuth = useCallback(() => {
    setAuthOpen(true);
  }, []);

  const handleOrderComplete = useCallback(
    (order: Order) => {
      setCart([]);
      notify(`Order ${order.reference} placed`);
      navigate(`/orders/${order.reference}?placed=1`);
    },
    [navigate, notify],
  );

  const updateShopUrl = useCallback(
    (next: { search?: string; category?: string; sort?: SortOption }) => {
      if (location.pathname !== '/shop') return;
      const params = new URLSearchParams(location.search);
      const nextSearch = next.search ?? search;
      const nextCategory = next.category ?? category;
      const nextSort = next.sort ?? sort;

      if (nextSearch.trim()) {
        params.set('search', nextSearch);
        params.delete('category');
      } else {
        params.delete('search');
        if (nextCategory && nextCategory !== 'ALL') {
          params.set('category', nextCategory);
        } else {
          params.delete('category');
        }
      }

      if (nextSort && nextSort !== 'featured') {
        params.set('sort', nextSort);
      } else {
        params.delete('sort');
      }

      const query = params.toString();
      navigate(`/shop${query ? `?${query}` : ''}`, { replace: true });
    },
    [category, location.pathname, location.search, navigate, search, sort],
  );

  const selectCategory = useCallback(
    (nextCategory: string) => {
      setCategory(nextCategory);
      setSearch('');
      updateShopUrl({ category: nextCategory, search: '' });
    },
    [updateShopUrl],
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      const nextCategory = value.trim() ? 'ALL' : category;
      if (value.trim()) setCategory('ALL');
      updateShopUrl({ search: value, category: nextCategory });
    },
    [category, updateShopUrl],
  );

  const handleSortChange = useCallback(
    (nextSort: SortOption) => {
      setSort(nextSort);
      updateShopUrl({ sort: nextSort });
    },
    [updateShopUrl],
  );

  const resetFilters = useCallback(() => {
    setCategory('ALL');
    setSearch('');
    setSort('featured');
    if (location.pathname === '/shop') {
      navigate('/shop', { replace: true });
      scrollToId('shop');
    }
  }, [location.pathname, navigate]);

  const openCatalogue = useCallback(
    (options: OpenCatalogueOptions = {}) => {
      const nextCategory = options.category ?? 'ALL';
      const nextSort = options.sort ?? 'featured';
      const nextSearch = options.search ?? '';
      const target: CatalogueAnchor =
        options.anchor ??
        (nextSearch.trim() ? 'shop-results' : 'shop-top');

      setCategory(nextCategory);
      setSearch(nextSearch);
      setSort(nextSort);

      const params = new URLSearchParams();
      if (nextSearch.trim()) params.set('search', nextSearch.trim());
      else if (nextCategory !== 'ALL') params.set('category', nextCategory);
      if (nextSort !== 'featured') params.set('sort', nextSort);
      const query = params.toString();
      const destination = `/shop${query ? `?${query}` : ''}`;
      const current = `${location.pathname}${location.search}`;

      if (current !== destination) {
        navigate(destination);
      }
      scrollToIdWhenReady(target);
    },
    [location.pathname, location.search, navigate],
  );

  const handleSuggestionProduct = useCallback(
    (productId: number) => {
      setSearch('');
      openProduct(productId);
    },
    [openProduct],
  );

  const handleSuggestionCategory = useCallback(
    (nextCategory: string) => {
      openCatalogue({ category: nextCategory, search: '' });
    },
    [openCatalogue],
  );

  const handleSuggestionShop = useCallback(
    (slug: string) => {
      setSearch('');
      navigate(`/shops/${encodeURIComponent(slug)}`);
    },
    [navigate],
  );

  const handleSearchSubmit = useCallback(() => {
    openCatalogue({
      category: 'ALL',
      search,
      anchor: search.trim() ? 'shop-results' : 'shop-top',
    });
  }, [openCatalogue, search]);

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const isLaunch = location.pathname === '/';

  return (
    <>
      <RouteLifecycle />
      <AppLayout
        isLaunch={isLaunch}
        search={search}
        products={products}
        shops={shops}
        recent={recent}
        catalogueLoading={catalogueLoading}
        cartCount={cartCount}
        wishlistCount={wishlist.length}
        cartPulse={cartPulse}
        wishlistPulse={wishlistPulse}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        onSelectProduct={handleSuggestionProduct}
        onSelectCategory={handleSuggestionCategory}
        onSelectShop={handleSuggestionShop}
        onOpenAuth={openAuth}
        onSignedOut={() => notify('Signed out')}
      >
        <div className="route-view" key={location.pathname}>
          <Routes>
            <Route
              path="/"
              element={
                <HomePage
                  products={products}
                  shops={shops}
                  settings={settings}
                  wishlist={wishlist}
                  catalogueError={catalogueError}
                  onAddToCart={addToCart}
                  onToggleWishlist={toggleWishlist}
                />
              }
            />
            <Route
              path="/shop"
              element={
                <CataloguePage
                  products={products}
                  wishlist={wishlist}
                  recent={recent}
                  search={search}
                  category={category}
                  sort={sort}
                  catalogueError={catalogueError}
                  onSearchChange={handleSearchChange}
                  onSelectCategory={selectCategory}
                  onSortChange={handleSortChange}
                  onResetFilters={resetFilters}
                  onAddToCart={addToCart}
                  onQuickView={openProduct}
                  onToggleWishlist={toggleWishlist}
                  onClearRecent={() => setRecent([])}
                />
              }
            />
            <Route
              path="/product/:id"
              element={
                <ProductPage
                  products={products}
                  wishlist={wishlist}
                  loading={catalogueLoading}
                  onAddToCart={addToCart}
                  onOpenProduct={openProduct}
                  onToggleWishlist={toggleWishlist}
                />
              }
            />
            <Route
              path="/cart"
              element={
                <CartPage
                  cart={cart}
                  onUpdateQuantity={updateCartQuantity}
                  onRemove={removeFromCart}
                />
              }
            />
            <Route
              path="/checkout"
              element={
                <CheckoutPage
                  cart={cart}
                  onOrderComplete={handleOrderComplete}
                  onRequireAuth={openAuth}
                />
              }
            />
            <Route
              path="/wishlist"
              element={
                <WishlistPage
                  products={products}
                  wishlist={wishlist}
                  onAddToCart={addToCart}
                  onOpenProduct={openProduct}
                  onToggleWishlist={toggleWishlist}
                />
              }
            />
            <Route
              path="/shops"
              element={<ShopsPage />}
            />
            <Route
              path="/shops/:slug"
              element={
                <ShopPage
                  wishlist={wishlist}
                  onAddToCart={addToCart}
                  onQuickView={openProduct}
                  onToggleWishlist={toggleWishlist}
                />
              }
            />
            <Route path="/orders" element={<MyOrdersPage />} />
            <Route path="/orders/:reference" element={<OrderDetailPage />} />
            <Route
              path="/become-a-seller"
              element={<SellerApplicationPage />}
            />
            <Route
              path="/sell"
              element={<Navigate to="/become-a-seller" replace />}
            />
            <Route path="/seller" element={<SellerDashboardPage />} />
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </AppLayout>

      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onAuthenticated={() => setAuthOpen(false)}
        />
      )}

      {toast && <Toast key={toast.id} message={toast.message} />}
    </>
  );
}
