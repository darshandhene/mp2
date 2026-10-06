import { useCallback, useEffect, useRef } from "react";

const PREFIX = "everyday-table:position:";

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveBrowsePosition(key: string, scrollY: number): void {
  if (!Number.isFinite(scrollY) || scrollY < 0) return;
  try {
    storage()?.setItem(PREFIX + key, String(Math.round(scrollY)));
  } catch {
    // Storage can be full or blocked; losing the position must not block navigation.
  }
}

export function readBrowsePosition(key: string): number | null {
  let raw: string | null = null;
  try {
    raw = storage()?.getItem(PREFIX + key) ?? null;
  } catch {
    return null;
  }
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : null;
}

export function clearBrowsePosition(key: string): void {
  try {
    storage()?.removeItem(PREFIX + key);
  } catch {
    // Ignore unavailable storage.
  }
}

/**
 * Remembers the scroll offset for one collection URL and restores it once results render.
 * `key` must be the canonical collection URL, so a changed query, filter, sort, or page
 * never receives another collection's offset.
 */
export function useBrowsePosition(key: string, ready: boolean): { remember: () => void } {
  const restoredKey = useRef<string | null>(null);

  useEffect(() => {
    if (!ready || restoredKey.current === key) return;
    restoredKey.current = key;
    const saved = readBrowsePosition(key);
    if (saved === null) return;
    clearBrowsePosition(key);
    window.scrollTo(0, saved);
  }, [key, ready]);

  const remember = useCallback(() => saveBrowsePosition(key, window.scrollY), [key]);
  return { remember };
}
