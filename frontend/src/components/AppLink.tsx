"use client";

import NextLink from "next/link";
import { type ComponentProps, forwardRef } from "react";

// Fetch destinations on click unless a caller explicitly opts into prefetching.
export const AppLink = forwardRef<
  HTMLAnchorElement,
  ComponentProps<typeof NextLink>
>(function AppLink(props, ref) {
  return <NextLink ref={ref} prefetch={false} {...props} />;
});
