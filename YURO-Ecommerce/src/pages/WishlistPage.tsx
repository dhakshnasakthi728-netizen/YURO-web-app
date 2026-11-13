import { Link } from 'react-router-dom';
import { ArrowRight, Heart, ShoppingBag } from 'lucide-react';
import type { Product } from '../types';
import { PageHeader } from '../components/PageHeader';
import { ProductCard } from '../components/ProductCard';
import { useScrollReveal } from '../hooks/useScrollReveal';

type WishlistPageProps = {
  products: Product[];
  wishlist: number[];
  onAddToCart: (productId: number, quantity?: number) => void;
  onOpenProduct: (productId: number) => void;
  onToggleWishlist: (productId: number) => void;
};

export function WishlistPage({
  products,
  wishlist,
  onAddToCart,
  onOpenProduct,
  onToggleWishlist,
}: WishlistPageProps) {
  const pageRef = useScrollReveal<HTMLDivElement>([products, wishlist.length]);
  const items = products.filter((product) => wishlist.includes(product.id));

  return (
    <div className="page-section shell wishlist-page" ref={pageRef}>
      <PageHeader
        eyebrow="Your account"
        title={
          <>
            Saved pieces<span>.</span>
          </>
        }
        description="Pieces you have saved on this device. Add them to your bag when the time is right."
        actions={
          <Link className="btn btn-ghost" to="/shop">
            <ShoppingBag size={15} />
            Browse the shop
          </Link>
        }
      />

      {items.length === 0 ? (
        <div className="empty-state wishlist-empty" data-reveal>
          <span className="empty-icon" aria-hidden="true">
            <Heart size={26} />
          </span>
          <h2>No saved pieces yet</h2>
          <p>
            Tap the heart on any product to keep it here. Your saved pieces stay
            on this device until you remove them.
          </p>
          <Link className="btn btn-primary" to="/shop">
            Find something to keep
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          <div className="wishlist-summary-line" data-reveal>
            <span>
              {items.length} {items.length === 1 ? 'piece' : 'pieces'} saved
            </span>
            <Link className="text-link" to="/shop">
              Add more pieces
              <ArrowRight size={14} />
            </Link>
          </div>
          <div className="product-grid wishlist-grid">
            {items.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                wishlisted
                onAdd={onAddToCart}
                onQuickView={onOpenProduct}
                onToggleWishlist={onToggleWishlist}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
