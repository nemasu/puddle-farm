import { Box, Tooltip, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import type {
  ActivityChartProps,
  Last100GamesProps,
  SingleActivityDotProps,
} from "../interfaces/Player";
import { API_ENDPOINT } from "../utils/playerApi";

// Greatly inspired by https://codepen.io/ire/pen/Legmwo/
const ActivityChart = ({ player_id, char_short }: ActivityChartProps) => {
  const [history, setHistory] = useState<Last100GamesProps[]>([]);
  const gap = 3;

  const today = new Date();
  const todayUTC = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const displayedPreviousWeeks = 14;
  const allFullColumns = 7 * displayedPreviousWeeks;

  const earliestDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - (today.getDay() + 7 * displayedPreviousWeeks),
  );
  const earliestDateUTC = Date.UTC(
    earliestDate.getFullYear(),
    earliestDate.getMonth(),
    earliestDate.getDate(),
  );

  const isSameDate = (date1: Date, date2: Date) =>
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate();

  /** Formats a date as a YYYY-MM-DD date string. */
  const formatDateForApi = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    setHistory([]);

    const fetchLast100Games = async () => {
        const lastGamesResponse = await fetch(
            `${API_ENDPOINT}/player/${player_id}/${char_short}/history?from=${formatDateForApi(earliestDate)}&to=${formatDateForApi(today)}&count=2000`,
        );

      if (lastGamesResponse.status === 200) {
        const lastGamesResult = (await lastGamesResponse.json()) as {
          history?: Array<{
            result_win: boolean;
            timestamp: string;
          }>;
        };

        const convertedHistory = (lastGamesResult.history ?? []).map(
          (game) => ({
            result_win: game.result_win,
            timestamp: new Date(game.timestamp),
          }),
        );

        setHistory(convertedHistory);
      }
    };

    fetchLast100Games();
  }, [player_id, char_short, earliestDateUTC, todayUTC]);

  return (
    <>
      <Typography sx={{ fontSize: 14 }}>Recent activity:</Typography>
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "start",
        }}
      >
        <Box
          sx={{
            fontSize: 10,
            display: "grid",
            gridTemplateRows: `repeat(7, 10px)`,
            rowGap: `${gap}px`,
            paddingRight: `10px`,
          }}
        >
          <Typography sx={{ fontSize: 10, visibility: "hidden" }}>
            Sun
          </Typography>
          <Typography sx={{ fontSize: 10 }}>Mon</Typography>
          <Typography sx={{ fontSize: 10, visibility: "hidden" }}>
            Tue
          </Typography>
          <Typography sx={{ fontSize: 10 }}>Wed</Typography>
          <Typography sx={{ fontSize: 10, visibility: "hidden" }}>
            Thu
          </Typography>
          <Typography sx={{ fontSize: 10 }}>Fri</Typography>
          <Typography sx={{ fontSize: 10, visibility: "hidden" }}>
            Sat
          </Typography>
        </Box>
        <Box
          sx={{
            display: "grid",
            gridTemplateRows: `repeat(7, 10px)`,
            columnGap: `${gap}px`,
            rowGap: `${gap}px`,
            marginTop: 1,
            gridAutoFlow: "column",
          }}
        >
          {Array.from({ length: allFullColumns }).map((_, idx) => {
            const dayDate = new Date();
            dayDate.setDate(
              today.getDate() - (today.getDay() - (idx - allFullColumns)),
            );

            return (
              <SingleActivityDot
                key={dayDate.toISOString()}
                visible={true}
                date={dayDate}
                games={history.filter((game) =>
                  isSameDate(dayDate, game.timestamp),
                )}
              />
            );
          })}
        </Box>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            rowGap: `${gap}px`,
            marginLeft: `${gap}px`,
            marginTop: 1,
          }}
        >
          {Array.from({ length: today.getDay() + 1 }).map((_, idx) => {
            const dayDate = new Date();
            dayDate.setDate(today.getDate() - (today.getDay() - idx));

            return (
              <SingleActivityDot
                key={dayDate.toISOString()}
                visible={true}
                date={dayDate}
                games={history.filter((game) =>
                  isSameDate(dayDate, game.timestamp),
                )}
              />
            );
          })}
          {Array.from({ length: 6 - today.getDay() }).map((_, idx) => {
            const futureDate = new Date(today);
            futureDate.setDate(today.getDate() + idx + 1);

            return (
              <SingleActivityDot
                key={futureDate.toISOString()}
                visible={false}
                date={futureDate}
                games={[]}
              />
            );
          })}
        </Box>
      </Box>

      <hr style={{ marginTop: 10 }} />
    </>
  );
};

const SingleActivityDot = ({
  visible,
  date,
  games,
}: SingleActivityDotProps) => {
  const [winrate, setWinrate] = useState<number>(-1);
  const TIERS = [
    { label: "S", color: "#087F23", minWR: 65 },
    { label: "A", color: "#A8E6A3", minWR: 55 },
    { label: "C", color: "#A0BFF0", minWR: 45 },
    { label: "C", color: "#FF8A80", minWR: 35 },
    { label: "D", color: "#D32F2F", minWR: 0 },
    { label: "E", color: "#3d4345", minWR: -0.5 },
  ];

  useEffect(() => {
    if (games.length > 0) {
      setWinrate(
        (games.filter((game) => game.result_win).length / games.length) * 100,
      );
    } else {
      setWinrate(-0.5); // negative winrate -> no games played
    }
  }, [games]);

  return (
    <Tooltip
      title={
        winrate >= 0
          ? `${date.toDateString()} - ${games.length} games, ${winrate.toFixed(2)}% WR`
          : `${date.toDateString()} - No games played`
      }
    >
      <Box
        sx={{
          bgcolor:
            TIERS.find((tier) => tier.minWR <= winrate)?.color || "#3d4345",
          width: "10px",
          height: "10px",
          borderRadius: "2px",
          visibility: visible ? "visible" : "hidden",
        }}
      />
    </Tooltip>
  );
};

export default ActivityChart;
