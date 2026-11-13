import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ThemeAccent = 'sage' | 'champagne' | 'terracotta' | 'blue';
export type MotionPreference = 'system' | 'full';

type ThemeContextValue = {
  mode: ThemeMode;
  accent: ThemeAccent;
  resolvedTheme: 'light' | 'dark';
  motion: MotionPreference;
  motionEnabled: boolean;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: ThemeAccent) => void;
  setMotion: (motion: MotionPreference) => void;
};

const STORAGE_KEY = 'yuro.theme.v2';
const ThemeContext = createContext<ThemeContextValue | null>(null);

function prefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function systemPrefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function resolveMotionEnabled(motion: MotionPreference): boolean {
  return motion === 'full' || !systemPrefersReducedMotion();
}

function applyMotionDataset(enabled: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.motion = enabled ? 'full' : 'reduced';
}

function readStored(): {
  mode: ThemeMode;
  accent: ThemeAccent;
  motion: MotionPreference;
} {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (!value) throw new Error('missing');
    const parsed = JSON.parse(value) as {
      mode?: unknown;
      accent?: unknown;
      motion?: unknown;
    };
    const mode = ['light', 'dark', 'system'].includes(String(parsed.mode))
      ? (parsed.mode as ThemeMode)
      : 'system';
    const accent = ['sage', 'champagne', 'terracotta', 'blue'].includes(
      String(parsed.accent),
    )
      ? (parsed.accent as ThemeAccent)
      : 'sage';
    const motion = ['system', 'full'].includes(String(parsed.motion))
      ? (parsed.motion as MotionPreference)
      : 'system';
    return { mode, accent, motion };
  } catch {
    return { mode: 'system', accent: 'sage', motion: 'system' };
  }
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') return prefersDark() ? 'dark' : 'light';
  return mode;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    const stored = readStored();
    const enabled = resolveMotionEnabled(stored.motion);
    // Resolve before paint so the CSS reduced-motion layer knows whether the
    // visitor explicitly opted into full motion.
    applyMotionDataset(enabled);
    return { ...stored, enabled };
  });
  const [mode, setModeState] = useState<ThemeMode>(initial.mode);
  const [accent, setAccentState] = useState<ThemeAccent>(initial.accent);
  const [motion, setMotionState] = useState<MotionPreference>(initial.motion);
  const [motionEnabled, setMotionEnabled] = useState(initial.enabled);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    resolveTheme(initial.mode),
  );

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = resolveTheme(mode);
      setResolvedTheme(resolved);
      document.documentElement.dataset.theme = resolved;
      document.documentElement.style.colorScheme = resolved;
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute(
          'content',
          resolved === 'dark' ? '#171814' : '#f3efe7',
        );
      }
    };

    apply();
    if (mode !== 'system') return;

    const onChange = () => apply();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [mode]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      const enabled = motion === 'full' || !media.matches;
      setMotionEnabled(enabled);
      applyMotionDataset(enabled);
    };

    apply();
    if (motion === 'full') return;

    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [motion]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ mode, accent, motion }),
      );
    } catch {
      // Preference persistence is optional.
    }
  }, [mode, accent, motion]);

  const setMode = useCallback((next: ThemeMode) => setModeState(next), []);
  const setAccent = useCallback(
    (next: ThemeAccent) => setAccentState(next),
    [],
  );
  const setMotion = useCallback(
    (next: MotionPreference) => setMotionState(next),
    [],
  );

  const value = useMemo(
    () => ({
      mode,
      accent,
      resolvedTheme,
      motion,
      motionEnabled,
      setMode,
      setAccent,
      setMotion,
    }),
    [
      mode,
      accent,
      resolvedTheme,
      motion,
      motionEnabled,
      setMode,
      setAccent,
      setMotion,
    ],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside ThemeProvider');
  return context;
}
