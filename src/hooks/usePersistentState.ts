import { useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

/**
 * useState backed by localStorage. Keeps the previous value when the stored
 * payload is corrupted and never throws in private/incognito contexts.
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch {
      // Ignore unreadable storage and fall back to the provided default.
    }
    return initialValue;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be full or disabled; persistence is a progressive enhancement.
    }
  }, [key, value]);

  return [value, setValue];
}
