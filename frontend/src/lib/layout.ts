import type { NextPage } from "next";
import type { ReactElement, ReactNode } from "react";

/**
 * Pages can define `getLayout` so the layout (e.g. the app sidebar) stays
 * mounted while navigating between pages that share it.
 */
export type PageWithLayout<P = object> = NextPage<P> & {
  getLayout?: (page: ReactElement) => ReactNode;
};
