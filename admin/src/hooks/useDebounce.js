import { useState, useEffect, useRef } from 'react';

/**
 * Returns a debounced version of `value` after `delay` ms.
 */
export function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer.current);
  }, [value, delay]);

  return debounced;
}
