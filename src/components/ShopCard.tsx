import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import type { Shop } from '../types';
import { SafeImage } from './SafeImage';

type ShopCardProps = {
  shop: Shop;
  index?: number;
};

export function ShopCard({ shop, index = 0 }: ShopCardProps) {
  return (
    <Link
      to={`/shops/${shop.slug}`}
      className="shop-card"
      style={
        {
          '--card-delay': `${index * 85}ms`,
          '--reveal-delay': `${index * 85}ms`,
        } as CSSProperties
      }
      data-reveal
    >
      <div className="shop-card-media">
        {shop.bannerUrl ? (
          <SafeImage
            src={shop.bannerUrl}
            alt=""
            className="shop-card-banner"
            sizes="(max-width: 720px) 100vw, 50vw"
          />
        ) : (
          <span className="shop-card-pattern" aria-hidden="true" />
        )}
        <span className="shop-card-shade" aria-hidden="true" />
        {shop.logoUrl ? (
          <SafeImage
            src={shop.logoUrl}
            alt=""
            className="shop-card-logo"
            sizes="56px"
          />
        ) : (
          <span className="shop-card-logo fallback" aria-hidden="true">
            {shop.name.charAt(0)}
          </span>
        )}
      </div>
      <div className="shop-card-copy">
        <div>
          <h3>{shop.name}</h3>
          <span>
            {shop.category} · {shop.productCount ?? 0} pieces
          </span>
        </div>
        <ArrowUpRight size={17} />
      </div>
    </Link>
  );
}
