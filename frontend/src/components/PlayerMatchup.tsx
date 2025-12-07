import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Paper, Select, SelectChangeEvent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, TextField, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { Utils } from "../utils/Utils";
import { MatchupProps, Matchups } from '../interfaces/PlayerMatchups';

const Matchup: React.FC<MatchupProps> = ({ API_ENDPOINT, char_short, player_id }) => {
  const [orderBy, setOrderBy] = useState<string | null>(null);
  const [order, setOrder] = useState<'asc' | 'desc' | undefined>(undefined);
  const [duration, setDuration] = useState<string>('12');
  const [matchups, setMatchups] = useState<Matchups | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [customWeeks, setCustomWeeks] = useState<string>('');
  const [tempWeeks, setTempWeeks] = useState<string>('');
  const [openDialog, setOpenDialog] = useState(false);

  const handleCustomWeeksChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCustomWeeks(event.target.value);
  };

  const handleOpenDialog = () => {
    setTempWeeks(customWeeks);
    setOpenDialog(true);
  };

  const handleTempWeeksChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTempWeeks(event.target.value);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleApplyCustomWeeks = () => {
    const weeks = parseInt(tempWeeks);
    if (!isNaN(weeks) && weeks > 0) {
      setCustomWeeks(tempWeeks);
      setDuration(tempWeeks);
      handleCloseDialog();
    }
  };

  useEffect(() => {
    const fetchMatchups = async () => {
      if (duration === undefined || duration === '') {
        return;
      }

      setLoading(true);
      try {
        const matchups = await fetch(API_ENDPOINT + '/matchups/' + player_id + '/' + char_short + '/' + duration);
        if (matchups.status === 200) {
          const matchups_result = await matchups.json();
          if (matchups_result !== null) {

            let total_wins = 0;
            let total_games = 0;
            for (var mkey in matchups_result.matchups) {
              total_wins += matchups_result.matchups[mkey].wins;
              total_games += matchups_result.matchups[mkey].total_games;
            }

            matchups_result.total_wins = total_wins;
            matchups_result.total_games = total_games;

            setMatchups(matchups_result);
          }
        }
      } catch (error) {
        console.error('Error fetching matchups:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatchups();
  }, [duration, char_short, player_id, API_ENDPOINT]);

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleDurationChange = (event: SelectChangeEvent) => {
    setDuration(event.target.value);
  };

  const sortedMatchups = React.useMemo(() => {
    if (!matchups?.matchups) return [];

    if (order === null || orderBy === null) {
      return [...matchups.matchups];
    }

    return [...matchups.matchups].sort((a, b) => {
      const aValue = (() => {
        switch (orderBy) {
          case 'character': return a.char_name;
          case 'winrate': return (a.wins / a.total_games) * 100;
          case 'wins': return a.wins;
          case 'total': return a.total_games;
          default: return 0;
        }
      })();

      const bValue = (() => {
        switch (orderBy) {
          case 'character': return b.char_name;
          case 'winrate': return (b.wins / b.total_games) * 100;
          case 'wins': return b.wins;
          case 'total': return b.total_games;
          default: return 0;
        }
      })();

      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return bValue > aValue ? 1 : -1;
      }
    });
  }, [matchups, orderBy, order]);

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (!matchups) {
    return <Typography>No data available</Typography>;
  }

  return (
    <React.Fragment>
      {matchups ? (
        <React.Fragment>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 10, marginBottom: 2 }}>
            <Typography variant="h6">Matchup Table</Typography>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Duration</InputLabel>
              <Select
                value={duration}
                label="Duration"
                onChange={handleDurationChange}
              >
                <MenuItem value="4">1 Month</MenuItem>
                <MenuItem value="12">3 Months</MenuItem>
                <MenuItem value="24">6 Months</MenuItem>
                <MenuItem value="520">All Time</MenuItem>
                <MenuItem value={customWeeks} onClick={handleOpenDialog}>Custom...</MenuItem>
              </Select>
              <Dialog open={openDialog} onClose={handleCloseDialog} disableScrollLock={true}>
                <DialogTitle>Custom Duration</DialogTitle>
                <DialogContent>
                  <TextField
                    autoFocus={false}
                    label="Number of Weeks"
                    type="number"
                    value={tempWeeks}
                    onChange={handleTempWeeksChange}
                    inputProps={{
                      min: 1
                    }}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleCloseDialog}>Cancel</Button>
                  <Button onClick={handleApplyCustomWeeks}>Apply</Button>
                </DialogActions>
              </Dialog>
            </FormControl>
          </Box>
          <Typography variant='body1'>
            {duration === '520'
              ? 'This includes all games played.'
              : `This includes all games played in the past ${duration} week${duration === '1' ? '' : 's'}.`
            }
          </Typography>
          <Typography p={2} variant="body1">
            Win Rate
          </Typography>
          <Box component={Paper} sx={{ maxWidth: 350 }}>
            <Typography p={2} variant='body1'>
              {matchups.total_games === 0
                ? 'No games played during this period.'
                : <React.Fragment>
                    {Utils.colorChangeForPercent(((matchups.total_wins / matchups.total_games) * 100).toFixed(2))}
                    {` ( ${matchups.total_wins} / ${matchups.total_games} )`}
                  </React.Fragment>
              }
            </Typography>
          </Box>
          <TableContainer component={Paper} sx={{ maxWidth: 400 }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <TableSortLabel
                      active={orderBy === 'character'}
                      direction={orderBy === 'character' ? order : 'asc'}
                      onClick={() => handleRequestSort('character')}
                    >
                      Character
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <TableSortLabel
                      active={orderBy === 'winrate'}
                      direction={orderBy === 'winrate' ? order : 'asc'}
                      onClick={() => handleRequestSort('winrate')}
                    >
                      WR
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <TableSortLabel
                      active={orderBy === 'wins'}
                      direction={orderBy === 'wins' ? order : 'asc'}
                      onClick={() => handleRequestSort('wins')}
                    >
                      Wins
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <TableSortLabel
                      active={orderBy === 'total'}
                      direction={orderBy === 'total' ? order : 'asc'}
                      onClick={() => handleRequestSort('total')}
                    >
                      Total
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedMatchups.map((matchup, rowIndex) => (
                  <TableRow key={rowIndex}>
                    <TableCell component="th" scope="row" sx={{ position: 'sticky', left: 0, background: 'black', zIndex: 1 }}>
                      {matchup.char_name} ({matchup.char_short})
                    </TableCell>
                    <TableCell>
                      {Utils.colorChangeForPercent(((matchup.wins / matchup.total_games) * 100).toFixed(2))}
                    </TableCell>
                    <TableCell>
                      {matchup.wins}
                    </TableCell>
                    <TableCell>
                      {matchup.total_games}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </React.Fragment>
      ) : null}
    </React.Fragment>
  );
}

export default Matchup;