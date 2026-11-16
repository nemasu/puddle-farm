"use client";

import Button, { type ButtonProps } from "@mui/material/Button";
import { AppLink as Link } from "../AppLink";

// Next's Link must be composed with MUI inside the client library boundary.
// The calling Server Component renders the link content and table rows.
export function LinkButton(
  props: Omit<ButtonProps<typeof Link>, "component" | "href" | "prefetch"> & {
    href: string;
  },
) {
  return <Button component={Link} prefetch={false} {...props} />;
}
