import React, { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { Tag } from './../components/Tag';
import { Supporter, TagResponse } from '../interfaces/API';
import { JSONParse } from '../utils/JSONParse';

const About = () => {
  const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT;

  const [supporters, setSupporters] = React.useState<Supporter[]>([]);

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
            What is this?
          </Typography>
          <Typography variant="body1">
            This website collects replay data for the game <Link to="https://www.guiltygear.com/ggst/en/" target='_blank'>Guilty Gear Strive</Link> and provides statistics and rankings using the game's official rating system.<br />
            It is not affiliated with Arc System Works or any other company.
          </Typography>
        </Box>
        <Box mb={4}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: 1 }}>
            What rating system is used?
          </Typography>
          <Typography variant="body1">
            As of recent game updates, this site now uses the official rating system provided by Guilty Gear Strive itself.<br />
          </Typography>
        </Box>
        <Box mb={4}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', marginBottom: 1 }}>
            Rating Sync
          </Typography>
          <Typography variant="body1">
            Because we can't predict the new rating after a match result, a rating sync feature was added.<br />
            Look for the refresh icon (🔄) next to your rating on your player page.<br />
            It's recommended to use this feature after you're done for the day to ensure your rating is up to date.<br />
            <strong>Note:</strong> Rating sync is limited to once per minute.
          </Typography>
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