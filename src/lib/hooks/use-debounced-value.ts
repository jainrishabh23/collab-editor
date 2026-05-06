import { useEffect, useState } from "react";

/**
 * Returns a value that updates only after `delay` ms of no changes.
 * Useful for auto-save: the underlying value changes on every keystroke,
 * but the debounced value only updates when the user pauses.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}