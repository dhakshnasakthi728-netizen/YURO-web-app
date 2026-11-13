import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import type { Product } from '../types';
import { formatPrice } from '../lib/format';
import { getCommerceSettings } from '../lib/commerce';
import { useDialog } from '../hooks/useDialog';
import { SafeImage } from './SafeImage';

type ProductModalProps = {
  product: Product;
  related: Product[];
  wishlisted: boolean;
  onClose: () => void;
  onAddToCart: (productId: number, quantity: number) => void;
  onToggleWishlist: (productId: number) => void;
  onSelectProduct: (productId: number) => void;
};

export function ProductModal({
  product,
  related,
  wishlisted,
  onClose,
  onAddToCart,
  onToggleWishlist,
  onSelectProduct,
}: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const dialogRef = useDialog(true, onClose);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const settings = getCommerceSettings();
  const soldOut = product.stock <= 0;
  const maximum = Math.min(99, Math.max(1, product.stock));

  useEffect(() => {
    setQuantity(1);
    const focusTimer = window.setTimeout(() => {
      titleRef.current?.focus({ preventScroll: true });
    }, 50);
    return () => window.clearTimeout(focusTimer);
  }, [product.id]);

  const adjustQuantity = (change: number) => {
    setQuantity((current) => Math.min(maximum, Math.max(1, current + change)));
  };

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} data-dialog="product">
      <div
        className="product-modal glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        ref={dialogRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="icon-button modal-close"
          onClick={onClose}
          aria-label="Close product detail"
        >
          <X size={19} />
        </button>

        <div className="product-modal-grid">
          <div className="product-modal-media">
            <SafeImage
              src={product.image}
              alt={product.name}
              className="product-modal-img"
              eager
              sizes="(max-width: 760px) 100vw, 50vw"
            />
            <div className="modal-media-chip glass">
              <Sparkles size={13} />
              <span>YURO marketplace</span>
            </div>
          </div>

          <div className="product-modal-copy">
            <p className="eyebrow">{product.category}</p>
            <h2 id="product-modal-title" ref={titleRef} tabIndex={-1}>
              {product.name}
            </h2>
            <p className="modal-price">{formatPrice(product.price)}</p>

            <Link
              to={`/shops/${product.shopSlug}`}
              className="modal-shop-link"
              onClick={onClose}
            >
              <Store size={14} />
              Sold by {product.shopName}
              <ArrowRight size={13} />
            </Link>

            <p className="modal-description">{product.description}</p>

            <ul className="modal-details">
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
                {soldOut
                  ? 'Currently sold out'
                  : product.stock <= 3
                    ? `Only ${product.stock} left from this shop`
                    : 'Ready to dispatch from the seller'}
              </li>
            </ul>

            <div className="modal-buy-row">
              <div className="quantity-control" role="group" aria-label="Quantity">
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
                className="btn btn-primary modal-add"
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
                className={`icon-button modal-wishlist${
                  wishlisted ? ' is-active' : ''
                }`}
                onClick={() => onToggleWishlist(product.id)}
                aria-pressed={wishlisted}
                aria-label={
                  wishlisted
                    ? `Remove ${product.name} from wishlist`
                    : `Save ${product.name} to wishlist`
                }
              >
                <Heart size={18} fill={wishlisted ? 'currentColor' : 'none'} />
              </button>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <div className="modal-related">
            <div className="modal-related-head">
              <h3>More in {product.category.toLowerCase()}</h3>
              <ArrowRight size={15} aria-hidden="true" />
            </div>
            <div className="related-grid">
              {related.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="related-card"
                  onClick={() => onSelectProduct(item.id)}
                >
                  <SafeImage
                    src={item.image}
                    alt=""
                    className="related-img"
                    sizes="120px"
                  />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{formatPrice(item.price)}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
