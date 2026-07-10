"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  // Always start at `false` (matching the server-rendered default) to avoid a
  // hydration mismatch — the real value is only knowable client-side, so it's
  // applied post-mount in the effect below.
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional post-hydration sync to avoid SSR/client mismatch
    setMatches(mql.matches);
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  }, [query]);

  return matches;
}

export function useIsMobile() {
  return useMediaQuery("(max-width: 768px)");
}

export function useIsTablet() {
  return useMediaQuery("(max-width: 1024px)");
}
