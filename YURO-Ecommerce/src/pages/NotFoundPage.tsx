import { Link } from 'react-router-dom';
import { ArrowRight, Compass, ShoppingBag } from 'lucide-react';

export function NotFoundPage() {
  return (
    <section className="page-section shell">
      <div className="empty-state not-found-state">
        <span className="empty-icon" aria-hidden="true">
          <Compass size={26} />
        </span>
        <p className="eyebrow">404 · Off the map</p>
        <h1>Page not found</h1>
        <p>
          This address is not part of the YURO marketplace. It may have moved,
          or the link may be incomplete.
        </p>
        <div className="empty-actions">
          <Link className="btn btn-primary" to="/shop">
            <ShoppingBag size={16} />
            Browse the shop
            <ArrowRight size={15} />
          </Link>
          <Link className="btn btn-ghost" to="/">
            Return home
          </Link>
        </div>
      </div>
    </section>
  );
}
