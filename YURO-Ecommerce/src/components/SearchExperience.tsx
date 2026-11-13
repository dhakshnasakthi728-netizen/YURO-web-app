import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import {
  ArrowRight,
  CornerDownLeft,
  Search,
  Sparkles,
  Store,
  Tag,
  X,
} from 'lucide-react';
import type { Product, Shop } from '../types';
import { filterProducts } from '../lib/catalogue';
import { formatPrice } from '../lib/format';
import { SafeImage } from './SafeImage';

type SearchExperienceProps = {
  search: string;
  products: Product[];
  shops: Shop[];
  recent: number[];
  loading: boolean;
  isLaunch: boolean;
  className?: string;
  style?: CSSProperties;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSelectProduct: (productId: number) => void;
  onSelectCategory: (category: string) => void;
  onSelectShop: (slug: string) => void;
};

type ShopLite = {
  slug: string;
  name: string;
  category: string;
  logoUrl: string;
  description: string;
};

type ProductOption = {
  key: string;
  type: 'product';
  product: Product;
};

type CategoryOption = {
  key: string;
  type: 'category';
  category: string;
  count: number;
};

type ShopOption = {
  key: string;
  type: 'shop';
  shop: ShopLite;
};

type SubmitOption = {
  key: string;
  type: 'submit';
};

type SearchOption = ProductOption | CategoryOption | ShopOption | SubmitOption;

type SearchGroup = {
  id: string;
  label: string;
  options: SearchOption[];
};

function highlight(text: string, query: string) {
  if (!query) return text;

  const index = text.toLowerCase().indexOf(query.toLowerCase());
  if (index < 0) return text;

  return (
    <>
      {text.slice(0, index)}
      <mark>{text.slice(index, index + query.length)}</mark>
      {text.slice(index + query.length)}
    </>
  );
}

function uniqueShopsFromProducts(products: Product[]): ShopLite[] {
  const bySlug = new Map<string, ShopLite>();

  for (const product of products) {
    if (bySlug.has(product.shopSlug)) continue;
    bySlug.set(product.shopSlug, {
      slug: product.shopSlug,
      name: product.shopName,
      category: product.category,
      logoUrl: product.image,
      description: '',
    });
  }

  return Array.from(bySlug.values());
}

/**
 * YURO's signature search. It works from the live catalogue already held by
 * the application, and only navigates to real products, collections and shops.
 */
