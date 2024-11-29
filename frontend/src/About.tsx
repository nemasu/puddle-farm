import React, { useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Link, To, useNavigate } from 'react-router-dom';
import { Tag } from './Tag';
import { Supporter, TagResponse } from './Interfaces';

let JSONParse: (arg0: string) => any;
import('json-with-bigint').then(module => {
  JSONParse = module.JSONParse;
});
/* global BigInt */

const About = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;
  const navigate = useNavigate();
  
  const [supporters, setSupporters] = React.useState<Supporter[]>([]);

  function onProfileClick(event: React.MouseEvent<HTMLAnchorElement, MouseEvent>, url: string) {
    if (event.button === 1) { //Middle mouse click
      window.open(url?.toString(), '_blank');
    } else if (event.button === 0) { //Left mouse click
      if (url) {
        navigate(url);
      }
    }
  }

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
  }, []);

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
          </Typography>
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
                    variant="link"
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