import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  Database,
  Search,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import type { Product } from '../types';
import {
  categoryOptions,
  filterProducts,
  recommendProducts,
  type SortOption,
} from '../lib/catalogue';
import { scrollToId } from '../lib/scroll';
import { useAuth } from '../contexts/AuthContext';
import { ProductCard } from '../components/ProductCard';
import { SafeImage } from '../components/SafeImage';
import { usePointerStage } from '../hooks/usePointerStage';
import { useScrollReveal } from '../hooks/useScrollReveal';

type CataloguePageProps = {
  products: Product[];
  wishlist: number[];
  recent: number[];
  search: string;
  category: string;
  sort: SortOption;
  catalogueError: string;
  onSearchChange: (value: string) => void;
  onSelectCategory: (category: string) => void;
  onSortChange: (sort: SortOption) => void;
  onResetFilters: () => void;
  onAddToCart: (productId: number, quantity?: number) => void;
  onQuickView: (productId: number) => void;
  onToggleWishlist: (productId: number) => void;
  onClearRecent: () => void;
};

function recommendationReason(
  signalCount: number,
  preferredCategory: string | null,
) {
  if (signalCount > 0 && preferredCategory) {
    return `More ${preferredCategory.toLowerCase()} chosen from the pieces you have saved and viewed.`;
  }
  if (signalCount > 0) {
    return 'A considered edit drawn from the pieces you have saved and viewed.';
  }
  return 'A first edit built from featured and just-landed pieces across the marketplace.';
}

