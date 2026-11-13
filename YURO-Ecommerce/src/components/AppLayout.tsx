import type { ReactNode } from 'react';
import type { Product, Shop } from '../types';
import { Footer } from './Footer';
import { Header } from './Header';
import { ScrollProgress } from './ScrollProgress';

type AppLayoutProps = {
  children: ReactNode;
  isLaunch: boolean;
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

/**
 * Shared application chrome. Page content is rendered by the router inside
 * this layout, while cart, theme and account state stay above it in App.
 */
export function AppLayout({
  children,
  isLaunch,
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
}: AppLayoutProps) {
  return (
    <div className={`app${isLaunch ? ' launch-shell' : ''}`} id="top">
      <div className="ambient" aria-hidden="true">
        <span className="orb orb-one" />
        <span className="orb orb-two" />
        <span className="orb orb-three" />
        <span className="ambient-grid" />
      </div>
      <ScrollProgress />
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <Header
        search={search}
        products={products}
        shops={shops}
        recent={recent}
        catalogueLoading={catalogueLoading}
        cartCount={cartCount}
        wishlistCount={wishlistCount}
        cartPulse={cartPulse}
        wishlistPulse={wishlistPulse}
        onSearchChange={onSearchChange}
        onSearchSubmit={onSearchSubmit}
        onSelectProduct={onSelectProduct}
        onSelectCategory={onSelectCategory}
        onSelectShop={onSelectShop}
        onOpenAuth={onOpenAuth}
        onSignedOut={onSignedOut}
      />

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>

      <Footer />
    </div>
  );
}
