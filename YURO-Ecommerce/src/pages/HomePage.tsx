import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Database,
  Heart,
  Plus,
  Sparkles,
  Store,
  Truck,
} from 'lucide-react';
import type { CommerceSettings, Product, Shop } from '../types';
import { categoryOptions } from '../lib/catalogue';
import { collections } from '../data/products';
import { formatPrice } from '../lib/format';
import { scrollToId } from '../lib/scroll';
import { SafeImage } from '../components/SafeImage';
import { ShopCard } from '../components/ShopCard';
import { usePointerStage } from '../hooks/usePointerStage';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { useTypewriter } from '../hooks/useTypewriter';
import { useTheme } from '../contexts/ThemeContext';

type HomePageProps = {
  products: Product[];
  shops: Shop[];
  settings: CommerceSettings;
  wishlist: number[];
  catalogueError: string;
  onAddToCart: (productId: number, quantity?: number) => void;
  onToggleWishlist: (productId: number) => void;
};

const HERO_PHRASES = [
  'considered living',
  'quiet luxury',
  'independent craft',
  'everyday rituals',
] as const;

const BRAND_RAIL = [
  'Independent shops',
  'Considered objects',
  'Edited with intention',
  'Made to be kept',
  'Cash on delivery',
] as const;

const KINETIC_WORDS = [
  'Considered objects',
  'Independent shops',
  'Quiet luxury',
  'Made to be kept',
] as const;

