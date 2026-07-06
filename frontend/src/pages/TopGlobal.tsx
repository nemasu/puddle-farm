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
import type React from "react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Tag } from "./../components/Tag";
import { JSONParse } from "../utils/JSONParse";
import { Utils } from "../utils/Utils";

const TopGlobal = () => {
  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

  const defaultCount = 100;

  const navigate = useNavigate();

  interface Player {
    rank: number;
    id: string;
    name: string;
    char_short: string;
    rating: number;
    tags?: { style: React.CSSProperties; tag: string }[];
    is_legend: boolean;
  }

  const [ranking, setRanking] = useState<Player[]>([]);
  const [nextUpdateIn, setNextUpdateIn] = useState<number | null>(null);

  const formatCountdown = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  useEffect(() => {
    const id = setInterval(() => {
      setNextUpdateIn((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const [showNext, setShowNext] = useState(true);

  const { count, offset } = useParams();

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState("");

  useEffect(() => {
    document.title = "Top Players | Puddle Farm";
    window.scrollTo(0, 0);

    const currentPage =
      Math.floor(
        (offset ? parseInt(offset, 10) : 0) /
          (count ? parseInt(count, 10) : defaultCount),
      ) + 1;
    setPageInput(String(currentPage));

    const fetchRanking = async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const url =
          API_ENDPOINT +
          "/top?" +
          "count=" +
          (count ? count : defaultCount) +
          "&offset=" +
          (offset ? offset : 0);
        const response = await fetch(url);

        if (response.status === 404) {
          navigate(`/`);
          return;
        }

        if (!response.ok) {
          const text = await response.text();
          setErrorMessage(text || `Error ${response.status}`);
          setLoading(false);
          return;
        }

        const _result = await response.text().then((body) => {
          const parsed = JSONParse(body);

          for (const key in parsed.ranks) {
            if (parsed.ranks[key].tags) {
              for (const s in parsed.ranks[key].tags) {
                parsed.ranks[key].tags[s].style = JSON.parse(
                  parsed.ranks[key].tags[s].style,
                );
              }
            }
          }

          if (
            parsed.ranks.length < (count ? count : defaultCount) ||
            parsed.ranks.length === 1000
          ) {
            setShowNext(false);
          } else {
            setShowNext(true);
          }

          setRanking(parsed.ranks);

          if (parsed.last_update) {
            const lastUpdate = new Date(`${parsed.last_update}Z`);
            const secondsLeft = Math.floor(
              (lastUpdate.getTime() + 86400_000 - Date.now()) / 1000,
            );
            setNextUpdateIn(secondsLeft);
          }

          return parsed;
        });

        setLoading(false);
      } catch (error) {
        console.error("Error fetching player data:", error);
        setErrorMessage("Could not connect to the API.");
        setLoading(false);
      }
    };

    fetchRanking();
  }, [count, offset, navigate]);

  function onPrev(_event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    let nav_count = count ? parseInt(count, 10) : defaultCount;
    let nav_offset = offset ? parseInt(offset, 10) - nav_count : 0;
    if (nav_count < 0) {
      nav_count = defaultCount;
    }
    if (nav_offset < 0) {
      nav_offset = 0;
    }
    navigate(`/top_global/${nav_count}/${nav_offset}`);
  }

  function onNext(_event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    const nav_count = count ? parseInt(count, 10) : defaultCount;
    const nav_offset = offset ? parseInt(offset, 10) + nav_count : nav_count;
    navigate(`/top_global/${nav_count}/${nav_offset}`);
  }

  function onGoToPage() {
    const page = parseInt(pageInput, 10);
    if (!Number.isNaN(page) && page > 0) {
      const nav_count = count ? parseInt(count, 10) : defaultCount;
      navigate(`/top_global/${nav_count}/${(page - 1) * nav_count}`);
    }
  }

  return (
    <>
      <AppBar
        position="static"
        style={{ backgroundImage: "none" }}
        sx={{ backgroundColor: "secondary.main" }}
      >
        {loading ? (
          <CircularProgress
            size={60}
            variant="indeterminate"
            disableShrink={true}
            sx={{ position: "absolute", top: "-1px", color: "white" }}
          />
        ) : null}
        <Box sx={{ minHeight: 100, paddingTop: "30px" }}>
          <Typography align="center" variant="pageHeader">
            Top Players
          </Typography>
        </Box>
      </AppBar>
      <Box sx={{ m: 3 }}>
        {errorMessage && (
          <Typography color="error" align="center" sx={{ mb: 2 }}>
            {errorMessage}
          </Typography>
        )}
        {nextUpdateIn !== null && (
          <Typography align="left" sx={{ mb: 1 }}>
            {nextUpdateIn > 0
              ? `Next update in: ${formatCountdown(nextUpdateIn)}`
              : "Updating..."}
          </Typography>
        )}
        <Box sx={{ display: "inline-block" }}>
          <Button onClick={(event) => onPrev(event)}>Prev</Button>
          <Button
            style={showNext ? {} : { display: "none" }}
            onClick={(event) => onNext(event)}
          >
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
        <Box sx={{ display: "inline-block" }}>
          <Button onClick={(event) => onPrev(event)}>Prev</Button>
          <Button
            style={showNext ? {} : { display: "none" }}
            onClick={(event) => onNext(event)}
          >
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
    </>
  );
};

export default TopGlobal;
