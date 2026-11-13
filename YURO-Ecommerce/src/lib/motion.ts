/**
 * True when motion should be suppressed.
 *
 * The appearance panel can explicitly opt into full motion, even when the
 * operating system asks for reduced motion. In that case the resolved
 * preference is exposed on <html data-motion="full">.
 */
export function reduceMotionRequested(): boolean {
  if (typeof document !== 'undefined') {
    const override = document.documentElement.dataset.motion;
    if (override === 'full') return false;
    if (override === 'reduced') return true;
  }

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
