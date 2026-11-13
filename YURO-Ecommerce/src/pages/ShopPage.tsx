import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Store } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Product, Shop } from '../types';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';

type ShopPageProps = {
  wishlist: number[];
  onAddToCart: (productId: number, quantity?: number) => void;
  onQuickView: (productId: number) => void;
  onToggleWishlist: (productId: number) => void;
};

export function ShopPage({
  wishlist,
  onAddToCart,
  onQuickView,
  onToggleWishlist,
}: ShopPageProps) {
  const { slug = '' } = useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let targetSlug = slug;

      // The route accepts both /shops/:slug and /shops/:id. Numeric links are
      // resolved against the same approved-shop feed used by the marketplace.
      if (/^\d+$/.test(slug)) {
        const { shops } = await api.catalogue.shops();
        const match = shops.find((entry) => entry.id === Number(slug));
        if (!match) {
          throw new ApiError('This shop does not exist or is not approved.', 404);
        }
        targetSlug = match.slug;
      }

      const result = await api.catalogue.shop(targetSlug);
      setShop(result.shop);
      setProducts(result.products);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not load this shop. Try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <section className="page-section shell">
        <div className="page-loading" role="status">
          <span className="spinner" />
          <p>Opening shop…</p>
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
          <h1>Shop not available</h1>
          <p>{error || 'This shop does not exist or is not currently approved.'}</p>
          <Link className="btn btn-primary" to="/shops">
            <ArrowLeft size={15} />
            Back to all shops
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="shop-page">
      <div className="shop-hero shell">
        <div className="shop-banner">
          {shop.bannerUrl ? (
            <SafeImage
              src={shop.bannerUrl}
              alt=""
              className="shop-banner-img"
              eager
              sizes="100vw"
            />
          ) : (
            <span className="shop-banner-fallback" aria-hidden="true" />
          )}
          <span className="shop-banner-shade" aria-hidden="true" />
          <div className="shop-identity">
            {shop.logoUrl ? (
              <SafeImage
                src={shop.logoUrl}
                alt={`${shop.name} logo`}
                className="shop-logo"
                sizes="96px"
              />
            ) : (
              <span className="shop-logo shop-logo-fallback" aria-hidden="true">
                {shop.name.charAt(0)}
              </span>
            )}
            <div>
              <p className="eyebrow">Independent shop · {shop.category}</p>
              <h1>{shop.name}</h1>
            </div>
          </div>
        </div>

        <div className="shop-intro">
          <div>
            <p>{shop.description}</p>
            <span className="shop-meta">
              <Store size={13} />
              {products.length} {products.length === 1 ? 'piece' : 'pieces'} ·{' '}
              {shop.ownerName || 'Independent seller'}
            </span>
          </div>
          <Link className="text-link" to="/shops">
            <ArrowLeft size={14} />
            Back to all shops
          </Link>
        </div>
      </div>

      <div className="shell shop-products">
        {products.length === 0 ? (
          <div className="empty-state glass">
            <span className="empty-icon" aria-hidden="true">
              <Package size={24} />
            </span>
            <h2>No pieces published yet</h2>
            <p>This shop is preparing its first collection. Check back soon.</p>
            <Link className="btn btn-primary" to="/shop">
              Explore the marketplace
            </Link>
          </div>
        ) : (
          <>
            <div className="shop-section-head">
              <h2>The collection</h2>
              <span>
                {products.length} {products.length === 1 ? 'piece' : 'pieces'}
              </span>
            </div>
            <div className="product-grid">
              {products.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  index={index}
                  wishlisted={wishlist.includes(product.id)}
                  onAdd={onAddToCart}
                  onQuickView={onQuickView}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
