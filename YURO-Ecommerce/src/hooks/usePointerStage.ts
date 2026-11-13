import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

type PointerVars = {
  x: number;
  y: number;
  rotateX: number;
  rotateY: number;
};

/**
 * Adds a restrained pointer-follow light and tilt to a hero stage.
 *
 * Values are written to CSS custom properties on the stage itself, so React
 * does not re-render while the pointer moves. Fine pointers and full motion
 * are required; touch devices and reduced-motion visitors keep the static hero.
 */
export function usePointerStage<T extends HTMLElement>() {
  const stageRef = useRef<T>(null);
  const { motionEnabled } = useTheme();

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !motionEnabled) return;

    if (
      typeof window.matchMedia !== 'function' ||
      !window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ) {
      return;
    }

    let frame = 0;
    let nextVars: PointerVars | null = null;

    const apply = () => {
      frame = 0;
      if (!nextVars) return;
      stage.style.setProperty('--stage-x', `${nextVars.x.toFixed(2)}%`);
      stage.style.setProperty('--stage-y', `${nextVars.y.toFixed(2)}%`);
      stage.style.setProperty('--stage-rx', `${nextVars.rotateX.toFixed(2)}deg`);
      stage.style.setProperty('--stage-ry', `${nextVars.rotateY.toFixed(2)}deg`);
    };

    const handleMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;

      nextVars = {
        x: Math.min(Math.max(x, 0), 1) * 100,
        y: Math.min(Math.max(y, 0), 1) * 100,
        rotateX: Math.min(Math.max(0.5 - y, -0.5), 0.5) * 3.2,
        rotateY: Math.min(Math.max(x - 0.5, -0.5), 0.5) * 3.2,
      };

      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    const reset = () => {
      nextVars = null;
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      stage.style.setProperty('--stage-x', '50%');
      stage.style.setProperty('--stage-y', '50%');
      stage.style.setProperty('--stage-rx', '0deg');
      stage.style.setProperty('--stage-ry', '0deg');
    };

    stage.style.setProperty('--stage-x', '50%');
    stage.style.setProperty('--stage-y', '50%');
    stage.addEventListener('pointermove', handleMove, { passive: true });
    stage.addEventListener('pointerleave', reset, { passive: true });

    return () => {
      stage.removeEventListener('pointermove', handleMove);
      stage.removeEventListener('pointerleave', reset);
      reset();
    };
  }, [motionEnabled]);

  return stageRef;
}
