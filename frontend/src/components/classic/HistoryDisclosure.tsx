"use client";

import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import {
  Box,
  Collapse,
  IconButton,
  Paper,
  TableCell,
  TableRow,
} from "@mui/material";
import { type ReactNode, useState } from "react";

export function HistoryDisclosure({
  summary,
  children,
  card = false,
}: {
  summary: ReactNode;
  children: ReactNode;
  card?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const toggle = (
    <IconButton
      aria-label="expand row"
      aria-expanded={open}
      size="small"
      onClick={() => setOpen(!open)}
    >
      {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
    </IconButton>
  );
  const detail = (
    <>
      <Collapse in={open} timeout="auto" unmountOnExit>
        {children}
      </Collapse>
      <noscript>
        <details>
          <summary>Match details</summary>
          {children}
        </details>
      </noscript>
    </>
  );
  return card ? (
    <Box component={Paper} sx={{ p: 1, my: 0.5 }}>
      {toggle}
      {summary}
      {detail}
    </Box>
  ) : (
    <>
      <TableRow>
        <TableCell>{toggle}</TableCell>
        {summary}
      </TableRow>
      <TableRow>
        <TableCell sx={{ py: 0 }} colSpan={8}>
          {detail}
        </TableCell>
      </TableRow>
    </>
  );
}
