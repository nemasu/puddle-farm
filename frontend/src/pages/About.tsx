import React, { useEffect, useState } from 'react';
import { Box, Button, Checkbox, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, TextField, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { Tag } from './../components/Tag';
import { RatingCalculationResponse, Supporter, TagResponse } from '../interfaces/API';

let JSONParse: (arg0: string) => any;
import('json-with-bigint').then(module => {
  JSONParse = module.JSONParse;
});
// eslint-disable-next-line
/* global BigInt */

const About = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const [supporters, setSupporters] = React.useState<Supporter[]>([]);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ratingData, setRatingData] = useState<RatingCalculationResponse>();

  const [ratingA, setRatingA] = useState(1500.0);
  const [driftA, setDriftA] = useState(10.0);
  const [ratingB, setRatingB] = useState(1500.0);
  const [driftB, setDriftB] = useState(10.0);
  const [aWins, setAWins] = useState(true);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const fetchRatingData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_ENDPOINT}/calc_rating?rating_a=${ratingA}&drift_a=${driftA}&rating_b=${ratingB}&drift_b=${driftB}&a_wins=${aWins}`);
      if (response.status === 200) {
        const data = await response.json();
        setRatingData(data);
      } else {
        const data = await response.text();
        alert(data);
      }


    } catch (error) {
      console.error('Error fetching rating data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = () => {
    fetchRatingData();
  };

  useEffect(() => {
    document.title = 'About | Puddle Farm';
    const fetchSupporters = async () => {
      const supporters_response = await fetch(API_ENDPOINT + '/supporters');
      const supporters_result = await supporters_response.text().then(body => {
        var parsed = JSONParse(body);
        return parsed;
      });
      setSupporters(supporters_result);
    }
    fetchSupporters();
  }, [API_ENDPOINT]);

  return (
    <React.Fragment>
      <Box m={5}>
        <Typography variant="h4" gutterBottom align="center">
          About
        </Typography>
        <Box mb={4}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: 1 }}>
            What happened to Rating Update?
          </Typography>
          <Typography variant="body1">
            Rating Update started to get reworked due to multiple reasons.
            <br />
            The biggest problem was the SQLite database, it was not fit for concurrent access with long-running transactions.
            <br />
            Additionally, a new rating algorithm was proposed. Also, I wanted to separate the frontend and backend for maintenance and development.
            <br />
            So aside from some GGST API code, Puddle Farm is a complete rewrite.
          </Typography>
        </Box>
        <Box mb={4}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: 1 }}>
            What rating system is used?
          </Typography>
          <Typography variant="body1">
            The new system used for rating is based on the <Link to="https://en.wikipedia.org/wiki/Bradley%E2%80%93Terry_model" target='_blank'>Bradley-Terry Model</Link>.
            <Box component={'span'} sx={{ display: 'block' }}>
              <Button variant="contained" color="primary" onClick={handleClickOpen}>
                Open Rating Calculator
              </Button>
            </Box>
          </Typography>
          <Dialog open={open} onClose={handleClose}>
            <DialogTitle>Rating Calculator</DialogTitle>
            <DialogContent>
              <TextField
                label="Rating A"
                type="number"
                value={ratingA}
                onChange={(e) => setRatingA(parseFloat(e.target.value))}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Drift A"
                type="number"
                value={driftA}
                onChange={(e) => setDriftA(parseFloat(e.target.value))}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Rating B"
                type="number"
                value={ratingB}
                onChange={(e) => setRatingB(parseFloat(e.target.value))}
                fullWidth
                margin="normal"
              />
              <TextField
                label="Drift B"
                type="number"
                value={driftB}
                onChange={(e) => setDriftB(parseFloat(e.target.value))}
                fullWidth
                margin="normal"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={aWins}
                    onChange={(e) => setAWins(e.target.checked)}
                  />
                }
                label="A Wins?"
              />
              {loading ? (
                <CircularProgress />
              ) : (
                ratingData && (
                  <Box mt={2}>
                    <Typography variant="body1">
                      <strong>New Rating A:</strong> {ratingData.rating_a_new.toFixed(2)}
                    </Typography>
                    <Typography variant="body1">
                      <strong>New Drift A:</strong> {ratingData.drift_a_new.toFixed(2)}
                    </Typography>
                    <Typography variant="body1">
                      <strong>New Rating B:</strong> {ratingData.rating_b_new.toFixed(2)}
                    </Typography>
                    <Typography variant="body1">
                      <strong>New Drift B:</strong> {ratingData.drift_b_new.toFixed(2)}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Win Probability:</strong> {(ratingData.win_prob * 100).toFixed(2)}%
                    </Typography>
                  </Box>
                )
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={handleClose} color="primary">
                Close
              </Button>
              <Button onClick={handleCalculate} color="primary" variant="contained">
                Calculate
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
        <Box mb={4}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: 1 }}>
            I can't find my profile
          </Typography>
          <Typography variant="body1">
            If you hid your profile on the old site, it is still hidden here, however you need to claim it again.
            <br />
            To do so, you can use the old link (or browser history).
            <br />
            If you don't have it, the format is:
          </Typography>
          <pre>https://puddle.farm/player/YOUR_PLAYER_ID</pre>
          <Typography variant="body1">
            Note: The ID does not have to be hexadecimal anymore, you can just use the ID in the bottom-left corner of your R-Code.
          </Typography>
          Example:<br />
          <img style={{ marginTop: '15px' }} src='/r_code.png' alt='R-Code' />
        </Box>
        <Box mb={4}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: 1 }}>
            I have a suggestion/question.
          </Typography>
          <Typography variant="body1">
            Feel free to join Discord. The link is in the footer.
          </Typography>
        </Box>
        <Box mb={4}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: 1 }}>
            Supporters 💜
          </Typography>
          <Typography variant="body1" sx={{ marginBottom: 1 }}>
            Big thank you to the Patreon subscribers for supporting the website
          </Typography>
          <Typography variant="body1" component="div">
            <ul>
              {supporters.map((supporter, index) => (
                <li key={index}>
                  <Button sx={{ fontSize: '16px' }}
                    component={Link}
                    to={`/player/${supporter.id}`}
                  >
                    {supporter.name}
                  </Button>
                  {supporter.tags && supporter.tags.map((e: TagResponse, i: number) => (
                    <Tag key={i} style={JSON.parse(e.style)} sx={{ fontSize: '0.9rem', position: 'unset' }}>
                      {e.tag}
                    </Tag>
                  ))}
                </li>
              ))}
            </ul>
          </Typography>
        </Box>
      </Box>
    </React.Fragment>
  );
};

export default About;