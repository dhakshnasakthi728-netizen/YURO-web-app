import { useEffect, useRef, useState } from 'react';
import type {
  FocusEvent as ReactFocusEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Heart,
  Menu,
  ShoppingBag,
  X,
} from 'lucide-react';
import type { Product, Shop } from '../types';
import { Brand } from './Brand';
import { ThemeMenu } from './ThemeMenu';
import { AccountMenu } from './AccountMenu';
import { SearchExperience } from './SearchExperience';
import { reduceMotionRequested } from '../lib/motion';
import { scrollToId, scrollToIdWhenReady } from '../lib/scroll';

type HeaderProps = {
  search: string;
  products: Product[];
  shops: Shop[];
  recent: number[];
  catalogueLoading: boolean;
  cartCount: number;
  wishlistCount: number;
  cartPulse: number;
  wishlistPulse: number;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSelectProduct: (productId: number) => void;
  onSelectCategory: (category: string) => void;
  onSelectShop: (slug: string) => void;
  onOpenAuth: () => void;
  onSignedOut: () => void;
};

type NavIndicator = {
  left: number;
  width: number;
  visible: boolean;
  kind: 'link' | 'shop';
};

type LaunchSection = 'featured' | 'collections' | 'story';

// Sections are listed in the order they appear in the launch document. The
// header's visual order is different: "The edit" is the first destination,
// even though the collections band sits above the edit further down the page.
const LAUNCH_SCROLL_SECTIONS: LaunchSection[] = [
  'collections',
  'featured',
  'story',
];

function navLinkClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'is-active' : undefined;
}

function shopLinkClass({ isActive }: { isActive: boolean }) {
  return `nav-shop-link${isActive ? ' is-active' : ''}`;
}

