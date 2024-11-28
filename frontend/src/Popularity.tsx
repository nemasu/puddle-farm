import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { Utils } from './Utils';
import { PopularityResult } from './Interfaces';

const Popularity = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const [popularity, setPopularity] = React.useState<PopularityResult>();

  useEffect(() => {
    fetch(`${API_ENDPOINT}/popularity`)
      .then((response) => response.json())
      .then((data) => {
        setPopularity(data);
      });
  }, [API_ENDPOINT]);

  return (
    <React.Fragment>
      <Box m={5}>
        <Typography variant="h4" gutterBottom align="center">
          Popularity
        </Typography>
        <Box mb={4}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: 1 }}>
            Character Popularity Per Player (Past Month)
          </Typography>
          <Box mb={4}>
            <Typography variant="body1">
              This table shows the popularity of each character for each player in the last month.<br />
              For example: If a character has a popularity of 10%, it means that 10% of the players have used that character.<br />
              It adds up to over 100% because players can use multiple characters.
            </Typography>
          </Box>
          <Box display={'flex'} flexWrap={'wrap'}>
            {popularity && popularity.per_player.reduce<Array<typeof popularity.per_player>>((acc, e, index) => {
              const groupIndex = Math.floor(index / 10);
              if (!acc[groupIndex]) {
                acc[groupIndex] = [];
              }
              acc[groupIndex].push(e);
              return acc;
            }, []).map((group, groupIndex) => (
              <Box key={groupIndex} width={'300px'}>
                <TableContainer component={Paper} sx={{ marginBottom: 4, marginRight: 2 }} key={groupIndex}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Character</TableCell>
                        <TableCell>Popularity</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {group.map((e) => (
                        <TableRow key={e.name}>
                          <TableCell>{e.name}</TableCell>
                          <TableCell>{((e.value / popularity['per_player_total']) * 100).toFixed(2)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </Box>
          <Box>Total games per player: {popularity && popularity['per_player_total'].toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Box>
        </Box>
        <Box mb={4}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: 1 }}>
            Character Popularity Per Character (Past Month)
          </Typography>
          <Box mb={4}>
            <Typography variant="body1">
              This table shows the game count per character in the last month.<br />
              For example: If a character has a popularity of 10%, it means that 10% of the games are with that character.<br />
            </Typography>
          </Box>
          <Box display={'flex'} flexWrap={'wrap'}>
            {popularity && popularity.per_character.reduce<Array<typeof popularity.per_character>>((acc, e, index) => {
              const groupIndex = Math.floor(index / 10);
              if (!acc[groupIndex]) {
                acc[groupIndex] = [];
              }
              acc[groupIndex].push(e);
              return acc;
            }, []).map((group, groupIndex) => (
              <Box key={groupIndex} width={'300px'}>
                <TableContainer component={Paper} sx={{ marginBottom: 4, marginRight: 2 }} key={groupIndex}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Character</TableCell>
                        <TableCell>Popularity</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {group.map((e) => (
                        <TableRow key={e.name}>
                          <TableCell>{e.name}</TableCell>
                          <TableCell>{(((e.value / popularity['per_character_total']) * 100) / 2).toFixed(2)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}
          </Box>
          <Box>Total games per character: {popularity && (popularity['per_character_total'] * 2).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</Box>
        </Box>
        <Box>
          <Typography>Statistics are updated once a day.</Typography>
          {popularity && (
            <Typography variant="body1">
              Last updated: {Utils.formatUTCToLocal(popularity['last_update'])}
            </Typography>
          )}
        </Box>
      </Box>

    </React.Fragment>
  );
};

export default Popularity;