export function CataloguePage({
  products,
  wishlist,
  recent,
  search,
  category,
  sort,
  catalogueError,
  onSearchChange,
  onSelectCategory,
  onSortChange,
  onResetFilters,
  onAddToCart,
  onQuickView,
  onToggleWishlist,
  onClearRecent,
}: CataloguePageProps) {
  const { user } = useAuth();
  const stageRef = usePointerStage<HTMLElement>();

  const categories = useMemo(() => categoryOptions(products), [products]);
  const filteredProducts = useMemo(
    () => filterProducts(products, { search, category, sort }),
    [category, products, search, sort],
  );
  const recommendations = useMemo(
    () => recommendProducts(products, { wishlist, recent, limit: 4 }),
    [products, recent, wishlist],
  );
  const recentlyViewedProducts = useMemo(
    () =>
      recent
        .map((id) => products.find((product) => product.id === id))
        .filter((product): product is Product => Boolean(product))
        .slice(0, 4),
    [products, recent],
  );
  const shopCount = useMemo(
    () => new Set(products.map((product) => product.shopSlug)).size,
    [products],
  );

  const firstName = user?.fullName.trim().split(/\s+/)[0] ?? '';
  const reason = recommendationReason(
    recommendations.signalCount,
    recommendations.preferredCategory,
  );
  const stackProducts = recommendations.products.slice(0, 3);

  const pageRef = useScrollReveal<HTMLDivElement>([
    products,
    search,
    category,
    sort,
    wishlist.length,
    recent.length,
  ]);

  return (
    <div className="catalogue-page" id="shop-top" ref={pageRef}>
      <section
        className="catalogue-hero shell"
        aria-labelledby="catalogue-title"
        ref={stageRef}
      >
        <div className="catalogue-hero-copy">
          <p className="eyebrow" data-reveal>
            <Sparkles size={13} aria-hidden="true" />
            {user ? `Welcome back, ${firstName}` : 'The YURO shop'} · Vol. 01
          </p>
          <h1 id="catalogue-title">
            {user ? (
              <>
                Your edit is
                <br />
                <span className="catalogue-gradient">waiting.</span>
              </>
            ) : (
              <>
                Pieces worth
                <br />
                <span className="catalogue-gradient">keeping.</span>
              </>
            )}
          </h1>
          <p className="catalogue-intro">
            A product-first edit of apparel, home, accessories and footwear from
            independent shops. Recommendations sit at the top; the full
            catalogue is one scroll below.
          </p>

          <div className="catalogue-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => scrollToId('recommendations')}
            >
              See your recommendations
              <ArrowDown size={16} />
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => scrollToId('shop')}
            >
              Browse every piece
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="catalogue-stats">
            <div>
              <strong>{products.length}</strong>
              <span>Pieces in the edit</span>
            </div>
            <div>
              <strong>{shopCount || 1}</strong>
              <span>Independent shops</span>
            </div>
            <div>
              <strong>{categories.length - 1}</strong>
              <span>Collections</span>
            </div>
          </div>
        </div>

        <div className="catalogue-stack" data-reveal aria-label="Recommended pieces">
          <span className="catalogue-stack-orbit" aria-hidden="true" />
          {stackProducts.map((product, index) => (
            <button
              type="button"
              key={product.id}
              className={`catalogue-stack-card stack-${index}`}
              onClick={() => onQuickView(product.id)}
              style={
                {
                  '--stack-index': index,
                  '--reveal-delay': `${120 + index * 100}ms`,
                } as CSSProperties
              }
              aria-label={`View ${product.name}`}
            >
              <SafeImage
                src={product.image}
                alt=""
                className="catalogue-stack-img"
                sizes="(max-width: 900px) 44vw, 280px"
              />
              <span className="catalogue-stack-meta">
                <small>{product.category}</small>
                <strong>{product.name}</strong>
              </span>
            </button>
          ))}
          <span className="catalogue-stack-caption">
            CURATED / {new Date().getFullYear()}
          </span>
          <span className="catalogue-stack-status">
            <span className="live-dot" aria-hidden="true" />
            {recommendations.products.length} picks ready
          </span>
        </div>
      </section>

      {catalogueError && (
        <div className="shell">
          <div className="connection-banner" role="status">
            <Database size={16} />
            <div>
              <strong>Marketplace catalogue unavailable</strong>
              <span>
                {catalogueError} You can browse the saved fallback catalogue,
                but checkout requires the server.
              </span>
            </div>
          </div>
        </div>
      )}

      <section
        className="section shell catalogue-recommendations"
        id="recommendations"
        aria-labelledby="recommendations-title"
      >
        <div className="section-head" data-reveal>
          <div>
            <p className="eyebrow">
              {recommendations.signalCount > 0
                ? 'Your activity, considered'
                : 'The opening edit'}
            </p>
            <h2 id="recommendations-title">
              Recommended for you<span>.</span>
            </h2>
          </div>
          <p>{reason}</p>
        </div>

        <div className="product-grid recommendation-grid">
          {recommendations.products.map((product, index) => (
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
      </section>

      <section
        className="section shell shop-section catalogue-catalogue"
        id="shop"
        aria-labelledby="catalogue-grid-title"
      >
        <div className="section-head" data-reveal>
          <div>
            <p className="eyebrow">The full catalogue</p>
            <h2 id="catalogue-grid-title">
              Every piece<span>.</span>
            </h2>
          </div>
          <p>
            Search across every approved shop, filter by collection, or sort the
            edit. Stock and totals stay in sync with the marketplace server.
          </p>
        </div>

        <div className="shop-toolbar">
          <div
            className="category-filters"
            role="group"
            aria-label="Filter by category"
          >
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                className={`filter-chip${category === item ? ' is-active' : ''}`}
                aria-pressed={category === item}
                onClick={() => onSelectCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="toolbar-meta">
            <label className="sort-control">
              <span className="sr-only">Sort products</span>
              <select
                value={sort}
                onChange={(event) =>
                  onSortChange(event.target.value as SortOption)
                }
                aria-label="Sort products"
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
              <ChevronDown size={14} aria-hidden="true" />
            </label>
            <span className="result-count" aria-live="polite">
              {filteredProducts.length}{' '}
              {filteredProducts.length === 1 ? 'piece' : 'pieces'}
            </span>
          </div>
        </div>

        <div id="shop-results" className="search-results catalogue-results">
          {search.trim() && (
            <div className="active-search">
              <Search size={14} aria-hidden="true" />
              <span>
                Results for <strong>“{search.trim()}”</strong>
              </span>
              <button
                type="button"
                className="text-link"
                onClick={() => onSearchChange('')}
              >
                Clear search
                <X size={13} />
              </button>
            </div>
          )}

          {filteredProducts.length > 0 ? (
            <div className="product-grid">
              {filteredProducts.map((product, index) => (
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
          ) : (
            <div className="empty-state">
              <span className="empty-icon" aria-hidden="true">
                <Search size={24} />
              </span>
              <h3>No pieces found</h3>
              <p>Try a different search term or return to the full catalogue.</p>
              <div className="empty-actions">
                {search.trim() && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => onSearchChange('')}
                  >
                    Clear search
                    <X size={14} />
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    onResetFilters();
                    scrollToId('shop');
                  }}
                >
                  View all pieces
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {recentlyViewedProducts.length > 0 && (
        <section
          className="section shell recent-section"
          aria-labelledby="recent-title"
        >
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">Pick up where you left off</p>
              <h2 id="recent-title">
                Recently viewed<span>.</span>
              </h2>
            </div>
            <button type="button" className="text-link" onClick={onClearRecent}>
              Clear history
              <X size={13} />
            </button>
          </div>

          <div className="product-grid">
            {recentlyViewedProducts.map((product, index) => (
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
        </section>
      )}

      <section className="section shell catalogue-closing" data-reveal>
        <div className="catalogue-closing-inner">
          <Store size={18} aria-hidden="true" />
          <div>
            <p className="eyebrow">Independent by design</p>
            <p>
              Every shop is reviewed before it can publish. Every order keeps a
              clear record of who is fulfilling what.
            </p>
          </div>
          <button
            type="button"
            className="text-link"
            onClick={() => scrollToId('shop-top')}
          >
            Back to the top
            <ArrowUp size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}
