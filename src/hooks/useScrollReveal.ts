import { useLayoutEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const REVEAL_EASING = 'cubic-bezier(0.16, 1, 0.3, 1)';

function revealDelay(element: HTMLElement): number {
  const raw = getComputedStyle(element).getPropertyValue('--reveal-delay').trim();
  if (!raw) return 0;
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 320);
}

/**
 * Reveals marked elements as they enter the viewport.
 *
 * The observer class is only added after JavaScript runs, so content remains
 * fully visible if scripting, IntersectionObserver or motion is unavailable.
 */
export function useScrollReveal<T extends HTMLElement>(
  dependencies: unknown[],
) {
  const rootRef = useRef<T>(null);
  const { motionEnabled } = useTheme();
  const motionWasEnabled = useRef(motionEnabled);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const allTargets = Array.from(
      root.querySelectorAll<HTMLElement>('[data-reveal]'),
    );
    if (allTargets.length === 0) {
      motionWasEnabled.current = motionEnabled;
      return;
    }

    if (!motionEnabled) {
      root.classList.remove('reveal-enabled');
      allTargets.forEach((element) => element.classList.add('is-revealed'));
      motionWasEnabled.current = false;
      return;
    }

    // If motion was just enabled from the appearance panel, re-arm only the
    // targets below the current viewport so scrolling immediately shows the
    // reveal without hiding content the visitor is already reading.
    if (!motionWasEnabled.current) {
      allTargets.forEach((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.top >= window.innerHeight || rect.bottom <= 0) {
          element.classList.remove('is-revealed');
        }
      });
    }
    motionWasEnabled.current = true;

    const elements = allTargets.filter(
      (element) => !element.classList.contains('is-revealed'),
    );
    if (elements.length === 0) return;

    const supportsObservation = typeof IntersectionObserver !== 'undefined';

    const reveal = (element: HTMLElement) => {
      const delay = revealDelay(element);
      element.classList.add('is-revealed');

      if (typeof element.animate !== 'function') return;

      try {
        element.animate(
          [
            { opacity: 0, transform: 'translate3d(0, 28px, 0)' },
            { opacity: 1, transform: 'translate3d(0, 0, 0)' },
          ],
          {
            duration: 920,
            delay,
            easing: REVEAL_EASING,
            fill: 'backwards',
          },
        );
      } catch {
        // The class already exposes the content if the animation cannot run.
      }
    };

    if (!supportsObservation) {
      elements.forEach((element) => element.classList.add('is-revealed'));
      return;
    }

    root.classList.add('reveal-enabled');

    let observer: IntersectionObserver;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            observer.unobserve(entry.target);
            reveal(entry.target as HTMLElement);
          });
        },
        {
          threshold: 0.12,
          rootMargin: '0px 0px -6% 0px',
        },
      );
    } catch {
      root.classList.remove('reveal-enabled');
      elements.forEach((element) => element.classList.add('is-revealed'));
      return;
    }

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [...dependencies, motionEnabled]);

  return rootRef;
}
