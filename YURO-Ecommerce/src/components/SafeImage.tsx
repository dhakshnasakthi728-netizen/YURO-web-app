import { useEffect, useState } from 'react';

type SafeImageProps = {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
  sizes?: string;
  width?: number;
  height?: number;
};

/**
 * Renders remote imagery with a graceful branded fallback if the source fails.
 */
export function SafeImage({
  src,
  alt,
  className = '',
  eager = false,
  sizes,
  width,
  height,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  if (failed) {
    return (
      <span
        className={`media-fallback ${className}`}
        role="img"
        aria-label={`${alt} — image unavailable`}
      >
        <span className="fallback-mark" aria-hidden="true">
          YURO
        </span>
        <span className="fallback-caption" aria-hidden="true">
          Image unavailable
        </span>
      </span>
    );
  }

  return (
    <img
      className={`media-img ${loaded ? 'is-loaded' : ''} ${className}`}
      src={src}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      sizes={sizes}
      width={width}
      height={height}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}
