import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Store,
} from 'lucide-react';
import type { Product } from '../types';
import { getCommerceSettings } from '../lib/commerce';
import { formatPrice } from '../lib/format';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';
import { useScrollReveal } from '../hooks/useScrollReveal';

type ProductPageProps = {
  products: Product[];
  wishlist: number[];
  loading?: boolean;
  onAddToCart: (productId: number, quantity?: number) => void;
  onOpenProduct: (productId: number) => void;
  onToggleWishlist: (productId: number) => void;
};

export function ProductPage({
  products,
  wishlist,
  loading = false,
  onAddToCart,
  onOpenProduct,
  onToggleWishlist,
}: ProductPageProps) {
  const { id = '' } = useParams();
  const productId = Number(id);
  const product = products.find((item) => item.id === productId);
  const [quantity, setQuantity] = useState(1);
  const settings = getCommerceSettings();

  const related = useMemo(() => {
    if (!product) return [];
    return products
      .filter(
        (item) =>
          item.category === product.category && item.id !== product.id,
      )
      .slice(0, 4);
  }, [product, products]);

  const pageRef = useScrollReveal<HTMLDivElement>([product?.id, related.length]);

  useEffect(() => {
    if (!product) return;
    document.title = `${product.name} — YURO`;
    setQuantity(1);
  }, [product]);

  if (!product && loading) {
    return (
      <section className="page-section shell">
        <div className="page-loading" role="status">
          <span className="spinner" />
          <p>Opening this piece…</p>
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="page-section shell">
        <div className="empty-state">
          <span className="empty-icon" aria-hidden="true">
            <Sparkles size={24} />
          </span>
          <p className="eyebrow">Piece not found</p>
          <h1>This piece is no longer available</h1>
          <p>
            It may have been removed by its shop, or the link may be incomplete.
            Browse the current catalogue instead.
          </p>
          <Link className="btn btn-primary" to="/shop">
            <ArrowLeft size={15} />
            Back to the shop
          </Link>
        </div>
      </section>
    );
  }

  const soldOut = product.stock <= 0;
  const maximum = Math.min(99, Math.max(1, product.stock));
  const saved = wishlist.includes(product.id);
  const stockLabel = soldOut
    ? 'Currently sold out'
    : product.stock <= 3
      ? `Only ${product.stock} left`
      : 'Ready to dispatch';

  const adjustQuantity = (change: number) => {
    setQuantity((current) =>
      Math.min(maximum, Math.max(1, current + change)),
    );
  };

  return (
    <div className="product-page" ref={pageRef}>
      <div className="product-page-breadcrumb shell">
        <Link to="/shop" className="text-link">
          <ArrowLeft size={14} />
          Back to the shop
        </Link>
        <span aria-hidden="true">/</span>
        <span>{product.category}</span>
      </div>

      <section className="product-page-grid shell" aria-labelledby="product-title">
        <div className="product-page-media" data-reveal>
          <SafeImage
            src={product.image}
            alt={product.name}
            className="product-page-img"
            eager
            sizes="(max-width: 900px) 100vw, 50vw"
          />
          <div className="product-page-badges">
            {product.featured && <span className="badge">Editor&apos;s pick</span>}
            {product.newArrival && (
              <span className="badge badge-accent">New arrival</span>
            )}
            {soldOut && <span className="badge">Sold out</span>}
          </div>
        </div>

        <div className="product-page-copy" data-reveal>
          <p className="eyebrow">{product.category}</p>
          <h1 id="product-title">{product.name}</h1>
          <p className="product-page-price">{formatPrice(product.price)}</p>

          <Link
            to={`/shops/${product.shopSlug}`}
            className="product-page-shop"
          >
            <Store size={14} />
            Sold by {product.shopName}
            <ArrowRight size={13} />
          </Link>

          <p className="product-page-description">{product.description}</p>

          <ul className="product-page-details">
            <li>
              <Check size={14} />
              Complimentary shipping over{' '}
              {formatPrice(settings.freeShippingThreshold)}
            </li>
            <li>
              <Check size={14} />
              Cash on delivery available
            </li>
            <li>
              <Check size={14} />
              {stockLabel}
            </li>
          </ul>

          <div className="product-page-buy">
            <div
              className="quantity-control"
              role="group"
              aria-label="Choose quantity"
            >
              <button
                type="button"
                className="quantity-button"
                onClick={() => adjustQuantity(-1)}
                disabled={soldOut || quantity <= 1}
                aria-label="Decrease quantity"
              >
                <Minus size={14} />
              </button>
              <span aria-live="polite">{quantity}</span>
              <button
                type="button"
                className="quantity-button"
                onClick={() => adjustQuantity(1)}
                disabled={soldOut || quantity >= maximum}
                aria-label="Increase quantity"
              >
                <Plus size={14} />
              </button>
            </div>

            <button
              type="button"
              className="btn btn-primary product-page-add"
              onClick={() => onAddToCart(product.id, quantity)}
              disabled={soldOut}
            >
              <ShoppingBag size={16} />
              {soldOut
                ? 'Sold out'
                : `Add ${quantity > 1 ? `${quantity} ` : ''}to bag`}
            </button>

            <button
              type="button"
              className={`icon-button product-page-wishlist${
                saved ? ' is-active' : ''
              }`}
              onClick={() => onToggleWishlist(product.id)}
              aria-pressed={saved}
              aria-label={
                saved
                  ? `Remove ${product.name} from wishlist`
                  : `Save ${product.name} to wishlist`
              }
            >
              <Heart size={18} fill={saved ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="product-page-meta">
            <div>
              <small>Fulfilled by</small>
              <span>{product.shopName}</span>
            </div>
            <div>
              <small>Collection</small>
              <span>{product.category}</span>
            </div>
            <div>
              <small>Availability</small>
              <span>{stockLabel}</span>
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section
          className="section shell product-related"
          aria-labelledby="related-title"
        >
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">Continue the edit</p>
              <h2 id="related-title">
                More in {product.category.toLowerCase()}<span>.</span>
              </h2>
            </div>
          </div>
          <div className="product-grid">
            {related.map((item, index) => (
              <ProductCard
                key={item.id}
                product={item}
                index={index}
                wishlisted={wishlist.includes(item.id)}
                onAdd={onAddToCart}
                onQuickView={onOpenProduct}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
