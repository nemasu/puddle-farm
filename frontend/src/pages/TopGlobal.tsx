import { CircularProgress } from "@mui/material";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { Suspense } from "react";
import { Link, useParams } from "react-router-dom";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Tag } from "./../components/Tag";
import { UpdateCountdown } from "../components/UpdateCountdown";
import type { RankingFetchResult } from "../hooks/useRanking";
import {
  useTopGlobalRanking,
  useTopGlobalRankingPromise,
} from "../hooks/useTopGlobalRanking";
import { ONE_DAY_MS } from "../utils/time";
import { Utils } from "../utils/Utils";

const TopGlobalTable = ({
  rankingPromise,
}: {
  rankingPromise: Promise<RankingFetchResult>;
}) => {
  const {
    ranking,
    lastUpdateMs,
    showNext,
    pageInput,
    setPageInput,
    onPrev,
    onNext,
    onGoToPage,
  } = useTopGlobalRanking(rankingPromise);

  return (
    <Box sx={{ m: 3 }}>
      {lastUpdateMs !== null && (
        <UpdateCountdown lastUpdateMs={lastUpdateMs} intervalMs={ONE_DAY_MS} />
      )}
      <Box sx={{ display: "inline-block", mb: 2 }}>
        <Button onClick={onPrev}>Prev</Button>
        <Button style={showNext ? {} : { display: "none" }} onClick={onNext}>
          Next
        </Button>
        <TextField
          size="small"
          label="Page"
          type="number"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onGoToPage()}
          sx={{ width: 80, mx: 1 }}
        />
        <Button onClick={onGoToPage}>Go</Button>
      </Box>
      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ px: 0, mx: 0 }}></TableCell>
              <TableCell>Player</TableCell>
              <TableCell>Char</TableCell>
              <TableCell>Rating</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {ranking.map((player) => (
              <TableRow key={`${player.id}-${player.char_short}`}>
                <TableCell sx={{ px: 0, mx: 0, textAlign: "center" }}>
                  {player.rank}
                </TableCell>
                <TableCell>
                  <Button
                    component={Link}
                    sx={{ justifyContent: "flex-start", minWidth: "auto" }}
                    to={`/player/${player.id}/${player.char_short}`}
                  >
                    {player.name}
                  </Button>
                  {player.tags?.map((e) => (
                    <Tag
                      key={e.tag}
                      style={e.style}
                      sx={{ fontSize: "0.9rem", position: "unset" }}
                    >
                      {e.tag}
                    </Tag>
                  ))}
                </TableCell>
                <TableCell>{player.char_short}</TableCell>
                <TableCell>
                  <Box
                    component={"span"}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {Utils.displayRankIcon(
                      player.rating,
                      "32px",
                      player.is_legend,
                    )}
                    <Box component={"span"} title={String(player.rating)}>
                      {Utils.displayRating(player.rating)}
                    </Box>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Box sx={{ display: "inline-block", mt: 2 }}>
        <Button onClick={onPrev}>Prev</Button>
        <Button style={showNext ? {} : { display: "none" }} onClick={onNext}>
          Next
        </Button>
        <TextField
          size="small"
          label="Page"
          type="number"
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onGoToPage()}
          sx={{ width: 80, mx: 1 }}
        />
        <Button onClick={onGoToPage}>Go</Button>
      </Box>
    </Box>
  );
};

const TopGlobalContent = () => {
  const { count, offset } = useParams();
  const rankingPromise = useTopGlobalRankingPromise();

  return (
    <ErrorBoundary resetKey={`${count}-${offset}`}>
      <Suspense
        fallback={
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress size={60} variant="indeterminate" />
          </Box>
        }
      >
        <TopGlobalTable rankingPromise={rankingPromise} />
      </Suspense>
    </ErrorBoundary>
  );
};

const TopGlobal = () => {
  return (
    <>
      <title>Top Players | Puddle Farm</title>
      <AppBar
        position="static"
        style={{ backgroundImage: "none" }}
        sx={{ backgroundColor: "secondary.main" }}
      >
        <Box
          sx={{
            minHeight: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography align="center" variant="pageHeader">
            Top Players
          </Typography>
        </Box>
      </AppBar>
      <TopGlobalContent />
    </>
  );
};

export default TopGlobal;
