import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw, Store } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import type { Shop } from '../types';
import { PageHeader } from '../components/PageHeader';
import { ShopCard } from '../components/ShopCard';
import { useScrollReveal } from '../hooks/useScrollReveal';

export function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pageRef = useScrollReveal<HTMLDivElement>([shops.length]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.catalogue.shops();
      setShops(result.shops);
    } catch (cause) {
      setError(
        cause instanceof ApiError
          ? cause.message
          : 'Could not load the marketplace shops. Try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="page-section shell shops-page" ref={pageRef}>
      <PageHeader
        eyebrow="The marketplace"
        title={
          <>
            Independent shops<span>.</span>
          </>
        }
        description="Every shop is reviewed before it can publish. Browse their collections, meet the people behind them and shop their pieces directly."
        actions={
          <Link className="btn btn-ghost" to="/become-a-seller">
            <Store size={15} />
            Become a seller
          </Link>
        }
      />

      {loading ? (
        <div className="page-loading" role="status">
          <span className="spinner" />
          <p>Opening the marketplace…</p>
        </div>
      ) : error ? (
        <div className="empty-state glass" data-reveal>
          <span className="empty-icon" aria-hidden="true">
            <Store size={24} />
          </span>
          <h2>Shops could not be loaded</h2>
          <p>{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => void load()}>
            <RefreshCw size={15} />
            Try again
          </button>
        </div>
      ) : shops.length === 0 ? (
        <div className="empty-state glass" data-reveal>
          <span className="empty-icon" aria-hidden="true">
            <Store size={24} />
          </span>
          <h2>No shops are published yet</h2>
          <p>
            The marketplace is preparing its first approved shops. Check back
            soon, or apply to open your own.
          </p>
          <Link className="btn btn-primary" to="/become-a-seller">
            Apply to sell
            <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <>
          <div className="shops-summary-line" data-reveal>
            <span>
              {shops.length} approved {shops.length === 1 ? 'shop' : 'shops'}
            </span>
            <span>Independent sellers · Cash on delivery</span>
          </div>
          <div className="shop-grid shops-page-grid">
            {shops.map((shop, index) => (
              <ShopCard key={shop.id} shop={shop} index={index} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
