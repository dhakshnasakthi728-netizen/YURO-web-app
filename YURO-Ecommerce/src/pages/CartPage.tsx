import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
  Truck,
} from 'lucide-react';
import type { CartItem } from '../types';
import { calculateTotals, getCartLines } from '../lib/cart';
import { getCommerceSettings } from '../lib/commerce';
import { formatPrice } from '../lib/format';
import { PageHeader } from '../components/PageHeader';
import { SafeImage } from '../components/SafeImage';
import { useScrollReveal } from '../hooks/useScrollReveal';

type CartPageProps = {
  cart: CartItem[];
  onUpdateQuantity: (productId: number, change: number) => void;
  onRemove: (productId: number) => void;
};

export function CartPage({
  cart,
  onUpdateQuantity,
  onRemove,
}: CartPageProps) {
  const settings = getCommerceSettings();
  const lines = getCartLines(cart);
  const totals = calculateTotals(cart);
  const pageRef = useScrollReveal<HTMLDivElement>([cart.length]);
  const progress = Math.min(
    100,
    Math.round(
      (totals.subtotal / Math.max(1, settings.freeShippingThreshold)) * 100,
    ),
  );

  return (
    <div className="page-section shell cart-page" ref={pageRef}>
      <PageHeader
        eyebrow="Your selection"
        title={
          <>
            Shopping bag<span>.</span>
          </>
        }
        description="Your bag is kept on this device until you check out. Quantities and totals stay in sync with the marketplace."
        actions={
          <Link className="btn btn-ghost" to="/shop">
            <ShoppingBag size={15} />
            Continue shopping
          </Link>
        }
      />

      {lines.length === 0 ? (
        <div className="empty-state cart-empty" data-reveal>
          <span className="empty-icon" aria-hidden="true">
            <ShoppingBag size={26} />
          </span>
          <h2>Your bag is empty</h2>
          <p>
            Nothing has been added yet. Explore the edit of apparel, home,
            accessories and footwear from approved shops.
          </p>
          <Link className="btn btn-primary" to="/shop">
            Explore the collection
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          <div className="shipping-meter cart-shipping-meter" data-reveal>
            <div className="shipping-meter-head">
              <span>
                <Truck size={14} />
                {totals.freeShippingRemaining > 0
                  ? `${formatPrice(totals.freeShippingRemaining)} away from free shipping`
                  : 'Complimentary shipping unlocked'}
              </span>
              <small>{formatPrice(settings.freeShippingThreshold)}</small>
            </div>
            <div
              className="shipping-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              aria-label="Progress toward free shipping"
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="cart-layout">
            <div className="cart-lines">
              {lines.map((line) => (
                <article className="cart-line" key={line.product.id} data-reveal>
                  <Link
                    to={`/product/${line.product.id}`}
                    className="cart-line-media"
                    aria-label={`View ${line.product.name}`}
                  >
                    <SafeImage
                      src={line.product.image}
                      alt={line.product.name}
                      className="cart-line-img"
                      sizes="120px"
                    />
                  </Link>

                  <div className="cart-line-copy">
                    <p className="product-category">
                      {line.product.category}
                      <span className="dot-separator" aria-hidden="true" />
                      <Link
                        to={`/shops/${line.product.shopSlug}`}
                        className="product-shop"
                      >
                        <Store size={11} />
                        {line.product.shopName}
                      </Link>
                    </p>
                    <h2>
                      <Link to={`/product/${line.product.id}`}>
                        {line.product.name}
                      </Link>
                    </h2>
                    <p className="cart-line-unit">
                      {formatPrice(line.product.price)} each
                    </p>

                    <div className="cart-line-controls">
                      <div
                        className="quantity-control"
                        role="group"
                        aria-label={`Quantity for ${line.product.name}`}
                      >
                        <button
                          type="button"
                          className="quantity-button"
                          onClick={() =>
                            onUpdateQuantity(line.product.id, -1)
                          }
                          aria-label={`Decrease quantity of ${line.product.name}`}
                        >
                          <Minus size={13} />
                        </button>
                        <span aria-live="polite">{line.quantity}</span>
                        <button
                          type="button"
                          className="quantity-button"
                          onClick={() => onUpdateQuantity(line.product.id, 1)}
                          disabled={
                            line.quantity >=
                            Math.min(99, line.product.stock)
                          }
                          aria-label={`Increase quantity of ${line.product.name}`}
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <button
                        type="button"
                        className="remove-button cart-remove"
                        onClick={() => onRemove(line.product.id)}
                      >
                        <Trash2 size={14} />
                        Remove
                      </button>
                    </div>
                  </div>

                  <strong className="cart-line-total">
                    {formatPrice(line.lineTotal)}
                  </strong>
                </article>
              ))}
            </div>

            <aside className="cart-summary" data-reveal aria-label="Order summary">
              <div className="cart-summary-head">
                <p className="eyebrow">Summary</p>
                <h2>{totals.itemCount} pieces</h2>
              </div>

              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatPrice(totals.subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>
                  {totals.shipping === 0
                    ? 'Complimentary'
                    : formatPrice(totals.shipping)}
                </span>
              </div>
              <div className="summary-row summary-total">
                <span>Total</span>
                <strong>{formatPrice(totals.total)}</strong>
              </div>

              <p className="summary-note">
                Shipping is shown up front. Cash on delivery is available at
                checkout. Final totals are verified by the marketplace server.
              </p>

              <Link className="btn btn-primary cart-checkout" to="/checkout">
                Continue to checkout
                <ArrowRight size={16} />
              </Link>
              <Link className="btn btn-quiet cart-continue" to="/shop">
                Keep browsing
              </Link>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
