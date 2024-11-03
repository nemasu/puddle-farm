import React, { useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';

const About = () => {
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
              The biggest problem was the SQLite based database, it was not fit for concurrent access with long-running transactions.
              <br />
              Additionally, a new rating algorithm was proposed. Along with all that, I wanted to separate the frontend from the backend for maintenance and development.
              <br />
              So aside from some GGST API code, Puddle Farm is a complete rewrite.
            </Typography>
          </Box>
          <Box mb={4}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: 1 }}>
              My rating changed. Why?
            </Typography>
            <Typography variant="body1">
              All of the old match data was re-imported and recalculated using the new rating system.
              <br />
              The numbers vary, and the high end of ratings is generally lower, but the mean should be more or less similar (100 rating difference being expected 66% odds, etc.).
            </Typography>
          </Box>
          <Box mb={4}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: 1 }}>
              What rating system is used now?
            </Typography>
            <Typography variant="body1">
              The new system used for rating is based on the <Link to="https://en.wikipedia.org/wiki/Bradley%E2%80%93Terry_model" target='_blank'>Bradley-Terry Model</Link>.
            </Typography>
          </Box>
          <Box mb={4}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: 1 }}>
              Why are so many features missing?
            </Typography>
            <Typography variant="body1">
              The new site had to be launched early, as the influx of players after Season 4 began was overloading the old site, leading to it crashing often as soon as it was restarted.
              <br />
              They will be added back in the future.
            </Typography>
          </Box>
          <Box mb={4}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: 1 }}>
              My settings disappeared
            </Typography>
            <Typography variant="body1">
              Claims of a profile were not carried over to the new site. You need to claim your profile again.
            </Typography>
          </Box>
          <Box mb={4}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: 1 }}>
              I can't find my profile
            </Typography>
            <Typography variant="body1">
              If you hid your profile on the old site, it is still hidden here, however you need to claim it again.
              <br />
              To do so, just use the old link (or browser history).
              <br />
              If you don't have it, it is: https://puddle.farm/player/YOUR_PLAYER_ID
              <br />
              Note: The ID does not have to be hexadecimal anymore, you can just use the ID in the bottom-left corner of your R-Code.
            </Typography>
            <img style={{marginTop: '15px'}} src='/r_code.png' alt='R-Code' />
          </Box>
        </Box>
      </React.Fragment>
    );
};

export default About;