export function Header({
  search,
  products,
  shops,
  recent,
  catalogueLoading,
  cartCount,
  wishlistCount,
  cartPulse,
  wishlistPulse,
  onSearchChange,
  onSearchSubmit,
  onSelectProduct,
  onSelectCategory,
  onSelectShop,
  onOpenAuth,
  onSignedOut,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [condensed, setCondensed] = useState(false);
  const [entranceDone, setEntranceDone] = useState(false);
  const [activeSection, setActiveSection] =
    useState<LaunchSection>('featured');
  const [indicator, setIndicator] = useState<NavIndicator>({
    left: 0,
    width: 0,
    visible: false,
    kind: 'link',
  });
  const [hoverIndicator, setHoverIndicator] = useState<NavIndicator | null>(
    null,
  );
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const condensedRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isLaunch = location.pathname === '/';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // The entrance is a one-time arrival. Once it has played, later route and
  // auth updates must not replay the stagger.
  useEffect(() => {
    const timer = window.setTimeout(() => setEntranceDone(true), 1100);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    const closeOnOutsidePress = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !headerRef.current?.contains(target)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnOutsidePress);
    };
  }, [menuOpen]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1360px)');
    const handleChange = () => {
      if (desktop.matches) setMenuOpen(false);
    };

    desktop.addEventListener('change', handleChange);
    return () => desktop.removeEventListener('change', handleChange);
  }, []);

  // One rAF-throttled scroll listener drives both the compact header state and
  // the measured header offset used by floating menus. The state only changes
  // when the page crosses the threshold, so scrolling does not re-render App.
  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      // A small amount of hysteresis stops the capsule flickering when the
      // page rests right on the compact threshold.
      const nextCondensed = condensedRef.current
        ? window.scrollY > 8
        : window.scrollY > 28;
      if (nextCondensed !== condensedRef.current) {
        condensedRef.current = nextCondensed;
        setCondensed(nextCondensed);
      }

      const bottom = headerRef.current?.getBoundingClientRect().bottom;
      if (bottom !== undefined) {
        document.documentElement.style.setProperty(
          '--header-bottom',
          `${Math.round(bottom)}px`,
        );
      }
    };

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, []);

  // The launch navigation is a set of in-page destinations rather than router
  // links. Keep one of them visibly current as the visitor moves through the
  // story, so the header never looks like a row of inert labels.
  useEffect(() => {
    if (!isLaunch) return;

    let frame = 0;

    const update = () => {
      frame = 0;
      const headerBottom =
        headerRef.current?.getBoundingClientRect().bottom ?? 96;
      const marker = headerBottom + Math.min(window.innerHeight * 0.3, 240);
      const atDocumentEnd =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 2;

      let next: LaunchSection = 'featured';

      if (atDocumentEnd) {
        next = 'story';
      } else if (window.scrollY > 40) {
        for (const id of LAUNCH_SCROLL_SECTIONS) {
          const section = document.getElementById(id);
          if (section && section.getBoundingClientRect().top <= marker) {
            next = id;
          }
        }
      }

      setActiveSection((current) => (current === next ? current : next));
    };

    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
    };
  }, [isLaunch]);

  useEffect(() => {
    const inner = headerRef.current?.querySelector('.header-inner');
    if (!inner) return;

    const updateOffset = () => {
      const bottom = headerRef.current?.getBoundingClientRect().bottom;
      if (bottom === undefined) return;
      document.documentElement.style.setProperty(
        '--header-bottom',
        `${Math.round(bottom)}px`,
      );
    };

    updateOffset();
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateOffset);
    observer?.observe(inner);

    return () => observer?.disconnect();
  }, []);

  // The entrance transform affects getBoundingClientRect while it is playing,
  // and the compact state animates the header top for another moment after
  // state changes. Re-measure once those transforms settle so fixed mobile
  // menus are anchored below the header they actually see.
  useEffect(() => {
    if (!entranceDone) return;

    const updateOffset = () => {
      const bottom = headerRef.current?.getBoundingClientRect().bottom;
      if (bottom === undefined) return;
      document.documentElement.style.setProperty(
        '--header-bottom',
        `${Math.round(bottom)}px`,
      );
    };

    const timer = window.setTimeout(updateOffset, condensed ? 320 : 0);
    return () => window.clearTimeout(timer);
  }, [condensed, entranceDone]);

  // A single fine rail travels between active destinations instead of each
  // link carrying its own static underline.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    let frame = 0;

    const measure = () => {
      frame = 0;
      const active = nav.querySelector<HTMLElement>('.is-active');

      if (!active) {
        setIndicator((current) =>
          current.visible
            ? { left: 0, width: 0, visible: false, kind: 'link' }
            : current,
        );
        return;
      }

      const next: NavIndicator = {
        left: active.offsetLeft,
        width: active.offsetWidth,
        visible: true,
        kind: active.classList.contains('nav-shop-link') ? 'shop' : 'link',
      };
      setIndicator((current) =>
        current.left === next.left &&
        current.width === next.width &&
        current.visible === next.visible &&
        current.kind === next.kind
          ? current
          : next,
      );
    };

    const requestMeasure = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('resize', requestMeasure);

    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(requestMeasure);
    observer?.observe(nav);

    if (document.fonts?.ready) {
      void document.fonts.ready.then(requestMeasure).catch(() => undefined);
    }

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', requestMeasure);
      observer?.disconnect();
    };
  }, [activeSection, isLaunch, location.pathname]);

  const showNavIndicator = (item: HTMLElement) => {
    if (item.classList.contains('nav-shop-link')) {
      setHoverIndicator(null);
      return;
    }

    const next: NavIndicator = {
      left: item.offsetLeft,
      width: item.offsetWidth,
      visible: true,
      kind: 'link',
    };
    setHoverIndicator((current) =>
      current &&
      current.left === next.left &&
      current.width === next.width &&
      current.visible
        ? current
        : next,
    );
  };

  const handleNavPointerOver = (event: ReactPointerEvent<HTMLElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      'a, button',
    );
    if (!target) return;
    showNavIndicator(target);
  };

  const handleNavFocus = (event: ReactFocusEvent<HTMLElement>) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      'a, button',
    );
    if (!target) return;
    showNavIndicator(target);
  };

  const handleNavBlur = (event: ReactFocusEvent<HTMLElement>) => {
    const nextFocus = event.relatedTarget as Node | null;
    if (!nextFocus || !event.currentTarget.contains(nextFocus)) {
      setHoverIndicator(null);
    }
  };

  const goToLaunchSection = (id: string) => {
    setMenuOpen(false);
    if (location.pathname !== '/') {
      navigate('/');
      scrollToIdWhenReady(id);
      return;
    }
    scrollToId(id);
  };

  const goToStory = () => goToLaunchSection('story');
  const visibleIndicator = hoverIndicator ?? indicator;

  return (
    <header
      ref={headerRef}
      className={`site-header${condensed ? ' is-condensed' : ''}${
        entranceDone ? ' is-entrance-done' : ''
      }`}
    >
      <div className="header-inner glass">
        <button
          type="button"
          className="icon-button nav-toggle header-reveal"
          style={{ animationDelay: '0ms' }}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={19} /> : <Menu size={19} />}
        </button>

        <Brand
          href="/"
          className="header-reveal"
          style={{ animationDelay: '40ms' }}
          onClick={() => {
            setMenuOpen(false);
            if (location.pathname === '/') {
              window.scrollTo({
                top: 0,
                behavior: reduceMotionRequested() ? 'auto' : 'smooth',
              });
            }
          }}
        />

        <nav
          id="primary-navigation"
          className={`primary-nav${menuOpen ? ' is-open' : ''}`}
          aria-label="Primary"
          ref={navRef}
          onPointerOver={handleNavPointerOver}
          onPointerLeave={() => setHoverIndicator(null)}
          onFocus={handleNavFocus}
          onBlur={handleNavBlur}
        >
          <span
            className={`nav-indicator${
              visibleIndicator.kind === 'shop' ? ' is-shop' : ''
            }`}
            aria-hidden="true"
            style={{
              left: visibleIndicator.left,
              width: visibleIndicator.width,
              opacity: visibleIndicator.visible ? 1 : 0,
            }}
          />

          {isLaunch ? (
            <>
              <button
                type="button"
                className={
                  activeSection === 'featured' ? 'is-active' : undefined
                }
                aria-current={
                  activeSection === 'featured' ? 'location' : undefined
                }
                onClick={() => goToLaunchSection('featured')}
              >
                The edit
              </button>
              <button
                type="button"
                className={
                  activeSection === 'collections' ? 'is-active' : undefined
                }
                aria-current={
                  activeSection === 'collections' ? 'location' : undefined
                }
                onClick={() => goToLaunchSection('collections')}
              >
                Collections
              </button>
              <button
                type="button"
                className={activeSection === 'story' ? 'is-active' : undefined}
                aria-current={
                  activeSection === 'story' ? 'location' : undefined
                }
                onClick={goToStory}
              >
                Our story
              </button>
              <NavLink
                to="/shops"
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Shops
              </NavLink>
              <NavLink
                to="/shop"
                className={shopLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                <span>Shop</span>
                <ArrowUpRight
                  className="nav-shop-arrow"
                  size={12}
                  aria-hidden="true"
                />
              </NavLink>
            </>
          ) : (
            <>
              <NavLink
                to="/"
                end
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Home
              </NavLink>
              <NavLink
                to="/shop"
                className={shopLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                <span>Shop</span>
                <ArrowUpRight
                  className="nav-shop-arrow"
                  size={12}
                  aria-hidden="true"
                />
              </NavLink>
              <NavLink
                to="/shops"
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                Shops
              </NavLink>
              <NavLink
                to="/orders"
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                My orders
              </NavLink>
              <button type="button" onClick={goToStory}>
                Our story
              </button>
            </>
          )}
        </nav>

        <div className="header-actions">
          <SearchExperience
            className="header-reveal"
            style={{ animationDelay: '120ms' }}
            search={search}
            products={products}
            shops={shops}
            recent={recent}
            loading={catalogueLoading}
            isLaunch={isLaunch}
            onSearchChange={onSearchChange}
            onSearchSubmit={onSearchSubmit}
            onSelectProduct={onSelectProduct}
            onSelectCategory={onSelectCategory}
            onSelectShop={onSelectShop}
          />

          {!isLaunch && (
            <span
              className="header-tool header-reveal"
              style={{ animationDelay: '180ms' }}
            >
              <ThemeMenu />
            </span>
          )}

          <span
            className="header-tool header-reveal"
            style={{ animationDelay: '220ms' }}
          >
            <AccountMenu
              onOpenAuth={onOpenAuth}
              onSignedOut={onSignedOut}
              onNavigate={() => setMenuOpen(false)}
            />
          </span>

          <NavLink
            to="/wishlist"
            className={({ isActive }) =>
              `icon-button header-icon-button wishlist-button header-reveal${
                isActive ? ' is-active' : ''
              }${wishlistCount > 0 ? ' is-filled' : ''}`
            }
            style={{ animationDelay: '260ms' }}
            onClick={() => setMenuOpen(false)}
            aria-label={`View wishlist, ${wishlistCount} ${
              wishlistCount === 1 ? 'item' : 'items'
            }`}
          >
            <span
              key={`wishlist-pulse-${wishlistPulse}`}
              className={`header-icon-glyph${
                wishlistPulse > 0 ? ' is-pulsing' : ''
              }`}
            >
              <Heart size={18} />
            </span>
            <span
              className="header-count"
              key={`wishlist-count-${wishlistCount}`}
              aria-hidden="true"
            >
              {wishlistCount}
            </span>
          </NavLink>

          <NavLink
            to="/cart"
            className={({ isActive }) =>
              `bag-button header-reveal${isActive ? ' is-active' : ''}`
            }
            style={{ animationDelay: '300ms' }}
            onClick={() => setMenuOpen(false)}
            aria-label={`View shopping bag, ${cartCount} ${
              cartCount === 1 ? 'item' : 'items'
            }`}
          >
            <span
              key={`cart-pulse-${cartPulse}`}
              className={`header-icon-glyph${
                cartPulse > 0 ? ' is-pulsing' : ''
              }`}
            >
              <ShoppingBag size={17} />
            </span>
            <span className="bag-label">Bag</span>
            <span
              className="bag-count"
              key={`cart-count-${cartCount}`}
              aria-hidden="true"
            >
              {cartCount}
            </span>
          </NavLink>
        </div>
      </div>
    </header>
  );
}
