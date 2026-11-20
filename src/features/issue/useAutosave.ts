import { useCallback, useEffect, useRef } from 'react';

/**
 * Collects fast changes and saves the last value shortly after the user stops typing.
 * `flush` saves at once; it also runs when the component goes away, so nothing typed is lost
 * when the panel is closed.
 */
export function useAutosave<T>(save: (value: T) => void, delayMs = 800) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ value: T } | null>(null);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const waiting = pending.current;
    if (waiting) {
      pending.current = null;
      saveRef.current(waiting.value);
    }
  }, []);

  const schedule = useCallback(
    (value: T) => {
      pending.current = { value };
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, delayMs);
    },
    [flush, delayMs],
  );

  useEffect(() => flush, [flush]);

  return { schedule, flush };
}
