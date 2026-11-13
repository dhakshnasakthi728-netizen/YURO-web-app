import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Heart, Plus } from 'lucide-react';
import type { Product } from '../types';
import { formatPrice } from '../lib/format';
import { SafeImage } from './SafeImage';

type ProductCardProps = {
  product: Product;
  index?: number;
  wishlisted: boolean;
  onAdd: (productId: number) => void;
  onQuickView: (productId: number) => void;
  onToggleWishlist: (productId: number) => void;
};

export function ProductCard({
  product,
  index = 0,
  wishlisted,
  onAdd,
  onQuickView,
  onToggleWishlist,
}: ProductCardProps) {
  const delayStyle = {
    '--card-delay': `${Math.min(index, 10) * 70}ms`,
    '--reveal-delay': `${Math.min(index, 6) * 80}ms`,
  } as CSSProperties;
  const soldOut = product.stock <= 0;

  return (
    <article
      className={`product-card${soldOut ? ' is-sold-out' : ''}`}
      style={delayStyle}
      data-reveal
    >
      <div className="product-visual">
        <Link
          to={`/product/${product.id}`}
          className="product-open"
          aria-label={`View ${product.name}`}
        >
          <SafeImage
            src={product.image}
            alt={product.name}
            className="product-img"
            sizes="(max-width: 680px) 50vw, (max-width: 1120px) 33vw, 25vw"
          />
          <span className="product-shade" aria-hidden="true" />
        </Link>

        <div className="product-badges">
          {soldOut && <span className="badge">Sold out</span>}
          {!soldOut && product.newArrival && (
            <span className="badge badge-accent">New</span>
          )}
          {!soldOut && product.featured && !product.newArrival && (
            <span className="badge">Editor&apos;s pick</span>
          )}
        </div>

        <button
          type="button"
          className={`wishlist-toggle${wishlisted ? ' is-active' : ''}`}
          onClick={() => onToggleWishlist(product.id)}
          aria-pressed={wishlisted}
          aria-label={
            wishlisted
              ? `Remove ${product.name} from wishlist`
              : `Save ${product.name} to wishlist`
          }
        >
          <Heart size={16} />
        </button>

        {!soldOut && (
          <button
            type="button"
            className="quick-view-button"
            onClick={() => onQuickView(product.id)}
          >
            <Eye size={14} />
            View piece
          </button>
        )}

        <button
          type="button"
          className="card-add-button"
          onClick={() => onAdd(product.id)}
          disabled={soldOut}
          aria-label={
            soldOut
              ? `${product.name} is sold out`
              : `Add ${product.name} to bag`
          }
        >
          <Plus size={15} />
          <span>{soldOut ? 'Sold out' : 'Add'}</span>
        </button>
      </div>

      <div className="product-info">
        <div>
          <p className="product-category">
            {product.category}
            <span className="dot-separator" aria-hidden="true" />
            <Link
              to={`/shops/${product.shopSlug}`}
              className="product-shop"
              onClick={(event) => event.stopPropagation()}
            >
              {product.shopName}
            </Link>
          </p>
          <h3>
            <Link to={`/product/${product.id}`}>{product.name}</Link>
          </h3>
        </div>
        <div className="product-price-group">
          <span className="product-price">{formatPrice(product.price)}</span>
          {!soldOut && product.stock <= 3 && (
            <small className="low-stock">Only {product.stock} left</small>
          )}
        </div>
      </div>
    </article>
  );
}
