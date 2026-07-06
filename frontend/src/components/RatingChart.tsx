import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material";
import {
  type ChangeEvent,
  type ComponentType,
  useEffect,
  useState,
} from "react";
import type { RatingsResponse } from "../interfaces/API";
import type { LineChartData, RatingChartProps } from "../interfaces/Player";
import { Utils } from "../utils/Utils";

// biome-ignore lint/suspicious/noImplicitAnyLet: dynamic chart.js import assigned after module loads
let ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend;
import("chart.js").then((module) => {
  ChartJS = module.Chart;
  CategoryScale = module.CategoryScale;
  LinearScale = module.LinearScale;
  PointElement = module.PointElement;
  LineElement = module.LineElement;
  Title = module.Title;
  Tooltip = module.Tooltip;
  Legend = module.Legend;

  ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
  );
});

// biome-ignore lint/suspicious/noExplicitAny: dynamic react-chartjs-2 import, Line type unavailable at module level
let Line: ComponentType<any>;
import("react-chartjs-2").then((module) => {
  Line = module.Line;
});

const RatingChart = ({
  player_id,
  char_short,
  API_ENDPOINT,
  latest_rating,
  total_games,
}: RatingChartProps) => {
  const [lineChartData, setLineChartData] = useState<LineChartData | null>(
    null,
  );
  const [duration, setDuration] = useState<string>("100");
  const [customGames, setCustomGames] = useState<string>("");
  const [tempGames, setTempGames] = useState<string>("");
  const [openDialog, setOpenDialog] = useState(false);
  const [showPreVanquisher, setShowPreVanquisher] = useState(false);
  const [noPreVanquisherData, setNoPreVanquisherData] = useState(false);

  const isVanquisherPlayer = latest_rating > 10000000;

  const handleDurationChange = (event: SelectChangeEvent) => {
    setDuration(event.target.value);
  };

  const handleOpenDialog = () => {
    setTempGames(customGames);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleTempGamesChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTempGames(event.target.value);
  };

  const handleApplyCustomGames = () => {
    const games = parseInt(tempGames, 10);
    if (!Number.isNaN(games) && games > 0) {
      setCustomGames(tempGames);
      setDuration(tempGames);
      handleCloseDialog();
    }
  };

  useEffect(() => {
    setShowPreVanquisher(false);
  }, []);

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: showPreVanquisher
          ? "Pre-Vanquisher Rating History"
          : `Rating History (${duration} games)`,
      },
    },
    scales: {
      x: {
        ticks: {
          display: false,
        },
      },
    },
  };

  useEffect(() => {
    const fetchChartData = async () => {
      if (duration === undefined || duration === "") {
        return;
      }

      if (showPreVanquisher && total_games <= 0) {
        return;
      }

      setNoPreVanquisherData(false);

      const apiDuration = showPreVanquisher ? total_games : duration;
      const query = showPreVanquisher ? "?pre_vanquisher=true" : "";
      const rating_history_response = await fetch(
        API_ENDPOINT +
          "/ratings/" +
          player_id +
          "/" +
          char_short +
          "/" +
          apiDuration +
          query,
      );
      if (rating_history_response.status === 200) {
        const rating_history_result = await rating_history_response.json();

        if (rating_history_result !== null && char_short !== null) {
          rating_history_result.reverse();

          if (!showPreVanquisher) {
            //Add current rating to the end
            rating_history_result.push({
              timestamp: "Now",
              rating: latest_rating,
            });
          }

          const durationLimit = parseInt(duration, 10);
          const displayData: RatingsResponse[] = showPreVanquisher
            ? rating_history_result
                .filter((item: RatingsResponse) => item.rating <= 10000000)
                .slice(-durationLimit)
            : rating_history_result;

          if (showPreVanquisher && displayData.length === 0) {
            setNoPreVanquisherData(true);
            setLineChartData(null);
            return;
          }
          setNoPreVanquisherData(false);

          const hasVanquisher = displayData.some(
            (item: RatingsResponse) => item.rating > 10000000,
          );
          const hasNormal = displayData.some(
            (item: RatingsResponse) => item.rating <= 10000000,
          );

          const convertedRatings = displayData.map((item: RatingsResponse) =>
            Utils.convertRating(item.rating),
          );
          const minRating = Math.min(...convertedRatings);
          const maxRating = Math.max(...convertedRatings);

          const allThresholds = Utils.getRankThresholds();
          const maxRawRating = Math.max(
            ...displayData.map((item: RatingsResponse) => item.rating),
          );
          const currentRankIndex = allThresholds.findIndex(
            (t) => maxRawRating >= t.rating,
          );
          const rawNextRank =
            currentRankIndex > 0 ? allThresholds[currentRankIndex - 1] : null;

          // Diamond 3 promotes to Vanquisher at 45,000 RP, not at the 10,000,000 magic number.
          const VANQUISHER_PROMOTION_RP = 45000;
          const nextRankLine =
            rawNextRank === null
              ? null
              : rawNextRank.rating >= 10000000 && !hasVanquisher
                ? {
                    name: rawNextRank.name,
                    color: rawNextRank.color,
                    convertedRating: VANQUISHER_PROMOTION_RP,
                  }
                : {
                    name: rawNextRank.name,
                    color: rawNextRank.color,
                    convertedRating: Utils.convertRating(rawNextRank.rating),
                  };

          if (!showPreVanquisher) {
            // if the user has less than 100 games, select his total game number
            if (total_games < 100) {
              setDuration(total_games.toString());
            }

            // Clamp duration to total_games if not in available options (on character change for example)
            const items =
              total_games < 100
                ? [total_games]
                : [...Array(Math.floor(total_games / 100)).keys()]
                    .map((i) => (i + 1) * 100)
                    .concat(total_games % 100 === 0 ? [] : [total_games]);
            const currentDuration = parseInt(duration, 10);
            if (
              !items.includes(currentDuration) &&
              currentDuration !== parseInt(tempGames, 10)
            ) {
              // second check keep custom game count working
              setDuration(total_games.toString());
            }
          }

          const lineChartData = {
            labels: displayData.map((item: RatingsResponse) =>
              Utils.formatUTCToLocal(item.timestamp),
            ),
            datasets: [
              {
                label: "Rating",
                data: convertedRatings,
                borderColor: "rgb(75, 192, 192)",
                backgroundColor: "rgba(75, 192, 192, 0.2)",
                pointRadius: 3,
                borderWidth: 2,
              },
            ]
              .concat(
                allThresholds
                  .filter((rank) => {
                    if (rawNextRank && rank.rating === rawNextRank.rating)
                      return false;
                    const rankIsVanquisher = rank.rating > 10000000;
                    if (rankIsVanquisher && !hasVanquisher) return false;
                    if (!rankIsVanquisher && !hasNormal) return false;
                    const cr = Utils.convertRating(rank.rating);
                    return cr <= maxRating && cr >= minRating;
                  })
                  .map((rank) => ({
                    label: rank.name,
                    data: displayData.map(() =>
                      Utils.convertRating(rank.rating),
                    ),
                    borderColor: rank.color,
                    backgroundColor: rank.color,
                    pointRadius: 0,
                    borderWidth: 1,
                  })),
              )
              .concat(
                nextRankLine
                  ? [
                      {
                        label: nextRankLine.name,
                        data: displayData.map(
                          () => nextRankLine.convertedRating,
                        ),
                        borderColor: nextRankLine.color,
                        backgroundColor: nextRankLine.color,
                        pointRadius: 0,
                        borderWidth: 1,
                      },
                    ]
                  : [],
              ),
          };

          setLineChartData(lineChartData);
        }
      }
    };
    fetchChartData();
  }, [
    player_id,
    char_short,
    API_ENDPOINT,
    latest_rating,
    duration,
    showPreVanquisher,
    total_games,
    tempGames,
  ]);

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 5 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Game Count</InputLabel>
          <Select
            value={duration}
            label="Games"
            onChange={handleDurationChange}
          >
            {(total_games < 100
              ? [total_games]
              : [...Array(Math.floor(total_games / 100)).keys()]
                  .map((i) => (i + 1) * 100)
                  .concat(total_games % 100 === 0 ? [] : [total_games])
            ).map((nbGame) => (
              <MenuItem key={nbGame} value={nbGame}>
                {nbGame}
              </MenuItem>
            ))}
            <MenuItem value={customGames} onClick={handleOpenDialog}>
              Custom...
            </MenuItem>
          </Select>
        </FormControl>

        <Dialog
          open={openDialog}
          onClose={handleCloseDialog}
          disableScrollLock={true}
        >
          <DialogTitle>Custom Game Count</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus={false}
              label="Number of Games"
              type="number"
              value={tempGames}
              onChange={handleTempGamesChange}
              slotProps={{ htmlInput: { min: 1 } }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleApplyCustomGames}>Apply</Button>
          </DialogActions>
        </Dialog>

        {isVanquisherPlayer && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setLineChartData(null);
              setNoPreVanquisherData(false);
              setShowPreVanquisher((v) => !v);
            }}
          >
            {showPreVanquisher
              ? "Show Vanquisher History"
              : "Show Pre-Vanquisher History"}
          </Button>
        )}
      </Box>

      {showPreVanquisher && noPreVanquisherData ? (
        <Typography>No pre-Vanquisher data available.</Typography>
      ) : lineChartData ? (
        <Line options={lineChartOptions} data={lineChartData} />
      ) : (
        <Typography>Loading...</Typography>
      )}
    </>
  );
};

export default RatingChart;
