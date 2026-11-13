import { reduceMotionRequested } from './motion';

const HEADER_GAP = 18;

type ScrollOptions = {
  behavior?: ScrollBehavior;
};

function headerOffset() {
  const header = document.querySelector<HTMLElement>('.site-header');
  return (header?.getBoundingClientRect().bottom ?? 0) + HEADER_GAP;
}

/**
 * Scroll a page section into view below the sticky header.
 *
 * Using the header's measured height keeps the landing position correct when
 * the navigation grows into two rows on small screens.
 */
export function scrollToId(id: string, options: ScrollOptions = {}) {
  if (typeof document === 'undefined') return false;

  const target = document.getElementById(id);
  if (!target) return false;

  const sectionTopPadding = target.classList.contains('section')
    ? Number.parseFloat(getComputedStyle(target).paddingTop) || 0
    : 0;
  const top =
    target.getBoundingClientRect().top +
    window.scrollY +
    sectionTopPadding -
    headerOffset();

  window.scrollTo({
    top: Math.max(0, Math.round(top)),
    left: 0,
    behavior: options.behavior ?? (reduceMotionRequested() ? 'auto' : 'smooth'),
  });

  return true;
}

/**
 * Wait for an anchor to mount after a route change, then scroll to it.
 *
 * Home-page anchors do not exist until React has rendered the home route, so a
 * fixed timeout can land on the previous page. Waiting for the element removes
 * that race while still giving up quickly if navigation fails.
 */
export function scrollToIdWhenReady(
  id: string,
  options: ScrollOptions = {},
  timeout = 2000,
) {
  if (typeof window === 'undefined') return;

  const started = performance.now();
  let stableFrames = 0;

  const attempt = () => {
    if (document.getElementById(id)) {
      stableFrames += 1;
      if (stableFrames >= 2) {
        scrollToId(id, options);
        return;
      }
    } else if (performance.now() - started > timeout) {
      return;
    }

    window.requestAnimationFrame(attempt);
  };

  window.requestAnimationFrame(attempt);
}
