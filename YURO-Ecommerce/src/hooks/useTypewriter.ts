import { useEffect, useState } from 'react';

type Phase = 'idle' | 'typing' | 'holding' | 'deleting';

const TYPE_MS = 82;
const DELETE_MS = 42;
const HOLD_MS = 2400;
const NEXT_PHRASE_MS = 460;

/**
 * Types and retypes a small set of phrases.
 *
 * When motion is disabled the first phrase is shown as static text so the
 * sentence stays complete and no timers run in the background.
 */
export function useTypewriter(phrases: readonly string[], enabled: boolean) {
  const fallback = phrases[0] ?? '';
  const [text, setText] = useState(() => (enabled ? '' : fallback));
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(enabled ? 'typing' : 'idle');

  useEffect(() => {
    if (phrases.length === 0) {
      setText('');
      return;
    }

    if (!enabled) {
      setText(fallback);
      setPhraseIndex(0);
      setPhase('idle');
      return;
    }

    if (phase === 'idle') {
      setText('');
      setPhraseIndex(0);
      setPhase('typing');
      return;
    }

    const current = phrases[phraseIndex] ?? fallback;
    let timer: number | undefined;

    if (phase === 'typing') {
      if (text.length < current.length) {
        timer = window.setTimeout(() => {
          setText(current.slice(0, text.length + 1));
        }, TYPE_MS);
      } else {
        setPhase('holding');
      }
    } else if (phase === 'holding') {
      timer = window.setTimeout(() => setPhase('deleting'), HOLD_MS);
    } else if (phase === 'deleting') {
      if (text.length > 0) {
        timer = window.setTimeout(() => {
          setText(current.slice(0, text.length - 1));
        }, DELETE_MS);
      } else {
        timer = window.setTimeout(() => {
          setPhraseIndex((index) => (index + 1) % phrases.length);
          setPhase('typing');
        }, NEXT_PHRASE_MS);
      }
    }

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [enabled, fallback, phase, phraseIndex, phrases, text]);

  return text;
}
