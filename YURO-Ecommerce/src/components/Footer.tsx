import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { scrollToId, scrollToIdWhenReady } from '../lib/scroll';
import { Brand } from './Brand';

const shopLinks = [
  { label: 'Shop all', href: '/shop' },
  { label: 'Apparel', href: '/shop?category=APPAREL' },
  { label: 'Home & living', href: '/shop?category=HOME' },
  { label: 'Accessories', href: '/shop?category=ACCESSORIES' },
  { label: 'Footwear', href: '/shop?category=FOOTWEAR' },
];

export function Footer() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const goToSection = (id: string) => {
    if (location.pathname !== '/') {
      navigate('/');
      scrollToIdWhenReady(id);
      return;
    }
    scrollToId(id);
  };

  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-top">
          <div className="footer-brand">
            <Brand href="/" />
            <p>
              A multi-vendor edit of considered objects for a quieter everyday.
              Independent shops, one clear standard.
            </p>
            <span className="footer-concept">Marketplace · 2026</span>
          </div>

          <nav className="footer-column" aria-label="Shop">
            <h2>Explore</h2>
            {shopLinks.map((link) => (
              <Link key={link.href} to={link.href}>
                {link.label}
              </Link>
            ))}
            <Link to="/shops">All shops</Link>
          </nav>

          <div className="footer-column">
            <h2>Studio</h2>
            <button type="button" onClick={() => goToSection('story')}>
              Our story
            </button>
            <Link to="/shop">The YURO edit</Link>
            <Link to="/shop?sort=newest">New arrivals</Link>
            <Link to="/wishlist">
              <Heart size={13} />
              Wishlist
            </Link>
          </div>

          <div className="footer-column">
            <h2>Marketplace</h2>
            <Link to="/orders">My orders</Link>
            <Link to="/cart">Shopping bag</Link>
            <Link to="/account">My account</Link>
            <Link to="/become-a-seller">Become a seller</Link>
            {user?.role === 'seller' && (
              <Link to="/seller">Seller dashboard</Link>
            )}
            {user?.role === 'admin' && <Link to="/admin">Administration</Link>}
            <Link to="/orders" className="footer-shop-link">
              Track an order
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2026 YURO</span>
          <span>Independent shops. Considered objects. Cash on delivery.</span>
          <span>A quieter way to shop.</span>
        </div>
      </div>
    </footer>
  );
}
