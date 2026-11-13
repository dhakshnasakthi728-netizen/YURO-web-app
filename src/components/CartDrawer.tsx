import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRight,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import type { CartItem } from '../types';
import { calculateTotals, getCartLines } from '../lib/cart';
import { getCommerceSettings } from '../lib/commerce';
import { formatPrice } from '../lib/format';
import { reduceMotionRequested } from '../lib/motion';
import { useDialog } from '../hooks/useDialog';
import { SafeImage } from './SafeImage';

type CartDrawerProps = {
  cart: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: number, change: number) => void;
  onRemove: (productId: number) => void;
  onCheckout: () => void;
  onContinueShopping: () => void;
};

export function CartDrawer({
  cart,
  onClose,
  onUpdateQuantity,
  onRemove,
  onCheckout,
  onContinueShopping,
}: CartDrawerProps) {
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);
  const requestClose = useCallback(() => {
    if (closing) return;
    const reduceMotion = reduceMotionRequested();
    if (reduceMotion) {
      onClose();
      return;
    }
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, 200);
  }, [closing, onClose]);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
      }
    },
    [],
  );

  const drawerRef = useDialog(true, requestClose);
  const settings = getCommerceSettings();
  const lines = getCartLines(cart);
  const totals = calculateTotals(cart);
  const progress = Math.min(
    100,
    Math.round((totals.subtotal / settings.freeShippingThreshold) * 100),
  );

  return createPortal(
    <div
      className={`drawer-overlay${closing ? ' is-closing' : ''}`}
      onClick={requestClose}
    >
      <aside
        className={`drawer-panel glass${closing ? ' is-closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        ref={drawerRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-head">
          <div>
            <p className="eyebrow">Your selection</p>
            <h2 id="cart-drawer-title">
              Bag <span>({totals.itemCount})</span>
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={requestClose}
            aria-label="Close shopping bag"
          >
            <X size={19} />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="drawer-empty">
            <span className="empty-icon" aria-hidden="true">
              <ShoppingBag size={26} />
            </span>
            <h3>Your bag is empty</h3>
            <p>
              The edit is waiting. Explore considered pieces made for everyday
              living.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onContinueShopping}
            >
              Explore the collection
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <>
            <div className="shipping-meter">
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

            <div className="drawer-items">
              {lines.map((line) => (
                <div className="drawer-item" key={line.product.id}>
                  <SafeImage
                    src={line.product.image}
                    alt={line.product.name}
                    className="drawer-item-img"
                    sizes="92px"
                  />
                  <div className="drawer-item-body">
                    <div className="drawer-item-top">
                      <div>
                        <p className="product-category">
                          {line.product.category} · {line.product.shopName}
                        </p>
                        <h3>{line.product.name}</h3>
                      </div>
                      <button
                        type="button"
                        className="remove-button"
                        onClick={() => onRemove(line.product.id)}
                        aria-label={`Remove ${line.product.name} from bag`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="drawer-item-bottom">
                      <div
                        className="quantity-control"
                        role="group"
                        aria-label={`Quantity for ${line.product.name}`}
                      >
                        <button
                          type="button"
                          className="quantity-button"
                          onClick={() => onUpdateQuantity(line.product.id, -1)}
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
                            line.quantity >= Math.min(99, line.product.stock)
                          }
                          aria-label={`Increase quantity of ${line.product.name}`}
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                      <span className="line-price">
                        {formatPrice(line.lineTotal)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="drawer-totals">
              <div className="summary-row">
                <span>Subtotal</span>
                <span>{formatPrice(totals.subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Shipping</span>
                <span>
                  {totals.shipping === 0
                    ? 'Complimentary'
                    : formatPrice(settings.shippingFee)}
                </span>
              </div>
              <div className="summary-row summary-total">
                <span>Total</span>
                <strong>{formatPrice(totals.total)}</strong>
              </div>
              <p className="summary-note">
                Shipping is shown up front. Cash on delivery is available at
                checkout.
              </p>

              <button
                type="button"
                className="btn btn-primary drawer-checkout"
                onClick={onCheckout}
              >
                Continue to checkout
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                className="btn btn-quiet drawer-continue"
                onClick={onContinueShopping}
              >
                Continue shopping
              </button>
            </div>
          </>
        )}
      </aside>
    </div>,
    document.body,
  );
}
