import { createPortal } from 'react-dom';
import { ArrowRight, Heart, ShoppingBag, Trash2, X } from 'lucide-react';
import type { Product } from '../types';
import { formatPrice } from '../lib/format';
import { useDialog } from '../hooks/useDialog';
import { SafeImage } from './SafeImage';

type WishlistDrawerProps = {
  items: Product[];
  onClose: () => void;
  onAddToCart: (productId: number) => void;
  onRemove: (productId: number) => void;
  onOpenProduct: (productId: number) => void;
};

export function WishlistDrawer({
  items,
  onClose,
  onAddToCart,
  onRemove,
  onOpenProduct,
}: WishlistDrawerProps) {
  const drawerRef = useDialog(true, onClose);

  return createPortal(
    <div className="drawer-overlay" onClick={onClose}>
      <aside
        className="drawer-panel glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wishlist-drawer-title"
        ref={drawerRef}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-head">
          <div>
            <p className="eyebrow">Saved for later</p>
            <h2 id="wishlist-drawer-title">
              Wishlist <span>({items.length})</span>
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close wishlist"
          >
            <X size={19} />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="drawer-empty">
            <span className="empty-icon" aria-hidden="true">
              <Heart size={26} />
            </span>
            <h3>Nothing saved yet</h3>
            <p>
              Tap the heart on any piece to keep it here for later. Your
              wishlist stays on this device.
            </p>
            <button type="button" className="btn btn-primary" onClick={onClose}>
              Keep exploring
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="drawer-items wishlist-items">
            {items.map((product) => (
              <div className="wishlist-item" key={product.id}>
                <button
                  type="button"
                  className="wishlist-item-media"
                  onClick={() => onOpenProduct(product.id)}
                  aria-label={`View ${product.name}`}
                >
                  <SafeImage
                    src={product.image}
                    alt={product.name}
                    className="wishlist-img"
                    sizes="80px"
                  />
                </button>
                <div className="wishlist-item-copy">
                  <p className="product-category">{product.category}</p>
                  <button
                    type="button"
                    className="wishlist-item-name"
                    onClick={() => onOpenProduct(product.id)}
                  >
                    {product.name}
                  </button>
                  <p className="wishlist-price">{formatPrice(product.price)}</p>
                  <button
                    type="button"
                    className="wishlist-add"
                    onClick={() => onAddToCart(product.id)}
                  >
                    <ShoppingBag size={13} />
                    Add to bag
                  </button>
                </div>
                <button
                  type="button"
                  className="remove-button"
                  onClick={() => onRemove(product.id)}
                  aria-label={`Remove ${product.name} from wishlist`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
