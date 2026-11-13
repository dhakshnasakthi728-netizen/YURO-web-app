import { useEffect, useRef, useState } from 'react';
import { Check, Monitor, Moon, Palette, Sparkles, Sun } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import type {
  MotionPreference,
  ThemeAccent,
  ThemeMode,
} from '../contexts/ThemeContext';

const modes: Array<{ id: ThemeMode; label: string; icon: typeof Sun }> = [
  { id: 'light', label: 'Light', icon: Sun },
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'system', label: 'System', icon: Monitor },
];

const accents: Array<{ id: ThemeAccent; label: string }> = [
  { id: 'sage', label: 'Sage' },
  { id: 'champagne', label: 'Champagne' },
  { id: 'terracotta', label: 'Terracotta' },
  { id: 'blue', label: 'Muted blue' },
];

const motionOptions: Array<{
  id: MotionPreference;
  label: string;
  icon: typeof Sun;
}> = [
  { id: 'system', label: 'System', icon: Monitor },
  { id: 'full', label: 'Full', icon: Sparkles },
];

export function ThemeMenu() {
  const { mode, accent, motion, motionEnabled, setMode, setAccent, setMotion } =
    useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        containerRef.current?.querySelector('button')?.focus();
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="theme-menu" ref={containerRef}>
      <button
        type="button"
        className="icon-button header-icon-button"
        aria-label="Appearance settings"
        aria-expanded={open}
        aria-controls="theme-panel"
        onClick={() => setOpen((current) => !current)}
      >
        <Palette size={18} />
      </button>

      {open && (
        <div
          className="theme-panel"
          id="theme-panel"
          role="dialog"
          aria-label="Appearance settings"
        >
          <div className="theme-panel-head">
            <span>Appearance</span>
            <small>Applies across YURO</small>
          </div>

          <div className="theme-section">
            <p className="theme-label">Mode</p>
            <div className="theme-mode-grid">
              {modes.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`theme-mode${mode === item.id ? ' is-active' : ''}`}
                    aria-pressed={mode === item.id}
                    onClick={() => setMode(item.id)}
                  >
                    <Icon size={15} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="theme-section">
            <p className="theme-label">Accent</p>
            <div className="accent-grid">
              {accents.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`accent-swatch${accent === item.id ? ' is-active' : ''}`}
                  aria-pressed={accent === item.id}
                  onClick={() => setAccent(item.id)}
                >
                  <span className={`swatch-dot accent-${item.id}`} aria-hidden="true">
                    {accent === item.id && <Check size={12} />}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="theme-section">
            <p className="theme-label">Motion</p>
            <div className="theme-mode-grid theme-motion-grid">
              {motionOptions.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`theme-mode${motion === item.id ? ' is-active' : ''}`}
                    aria-pressed={motion === item.id}
                    onClick={() => setMotion(item.id)}
                  >
                    <Icon size={15} />
                    {item.label}
                  </button>
                );
              })}
            </div>
            <p className="theme-note">
              {motion === 'full'
                ? 'Full motion is on. System setting is overridden.'
                : motionEnabled
                  ? 'Following system. Motion is on.'
                  : 'System animations are off. Choose Full to enable motion.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