export function SearchExperience({
  search,
  products,
  shops,
  recent,
  loading,
  isLaunch,
  className = '',
  style,
  onSearchChange,
  onSearchSubmit,
  onSelectProduct,
  onSelectCategory,
  onSelectShop,
}: SearchExperienceProps) {
  const baseId = useId();
  const panelId = `${baseId}-search-panel`;
  const location = useLocation();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [hasOpened, setHasOpened] = useState(false);
  const [positioned, setPositioned] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const query = search.trim();
  const normalized = query.toLowerCase();

  const shopDirectory = useMemo<ShopLite[]>(() => {
    if (shops.length > 0) {
      return shops.map((shop) => ({
        slug: shop.slug,
        name: shop.name,
        category: shop.category,
        logoUrl: shop.logoUrl,
        description: shop.description,
      }));
    }
    return uniqueShopsFromProducts(products);
  }, [products, shops]);

  const categoryData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const product of products) {
      counts.set(product.category, (counts.get(product.category) ?? 0) + 1);
    }
    return Array.from(counts, ([name, count]) => ({ name, count }));
  }, [products]);

  const recentProducts = useMemo(
    () =>
      recent
        .map((id) => products.find((product) => product.id === id))
        .filter((product): product is Product => Boolean(product))
        .slice(0, 3),
    [products, recent],
  );

  const matchingProducts = useMemo(() => {
    if (!normalized) {
      if (recentProducts.length > 0) return recentProducts;
      const considered = products.filter(
        (product) =>
          product.stock > 0 && (product.featured || product.newArrival),
      );
      const pool = considered.length > 0 ? considered : products;
      return pool.filter((product) => product.stock > 0).slice(0, 3);
    }

    return filterProducts(products, {
      search: query,
      category: 'ALL',
      sort: 'featured',
    });
  }, [normalized, products, query, recentProducts]);

  const productResults = useMemo(
    () => matchingProducts.slice(0, normalized ? 4 : 3),
    [matchingProducts, normalized],
  );

  const categoryResults = useMemo(() => {
    if (!normalized) return categoryData.slice(0, 4);
    return categoryData
      .filter((category) => category.name.toLowerCase().includes(normalized))
      .slice(0, 3);
  }, [categoryData, normalized]);

  const shopResults = useMemo(() => {
    if (!normalized) return shopDirectory.slice(0, 2);
    return shopDirectory
      .filter((shop) =>
        [shop.name, shop.category, shop.description]
          .join(' ')
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 3);
  }, [normalized, shopDirectory]);

  const groups = useMemo<SearchGroup[]>(() => {
    const next: SearchGroup[] = [];

    if (productResults.length > 0) {
      next.push({
        id: 'products',
        label: normalized
          ? 'Pieces'
          : recentProducts.length > 0
            ? 'Recently viewed'
            : 'From the edit',
        options: productResults.map(
          (product): ProductOption => ({
            key: `product-${product.id}`,
            type: 'product',
            product,
          }),
        ),
      });
    }

    if (categoryResults.length > 0) {
      next.push({
        id: 'collections',
        label: 'Collections',
        options: categoryResults.map(
          (category): CategoryOption => ({
            key: `category-${category.name}`,
            type: 'category',
            category: category.name,
            count: category.count,
          }),
        ),
      });
    }

    if (shopResults.length > 0) {
      next.push({
        id: 'shops',
        label: 'Independent shops',
        options: shopResults.map(
          (shop): ShopOption => ({
            key: `shop-${shop.slug}`,
            type: 'shop',
            shop,
          }),
        ),
      });
    }

    return next;
  }, [categoryResults, normalized, productResults, recentProducts.length, shopResults]);

  const options = useMemo<SearchOption[]>(() => {
    const flattened = groups.flatMap((group) => group.options);
    flattened.push({ key: 'submit-search', type: 'submit' });
    return flattened;
  }, [groups]);

  const optionIndex = useMemo(
    () => new Map(options.map((option, index) => [option.key, index])),
    [options],
  );

  const hasResults = groups.length > 0;
  const activeOption = activeIndex >= 0 ? options[activeIndex] : undefined;
  const activeDescendant = open && activeOption
    ? `${baseId}-${activeOption.key}`
    : undefined;

  const openPanel = useCallback(() => {
    setOpen(true);
    setHasOpened(true);
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, []);

  const submitSearch = useCallback(() => {
    closePanel();
    inputRef.current?.blur();
    onSearchSubmit();
  }, [closePanel, onSearchSubmit]);

  const selectOption = useCallback(
    (option: SearchOption) => {
      closePanel();

      if (option.type === 'product') {
        onSelectProduct(option.product.id);
        return;
      }
      if (option.type === 'category') {
        onSelectCategory(option.category);
        return;
      }
      if (option.type === 'shop') {
        onSelectShop(option.shop.slug);
        return;
      }
      submitSearch();
    },
    [closePanel, onSelectCategory, onSelectProduct, onSelectShop, submitSearch],
  );

  useEffect(() => {
    closePanel();
  }, [closePanel, location.pathname]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [search]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        formRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      closePanel();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closePanel();
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [closePanel, open]);

  useLayoutEffect(() => {
    if (!open) {
      setPositioned(false);
      return;
    }

    const panel = panelRef.current;
    const form = formRef.current;
    if (!panel || !form) return;

    let frame = 0;

    const updatePosition = () => {
      frame = 0;
      const rect = form.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const gutter = viewportWidth <= 760 ? 10 : 14;
      const width = Math.min(
        viewportWidth <= 760 ? viewportWidth - gutter * 2 : 600,
        viewportWidth - gutter * 2,
      );
      const preferredLeft =
        viewportWidth <= 760 ? gutter : rect.right - width;
      const left = Math.min(
        Math.max(gutter, preferredLeft),
        viewportWidth - width - gutter,
      );
      const top = Math.max(12, Math.round(rect.bottom + 10));
      const maxHeight = Math.max(220, viewportHeight - top - 12);

      panel.style.width = `${Math.round(width)}px`;
      panel.style.left = `${Math.round(left)}px`;
      panel.style.top = `${top}px`;
      panel.style.maxHeight = `${Math.round(maxHeight)}px`;
      setPositioned(true);
    };

    const requestPosition = () => {
      if (!frame) frame = window.requestAnimationFrame(updatePosition);
    };

    updatePosition();
    window.addEventListener('scroll', requestPosition, { passive: true });
    window.addEventListener('resize', requestPosition);

    const headerInner = form.closest('.header-inner');
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(requestPosition);
    observer?.observe(form);
    if (headerInner) observer?.observe(headerInner);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', requestPosition);
      window.removeEventListener('resize', requestPosition);
      observer?.disconnect();
    };
  }, [hasOpened, open]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        closePanel();
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) openPanel();
      setActiveIndex((current) =>
        current < 0 ? 0 : (current + 1) % options.length,
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) openPanel();
      setActiveIndex((current) =>
        current <= 0 ? options.length - 1 : current - 1,
      );
      return;
    }

    if (event.key === 'Home' && open) {
      event.preventDefault();
      setActiveIndex(0);
      return;
    }

    if (event.key === 'End' && open) {
      event.preventDefault();
      setActiveIndex(options.length - 1);
      return;
    }

    if (event.key === 'Enter' && open) {
      event.preventDefault();
      const option = activeOption ?? options[0];
      if (option) {
        selectOption(option);
      } else {
        submitSearch();
      }
    }
  };

  const panelClass = [
    'search-panel',
    open ? 'is-open' : hasOpened ? 'is-closing' : '',
    positioned ? 'is-positioned' : '',
    isLaunch ? 'is-launch' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const panel = hasOpened ? (
    <div
      ref={panelRef}
      id={panelId}
      className={panelClass}
      role="listbox"
      aria-label="Search suggestions"
      aria-hidden={!open}
    >
      <div className="search-panel-head" role="presentation">
        <span className="search-panel-kicker">
          <Sparkles size={11} aria-hidden="true" />
          Search the edit
        </span>
        <span className="search-panel-shortcut">
          <kbd>Esc</kbd>
          close
        </span>
      </div>

      {!hasResults ? (
        <div className="search-panel-empty" role="status">
          <span className="search-empty-icon" aria-hidden="true">
            <Search size={18} />
          </span>
          <strong>
            {loading
              ? 'Opening the catalogue…'
              : `Nothing matched “${query}” yet.`}
          </strong>
          <p>
            {loading
              ? 'The pieces will appear as soon as the marketplace responds.'
              : 'Try a piece, a collection or the name of an independent shop.'}
          </p>
          {!loading && (
            <button
              type="button"
              className="search-panel-all"
              onClick={submitSearch}
            >
              Search the shop anyway
              <ArrowRight size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      ) : (
        <div className="search-panel-scroll">
          {groups.map((group) => (
            <div
              key={group.id}
              className={`search-group search-group-${group.id}`}
              role="group"
              aria-labelledby={`${baseId}-${group.id}`}
            >
              <p
                className="search-group-label"
                id={`${baseId}-${group.id}`}
              >
                <span>{group.label}</span>
                {group.id === 'products' && !normalized && (
                  <Sparkles size={11} aria-hidden="true" />
                )}
              </p>

              {group.id === 'collections' ? (
                <div className="search-chips">
                  {group.options.map((option) => {
                    if (option.type !== 'category') return null;
                    const index = optionIndex.get(option.key) ?? -1;
                    return (
                      <button
                        key={option.key}
                        id={`${baseId}-${option.key}`}
                        type="button"
                        role="option"
                        aria-selected={activeIndex === index}
                        className={`search-chip${
                          activeIndex === index ? ' is-active' : ''
                        }`}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectOption(option)}
                      >
                        <Tag size={12} aria-hidden="true" />
                        <span>{highlight(option.category, normalized)}</span>
                        <small>{option.count}</small>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="search-group-list">
                  {group.options.map((option) => {
                    if (option.type === 'product') {
                      const index = optionIndex.get(option.key) ?? -1;
                      return (
                        <button
                          key={option.key}
                          id={`${baseId}-${option.key}`}
                          type="button"
                          role="option"
                          aria-selected={activeIndex === index}
                          className={`search-result search-result-product${
                            activeIndex === index ? ' is-active' : ''
                          }`}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => selectOption(option)}
                        >
                          <span className="search-result-thumb" aria-hidden="true">
                            <SafeImage
                              src={option.product.image}
                              alt=""
                              sizes="46px"
                            />
                          </span>
                          <span className="search-result-copy">
                            <strong>
                              {highlight(option.product.name, normalized)}
                            </strong>
                            <small>
                              {highlight(option.product.category, normalized)}
                              <span aria-hidden="true"> · </span>
                              {highlight(option.product.shopName, normalized)}
                            </small>
                          </span>
                          <span className="search-result-price">
                            {formatPrice(option.product.price)}
                          </span>
                        </button>
                      );
                    }

                    if (option.type === 'shop') {
                      const index = optionIndex.get(option.key) ?? -1;
                      return (
                        <button
                          key={option.key}
                          id={`${baseId}-${option.key}`}
                          type="button"
                          role="option"
                          aria-selected={activeIndex === index}
                          className={`search-result search-result-shop${
                            activeIndex === index ? ' is-active' : ''
                          }`}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => selectOption(option)}
                        >
                          <span className="search-shop-mark" aria-hidden="true">
                            {option.shop.logoUrl ? (
                              <SafeImage
                                src={option.shop.logoUrl}
                                alt=""
                                sizes="40px"
                              />
                            ) : (
                              option.shop.name.charAt(0)
                            )}
                          </span>
                          <span className="search-result-copy">
                            <strong>{highlight(option.shop.name, normalized)}</strong>
                            <small>
                              Shop · {highlight(option.shop.category, normalized)}
                            </small>
                          </span>
                          <ArrowRight
                            className="search-result-arrow"
                            size={14}
                            aria-hidden="true"
                          />
                        </button>
                      );
                    }

                    return null;
                  })}
                </div>
              )}
            </div>
          ))}

          <button
            id={`${baseId}-submit-search`}
            type="button"
            role="option"
            aria-selected={activeIndex === optionIndex.get('submit-search')}
            className={`search-panel-all${
              activeIndex === optionIndex.get('submit-search') ? ' is-active' : ''
            }`}
            onMouseEnter={() =>
              setActiveIndex(optionIndex.get('submit-search') ?? -1)
            }
            onClick={submitSearch}
          >
            <span>
              <Search size={13} aria-hidden="true" />
              {normalized
                ? `See all results for “${query}”`
                : 'Browse the full shop'}
            </span>
            <span className="search-panel-all-meta">
              {normalized
                ? `${matchingProducts.length} ${
                    matchingProducts.length === 1 ? 'piece' : 'pieces'
                  }`
                : `${products.length} pieces`}
              <CornerDownLeft size={13} aria-hidden="true" />
            </span>
          </button>
        </div>
      )}
    </div>
  ) : null;

  return (
    <>
      <form
        ref={formRef}
        className={`search-form${open ? ' is-open' : ''} ${className}`.trim()}
        style={style}
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submitSearch();
        }}
      >
        <button
          type="submit"
          className="search-submit"
          aria-label="Search products, collections and shops"
          tabIndex={-1}
        >
          <Search size={15} aria-hidden="true" />
        </button>
        <input
          ref={inputRef}
          type="search"
          value={search}
          onChange={(event) => {
            onSearchChange(event.target.value);
            openPanel();
          }}
          onFocus={openPanel}
          onKeyDown={handleKeyDown}
          placeholder="Search pieces, shops"
          aria-label="Search products, collections and shops"
          role="combobox"
          aria-autocomplete="list"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={hasOpened ? panelId : undefined}
          aria-activedescendant={activeDescendant}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        {search ? (
          <button
            type="button"
            className="search-clear"
            onClick={() => {
              onSearchChange('');
              openPanel();
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
          >
            <X size={13} aria-hidden="true" />
          </button>
        ) : (
          <span className="search-hint" aria-hidden="true">
            <Store size={12} />
          </span>
        )}
      </form>

      {panel ? createPortal(panel, document.body) : null}
    </>
  );
}
