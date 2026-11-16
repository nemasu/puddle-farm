import { Box, Button, TextField } from "@mui/material";
import { getClassicMessages } from "../../lib/i18n/classic";
import { type Pagination, rankingPath } from "../../lib/pagination";
import { computePageInput, computePrevPage } from "../../lib/rankings";
import { getRequestPresentation } from "../../lib/server/site-preferences";
import { LinkButton } from "./LinkButton";

export async function RankingPagination({
  base,
  pagination,
  showNext,
  position,
}: {
  base: string;
  pagination: Pagination;
  showNext: boolean;
  position: "top" | "bottom";
}) {
  const { language } = await getRequestPresentation();
  const messages = getClassicMessages(language);
  const { count, offset } = pagination;
  return (
    <Box
      component="nav"
      aria-label={
        language === "ja"
          ? position === "top"
            ? messages.ladder.topPagination
            : messages.ladder.bottomPagination
          : `${position} pagination`
      }
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 0.5,
        my: 2,
      }}
    >
      <LinkButton href={rankingPath(base, computePrevPage(count, offset))}>
        {messages.ladder.prev}
      </LinkButton>
      {showNext && Number.isSafeInteger(offset + count) && (
        <LinkButton href={rankingPath(base, { count, offset: offset + count })}>
          {messages.ladder.next}
        </LinkButton>
      )}
      <Box
        component="form"
        action={`${rankingPath(base, pagination)}`}
        method="get"
        sx={{ display: "inline-flex", alignItems: "center" }}
      >
        <TextField
          key={`${count}-${offset}`}
          id={`page-${position}`}
          name="page"
          label={messages.ladder.page}
          size="small"
          type="number"
          defaultValue={computePageInput(count, offset)}
          slotProps={{
            htmlInput: {
              min: 1,
              step: 1,
              required: true,
              "aria-label": `${messages.ladder.page} (${position})`,
            },
          }}
          sx={{ width: 80, mx: 1 }}
        />
        <Button type="submit">{messages.ladder.go}</Button>
      </Box>
    </Box>
  );
}