export function HomePage({
  products,
  shops,
  settings,
  wishlist,
  catalogueError,
  onAddToCart,
  onToggleWishlist,
}: HomePageProps) {
  const { motionEnabled } = useTheme();
  const typedPhrase = useTypewriter(HERO_PHRASES, motionEnabled);
  const heroRef = usePointerStage<HTMLElement>();

  const categories = useMemo(() => categoryOptions(products), [products]);

  // The shops request can lag or fail independently of the catalogue. Counting
  // distinct product shop ids keeps the launch copy truthful until (or unless)
  // the shop list arrives, instead of inventing a placeholder seller.
  const shopCount = shops.length || new Set(products.map((product) => product.shopId)).size;

  const featuredProducts = useMemo(() => {
    const featured = products.filter((product) => product.featured);
    return (featured.length > 0 ? featured : products).slice(0, 4);
  }, [products]);

  const heroProduct = products.find((product) => product.id === 3) || products[0];
  const featureProduct = featuredProducts[0];
  const featureCompanions = featuredProducts
    .filter(
      (product) =>
        product.id !== featureProduct?.id && product.id !== heroProduct?.id,
    )
    .slice(0, 3);
  const featureSaved = featureProduct
    ? wishlist.includes(featureProduct.id)
    : false;
  const featureStock = featureProduct
    ? featureProduct.stock <= 0
      ? 'Sold out'
      : featureProduct.stock <= 3
        ? `Only ${featureProduct.stock} left`
        : 'In stock'
    : '';

  const promises = [
    {
      icon: Truck,
      title: 'Complimentary shipping',
      text: `On orders over ${formatPrice(settings.freeShippingThreshold)}`,
    },
    {
      icon: Store,
      title: 'Independent shops',
      text: `${shopCount} ${shopCount === 1 ? 'shop' : 'shops'} in the marketplace`,
    },
    {
      icon: Banknote,
      title: 'Cash on delivery',
      text: 'Payment is collected on delivery',
    },
    {
      icon: Database,
      title: 'Account order history',
      text: 'Saved on the marketplace server',
    },
  ];

  const pageRef = useScrollReveal<HTMLDivElement>([products, shops.length]);

  return (
    <div className="home-page launch-page" ref={pageRef}>
      <section
        className="hero launch-hero shell"
        aria-labelledby="hero-title"
        ref={heroRef}
      >
        <div className="hero-copy">
          <span className="eyebrow hero-eyebrow">
            <Sparkles size={13} />
            The considered marketplace · Vol. 01
          </span>
          <h1 id="hero-title">
            Objects with a
            <br />
            <span className="accent-text hero-accent-line">
              quiet point of view.
            </span>
          </h1>
          <p className="hero-typed">
            <span className="hero-typed-rule" aria-hidden="true" />
            <span className="hero-typed-label">Curated for</span>
            <span className="hero-typed-word" aria-hidden="true">
              {typedPhrase}
            </span>
            <span className="hero-typed-caret" aria-hidden="true" />
            <span className="sr-only">
              considered living, quiet luxury, independent craft and everyday
              rituals.
            </span>
          </p>
          <p className="hero-description">
            A quieter marketplace for objects with a point of view. Discover
            apparel, home, accessories and footwear from approved independent
            sellers, selected for clarity and craft.
          </p>

          <div className="hero-actions">
            <Link className="btn btn-primary" to="/shop">
              Enter the shop
              <ArrowUpRight size={17} />
            </Link>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => scrollToId('story')}
            >
              Read our story
              <ArrowDown size={16} />
            </button>
          </div>

          <div className="hero-stats">
            <div>
              <strong>{products.length}</strong>
              <span>Curated pieces</span>
            </div>
            <div>
              <strong>{shopCount}</strong>
              <span>Independent shops</span>
            </div>
            <div>
              <strong>{categories.length - 1}</strong>
              <span>Collections</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="launch-hero-colour" aria-hidden="true">
            <span className="launch-colour blush" />
            <span className="launch-colour butter" />
            <span className="launch-colour sage" />
          </div>

          <div className="hero-frame launch-hero-frame">
            <SafeImage
              src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1400&q=85"
              alt="A calm, carefully styled contemporary living space"
              className="hero-img"
              eager
              sizes="(max-width: 960px) 100vw, 50vw"
            />
            <span className="hero-frame-shade" aria-hidden="true" />
            <span className="launch-hero-wash" aria-hidden="true" />

            {heroProduct && (
              <div className="hero-floating glass">
                <SafeImage
                  src={heroProduct.image}
                  alt={heroProduct.name}
                  className="hero-thumb"
                  sizes="56px"
                />
                <div className="hero-floating-copy">
                  <span>Featured piece</span>
                  <strong>{heroProduct.name}</strong>
                  <small>{formatPrice(heroProduct.price)}</small>
                </div>
                <Link
                  className="icon-button hero-floating-open"
                  to={`/product/${heroProduct.id}`}
                  aria-label={`View ${heroProduct.name}`}
                >
                  <ArrowUpRight size={16} />
                </Link>
              </div>
            )}

            <span className="hero-drop-chip glass">
              <span className="live-dot" aria-hidden="true" />
              YURO / Marketplace
            </span>

            <span className="hero-side-label" aria-hidden="true">
              CONSIDERED OBJECTS · 2026
            </span>
            <span className="launch-hero-stamp" aria-hidden="true">
              YURO / 01
            </span>
          </div>

          <div className="launch-palette" aria-hidden="true">
            <span className="launch-palette-swatch swatch-blush" />
            <span className="launch-palette-swatch swatch-butter" />
            <span className="launch-palette-swatch swatch-sage" />
            <span className="launch-palette-swatch swatch-ink" />
            <small>Seasonal palette / 2026</small>
          </div>

          <div className="hero-rings" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
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

      <div className="shell">
        <div className="brand-rail" aria-hidden="true">
          <div className="brand-rail-track">
            {Array.from({ length: 6 }, (_, copy) => (
              <div className="brand-rail-group" key={copy}>
                <span className="brand-rail-word">
                  YUR<span className="brand-rail-o">O</span>
                </span>
                {BRAND_RAIL.map((item) => (
                  <span className="brand-rail-item" key={`${copy}-${item}`}>
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <section
        className="launch-manifesto shell"
        aria-labelledby="manifesto-title"
        data-reveal
      >
        <div className="launch-manifesto-copy">
          <p className="eyebrow">A different pace</p>
          <h2 id="manifesto-title">
            A quieter room for
            <br />
            <span>objects with a point of view.</span>
          </h2>
          <p>
            YURO gathers independent shops into one considered edit. Nothing
            loud, nothing disposable — just well-made pieces, clear information
            and the stories of the people who make them.
          </p>
          <button
            type="button"
            className="text-link launch-manifesto-link"
            onClick={() => scrollToId('story')}
          >
            Why we started
            <ArrowDown size={15} />
          </button>
        </div>

        <div className="launch-promises" aria-label="Marketplace details">
          {promises.map((item) => {
            const Icon = item.icon;
            return (
              <article className="launch-promise" key={item.title}>
                <span className="launch-promise-icon" aria-hidden="true">
                  <Icon size={17} />
                </span>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </article>
            );
          })}
        </div>
      </section>

      <section className="section shell launch-collections" id="collections">
        <div className="section-head" data-reveal>
          <div>
            <p className="eyebrow">The collections</p>
            <h2>
              Four ways to live<span>.</span>
            </h2>
          </div>
          <Link className="text-link" to="/shop">
            Browse all pieces
            <ArrowRight size={15} />
          </Link>
        </div>

        <div className="collection-grid">
          {collections.map((collection, index) => {
            const count = products.filter(
              (product) => product.category === collection.category,
            ).length;

            return (
              <Link
                className="collection-card"
                key={collection.category}
                to={`/shop?category=${encodeURIComponent(collection.category)}`}
                style={
                  {
                    '--card-delay': `${index * 90}ms`,
                    '--reveal-delay': `${index * 90}ms`,
                  } as CSSProperties
                }
                data-reveal
                aria-label={`Browse ${collection.title}`}
              >
                <SafeImage
                  src={collection.image}
                  alt=""
                  className="collection-img"
                  sizes="(max-width: 680px) 100vw, (max-width: 1100px) 50vw, 25vw"
                />
                <span className="collection-shade" aria-hidden="true" />
                <span className="collection-content">
                  <span className="collection-count">{count} pieces</span>
                  <span className="collection-title">{collection.title}</span>
                  <span className="collection-subtitle">
                    {collection.subtitle}
                  </span>
                </span>
                <span className="collection-arrow" aria-hidden="true">
                  <ArrowUpRight size={17} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {featureProduct && (
        <section
          className="section shell launch-edit"
          id="featured"
          aria-labelledby="launch-edit-title"
        >
          <div className="launch-edit-head" data-reveal>
            <div>
              <p className="eyebrow">The opening edit</p>
              <h2 id="launch-edit-title">
                One piece, considered<span>.</span>
              </h2>
            </div>
            <Link className="text-link" to="/shop?sort=featured">
              Browse the full edit
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="launch-edit-panel" data-reveal>
            <div className="launch-edit-media">
              <SafeImage
                src={featureProduct.image}
                alt={featureProduct.name}
                className="launch-edit-img"
                sizes="(max-width: 960px) 100vw, 55vw"
              />
              <span className="launch-edit-wash" aria-hidden="true" />
              <span className="launch-edit-stamp">Featured / 01</span>
              <Link
                className="launch-edit-view"
                to={`/product/${featureProduct.id}`}
              >
                View piece
                <ArrowUpRight size={15} />
              </Link>
            </div>

            <div className="launch-edit-copy">
              <span className="launch-edit-kicker">
                {featureProduct.category} · {featureProduct.shopName}
              </span>
              <h3>
                {featureProduct.name}
                <span>.</span>
              </h3>
              <p className="launch-edit-description">
                {featureProduct.description}
              </p>

              <div className="launch-edit-meta">
                <div>
                  <small>Price</small>
                  <strong>{formatPrice(featureProduct.price)}</strong>
                </div>
                <div>
                  <small>From</small>
                  <span>{featureProduct.shopName}</span>
                </div>
                <div>
                  <small>Availability</small>
                  <span>{featureStock}</span>
                </div>
              </div>

              <div className="launch-edit-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onAddToCart(featureProduct.id)}
                  disabled={featureProduct.stock <= 0}
                >
                  {featureProduct.stock <= 0 ? 'Sold out' : 'Add to bag'}
                  <Plus size={16} />
                </button>
                <button
                  type="button"
                  className={`launch-edit-wishlist${featureSaved ? ' is-saved' : ''}`}
                  onClick={() => onToggleWishlist(featureProduct.id)}
                  aria-pressed={featureSaved}
                  aria-label={
                    featureSaved
                      ? `Remove ${featureProduct.name} from wishlist`
                      : `Save ${featureProduct.name} to wishlist`
                  }
                >
                  <Heart
                    size={16}
                    fill={featureSaved ? 'currentColor' : 'none'}
                  />
                  {featureSaved ? 'Saved' : 'Save piece'}
                </button>
              </div>

              {featureCompanions.length > 0 && (
                <div className="launch-edit-companions">
                  <span className="launch-edit-companions-label">
                    Also in the edit
                  </span>
                  <div className="launch-edit-companion-row">
                    {featureCompanions.map((product) => (
                      <Link
                        key={product.id}
                        to={`/product/${product.id}`}
                        aria-label={`View ${product.name}`}
                      >
                        <SafeImage
                          src={product.image}
                          alt=""
                          className="launch-edit-companion-img"
                          sizes="88px"
                        />
                        <span>
                          <small>{product.category}</small>
                          <strong>{product.name}</strong>
                          <em>{formatPrice(product.price)}</em>
                        </span>
                        <ArrowUpRight size={13} aria-hidden="true" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      <section className="section shell story-section launch-story" id="story">
        <div className="story-panel" data-reveal>
          <div className="story-media">
            <SafeImage
              src="https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80"
              alt="A calm, considered interior with natural materials"
              className="story-img"
              sizes="(max-width: 900px) 100vw, 50vw"
            />
            <span className="story-tag">Point of view / 01</span>
          </div>

          <div className="story-copy">
            <p className="eyebrow">A quieter way to shop</p>
            <h2>
              Many shops.
              <br />
              <span>One clear standard.</span>
            </h2>
            <p>
              YURO brings independent sellers into one considered marketplace.
              Each shop is reviewed before it can publish, each product stays
              under the seller&apos;s care, and every order keeps a clear record
              of who is fulfilling what.
            </p>
            <ul className="story-points">
              <li>Approved independent shops with their own collections</li>
              <li>Server-side totals, stock checks and order history</li>
              <li>Cash on delivery with per-shop fulfilment tracking</li>
            </ul>
            <Link className="btn btn-ghost" to="/become-a-seller">
              Apply to sell on YURO
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {shops.length > 0 && (
        <section className="section shell shops-section launch-shops" id="shops">
          <div className="section-head" data-reveal>
            <div>
              <p className="eyebrow">The marketplace</p>
              <h2>
                Shops with a point of view<span>.</span>
              </h2>
            </div>
            <Link className="text-link" to="/become-a-seller">
              Open your own shop
              <ArrowRight size={15} />
            </Link>
          </div>

          <div className="shop-grid">
            {shops.slice(0, 4).map((shop, index) => (
              <ShopCard key={shop.id} shop={shop} index={index} />
            ))}
          </div>
        </section>
      )}

      <section
        className="section shell promo-section launch-promo"
        aria-labelledby="promo-title"
      >
        <div className="promo-band" data-reveal>
          <div className="promo-copy">
            <p className="eyebrow">A little more room</p>
            <h2 id="promo-title">
              Complimentary shipping,
              <br />
              <span>on us.</span>
            </h2>
            <p>
              Every order over {formatPrice(settings.freeShippingThreshold)}{' '}
              ships complimentary. No code, no noise — just a little more room
              to choose well.
            </p>
            <Link className="btn btn-primary" to="/shop">
              Find your pieces
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="promo-visual" aria-hidden="true">
            <span className="promo-orbit orbit-a" />
            <span className="promo-orbit orbit-b" />
            <span className="promo-core">Y</span>
            <span className="promo-label">
              FREE / OVER {formatPrice(settings.freeShippingThreshold)}
            </span>
          </div>
        </div>
      </section>

      <section className="kinetic-band" aria-labelledby="kinetic-title">
        <div className="kinetic-viewport" aria-hidden="true">
          <div className="kinetic-track">
            {[...KINETIC_WORDS, ...KINETIC_WORDS].map((word, index) => (
              <span key={`${word}-${index}`}>
                {word}
                <i />
              </span>
            ))}
          </div>
        </div>
        <div className="shell kinetic-copy" data-reveal>
          <div>
            <p className="eyebrow">The YURO standard</p>
            <h2 id="kinetic-title">
              Buy less.
              <br />
              <span>Keep longer.</span>
            </h2>
          </div>
          <div className="kinetic-copy-side">
            <p>
              A marketplace should make choosing easier, not louder. We edit for
              clarity, keep the seller&apos;s story attached, and let the objects
              do the talking.
            </p>
            <Link className="text-link" to="/shop">
              Enter the shop
              <ArrowUpRight size={15} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
