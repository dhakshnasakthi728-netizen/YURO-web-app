import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';

type BrandProps = {
  href?: string;
  compact?: boolean;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
};

export function Brand({
  href,
  compact = false,
  className: classNameProp = '',
  style,
  onClick,
}: BrandProps) {
  const content = (
    <>
      <span className="brand-mark" aria-hidden="true">
        Y
      </span>
      <span className="brand-word" aria-hidden="true">
        YUR<span className="brand-o">O</span>
      </span>
      <span className="brand-dot" aria-hidden="true" />
    </>
  );

  const className = ['brand', compact ? 'brand-compact' : '', classNameProp]
    .filter(Boolean)
    .join(' ');

  if (href) {
    if (href.startsWith('#')) {
      return (
        <a
          className={className}
          style={style}
          href={href}
          aria-label="YURO home"
          onClick={onClick}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        className={className}
        style={style}
        to={href}
        aria-label="YURO home"
        onClick={onClick}
      >
        {content}
      </Link>
    );
  }

  return (
    <span className={className} style={style} role="img" aria-label="YURO">
      {content}
    </span>
  );
}
