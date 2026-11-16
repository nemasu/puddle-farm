"use client";

import TableSortLabel from "@mui/material/TableSortLabel";
import type { ReactNode } from "react";
import { AppLink as Link } from "../AppLink";

export function SortLink({
  href,
  active,
  direction,
  children,
}: {
  href: string;
  active: boolean;
  direction: "asc" | "desc";
  children: ReactNode;
}) {
  return (
    <TableSortLabel
      component={Link}
      href={href}
      prefetch={false}
      scroll={false}
      active={active}
      direction={direction}
    >
      {children}
    </TableSortLabel>
  );
}
