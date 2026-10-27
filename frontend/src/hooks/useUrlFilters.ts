import { useRouter } from "next/router";
import { useCallback } from "react";

import { queryParam } from "@/lib/format";

/**
 * Keeps list filters in the URL query string so they survive refreshes,
 * can be bookmarked, and work with the browser's back button.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const router = useRouter();

  const values = {} as Record<K, string>;
  for (const key of keys) values[key] = queryParam(router.query[key]);

  const update = useCallback(
    (changes: Partial<Record<K | "offset", string | number | null>>) => {
      const next: Record<string, string> = {};
      for (const [key, value] of Object.entries({ ...router.query })) {
        const v = queryParam(value as string | string[] | undefined);
        if (v) next[key] = v;
      }
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "" || value === undefined) delete next[key];
        else next[key] = String(value);
      }
      // Any filter change other than paging resets to the first page.
      if (!("offset" in changes)) delete next.offset;
      void router.replace({ pathname: router.pathname, query: next }, undefined, { shallow: true, scroll: false });
    },
    [router],
  );

  const offset = Math.max(0, Number.parseInt(queryParam(router.query.offset), 10) || 0);
  return { values, update, offset, ready: router.isReady };
}
