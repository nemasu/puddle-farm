import React, { useEffect } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, SelectChangeEvent, TextField, Typography } from '@mui/material';
import { RatingChartProps } from '../interfaces/Player';
import { Utils } from '../utils/Utils';
import { LineChartData } from '../interfaces/Player';
import { RatingsResponse } from "../interfaces/API";

let ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend;
import('chart.js').then(module => {
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
    Legend
  );
});

let Line: React.ComponentType<any>;
import('react-chartjs-2').then(module => {
  Line = module.Line;
});

const RatingChart: React.FC<RatingChartProps> = ({ player_id, char_short, API_ENDPOINT, latest_rating, total_games }) => {

  const [lineChartData, setLineChartData] = React.useState<LineChartData | null>(null);
  const [duration, setDuration] = React.useState<string>('100');
  const [customGames, setCustomGames] = React.useState<string>('');
  const [tempGames, setTempGames] = React.useState<string>('');
  const [openDialog, setOpenDialog] = React.useState(false);

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

  const handleTempGamesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTempGames(event.target.value);
  };

  const handleApplyCustomGames = () => {
    const games = parseInt(tempGames);
    if (!isNaN(games) && games > 0) {
      setCustomGames(tempGames);
      setDuration(tempGames);
      handleCloseDialog();
    }
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Rating History (' + duration + ' games)',
      },
    },
    scales: {
      x: {
        ticks: {
          display: false,
        }
      }
    }
  };

  useEffect(() => {
    const fetchChartData = async () => {
      if (duration === undefined || duration === '') {
        return;
      }

      const rating_history_response = await fetch(API_ENDPOINT + '/ratings/' + player_id + '/' + char_short + '/' + duration);
      if (rating_history_response.status === 200) {
        const rating_history_result = await rating_history_response.json();

        if (rating_history_result !== null && char_short !== null) {

          rating_history_result.reverse();

          //Add current rating to the end
          rating_history_result.push({
            timestamp: "Now",
            rating: latest_rating,
          });

          const hasVanquisher = rating_history_result.some((item: RatingsResponse) => item.rating > 10000000);
          const hasNormal = rating_history_result.some((item: RatingsResponse) => item.rating <= 10000000);

          const convertedRatings = rating_history_result.map((item: RatingsResponse) => Utils.convertRating(item.rating));
          const minRating = Math.min(...convertedRatings);
          const maxRating = Math.max(...convertedRatings);

          const allThresholds = Utils.getRankThresholds();
          const maxRawRating = Math.max(...rating_history_result.map((item: RatingsResponse) => item.rating));
          const currentRankIndex = allThresholds.findIndex((t) => maxRawRating >= t.rating);
          const rawNextRank = currentRankIndex > 0 ? allThresholds[currentRankIndex - 1] : null;

          // Diamond 3 promotes to Vanquisher at 45,000 RP, not at the 10,000,000 magic number.
          const VANQUISHER_PROMOTION_RP = 45000;
          const nextRankLine = rawNextRank === null ? null
              : rawNextRank.rating >= 10000000 && !hasVanquisher
                  ? { name: rawNextRank.name, color: rawNextRank.color, convertedRating: VANQUISHER_PROMOTION_RP }
                  : { name: rawNextRank.name, color: rawNextRank.color, convertedRating: Utils.convertRating(rawNextRank.rating) };

          // if the user has less than 100 games, select
          if (total_games < 100){
            setDuration(total_games.toString());
          }

          const lineChartData = {
            labels: rating_history_result.map((item: RatingsResponse) => Utils.formatUTCToLocal(item.timestamp)),
            datasets: [
              {
                label: 'Rating',
                data: convertedRatings,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                pointRadius: 3,
                borderWidth: 2,
              },
            ].concat(allThresholds
                .filter((rank) => {
                    if (rawNextRank && rank.rating === rawNextRank.rating) return false;
                    const rankIsVanquisher = rank.rating > 10000000;
                    if (rankIsVanquisher && !hasVanquisher) return false;
                    if (!rankIsVanquisher && !hasNormal) return false;
                    const cr = Utils.convertRating(rank.rating);
                    return cr <= maxRating && cr >= minRating;
                })
                .map((rank) =>
                    ({
                        label: rank.name,
                        data: rating_history_result.map(() => Utils.convertRating(rank.rating)),
                        borderColor: rank.color,
                        backgroundColor: rank.color,
                        pointRadius: 0,
                        borderWidth: 1,
                    })
                ),
            ).concat(nextRankLine ? [{
                label: nextRankLine.name,
                data: rating_history_result.map(() => nextRankLine.convertedRating),
                borderColor: nextRankLine.color,
                backgroundColor: nextRankLine.color,
                pointRadius: 0,
                borderWidth: 1,
            }] : []),
          };

          setLineChartData(lineChartData);
        }
      }
    }
    fetchChartData();
  }, [player_id, char_short, API_ENDPOINT, latest_rating, duration]);

  return (
    <React.Fragment>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 5 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Game Count</InputLabel>
          <Select
            value={duration}
            label="Games"
            onChange={handleDurationChange}
          >
            {
              [100,  200, 300, 400, 500, total_games]
                  .filter((value, index, self) => self.indexOf(value) === index) // remove duplicates
                  .sort((a, b) => a - b)
                  .filter(n => n <= total_games)
                  .map((nbGame) => <MenuItem value={nbGame}>{nbGame}</MenuItem>)
            }
            <MenuItem value={customGames} onClick={handleOpenDialog}>Custom...</MenuItem>
          </Select>
        </FormControl>

        <Dialog open={openDialog} onClose={handleCloseDialog} disableScrollLock={true}>
          <DialogTitle>Custom Game Count</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus={false}
              label="Number of Games"
              type="number"
              value={tempGames}
              onChange={handleTempGamesChange}
              inputProps={{
                min: 1
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button onClick={handleApplyCustomGames}>Apply</Button>
          </DialogActions>
        </Dialog>
      </Box>

      {lineChartData ? (
        <Line options={lineChartOptions} data={lineChartData} />
      ) : (
        <Typography>Loading...</Typography>
      )}
    </React.Fragment>
  );
}

export default RatingChart;