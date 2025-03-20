import React, { useEffect } from 'react';
import { Box, Divider, Typography } from '@mui/material';

const Terms = () => {
  useEffect(() => {
    document.title = 'Terms & Privacy | Puddle Farm';
  }, []);

  return (
    <React.Fragment>
      <Box m={5}>
        <Typography variant="h4" gutterBottom align="center" sx={{ mb: 6 }}>
          Terms of Service & Privacy Policy
        </Typography>

        <Typography variant="h5" gutterBottom sx={{ mb: 4 }}>
          Website Policy
        </Typography>

        <Box mb={4}>
          <Typography variant="h6" gutterBottom>
            Terms of Service
          </Typography>
          <Typography variant="body1">
            By using Puddle Farm, you agree to these terms. The service is provided "as is" without any guarantees.
            We reserve the right to modify or terminate the service at any time.
          </Typography>
          <Typography variant="body1">
            Users are responsible for their use of the service.
            We may remove content or accounts that violate these terms.
          </Typography>
        </Box>

        <Box mb={4}>
          <Typography variant="h6" gutterBottom>
            Privacy Policy
          </Typography>
          <Typography variant="body1">
            We collect and store game replay data and R-Code information publicly available through the game.<br />
            This includes player IDs, in-game names, character selections, match results, and timestamps.
          </Typography>
          <Typography variant="body1">
            We use this data to:
          </Typography>
          <Box component="ul" sx={{ ml: 4, mb: 2 }}>
            <Typography component="li" variant="body1">Calculate player ratings and statistics</Typography>
            <Typography component="li" variant="body1">Display match history and player profiles</Typography>
            <Typography component="li" variant="body1">Generate gameplay analytics</Typography>
          </Box>
        </Box>

        <Box mb={4}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Data Retention
          </Typography>
          <Typography variant="body1">
            Match data is retained indefinitely.
            Users can toggle their profile to be hidden, which will prevent new data from being collected.
          </Typography>
        </Box>

        <Box mb={6}>
          <Typography variant="h6">
            Contact
          </Typography>
          <Typography variant="body1">
            For questions about these terms or privacy policy, please contact us through Discord.
            The Discord link can be found in the footer of the website.
          </Typography>
        </Box>

        <Divider sx={{ my: 6 }} />

        <Typography variant="h5" gutterBottom sx={{ mb: 4 }}>
          Discord Bot Policy
        </Typography>

        <Box mb={4}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Privacy Policy
          </Typography>

          <Typography variant="h6" gutterBottom>
            Information Collection and Use
          </Typography>
          <Typography variant="body1">
            The Bot collects and processes information solely for the purpose of providing its intended functionality within Discord. This may include:
          </Typography>
          <Box component="ul" sx={{ ml: 4, mb: 2 }}>
            <Typography component="li" variant="body1">
              Discord user IDs and server IDs, which are used to identify users and servers for command execution.
            </Typography>
            <Typography component="li" variant="body1">
              Message content, which is processed only when necessary to respond to user commands.
            </Typography>
          </Box>

          <Typography variant="h5" gutterBottom>
            Data Storage
          </Typography>
          <Typography variant="body1">
            The Bot does not persistently store any user data. All processed information is temporary and is not retained after the completion of the relevant command or interaction.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{mt: 2}}>
            Data Sharing
          </Typography>
          <Typography variant="body1">
            The Bot does not share any user data with third parties.
          </Typography>
        </Box>

        <Box mb={4}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
            Terms of Service
          </Typography>

          <Typography variant="h6" gutterBottom>
            Use of the Bot
          </Typography>
          <Box component="ul" sx={{ ml: 4, mb: 2 }}>
            <Typography component="li" variant="body1" paragraph>
              The Bot is provided for use within the Discord platform.
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              You agree to use the Bot in accordance with Discord's Terms of Service and Community Guidelines.
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              You are responsible for any actions taken by the Bot when used from your Discord account or server.
            </Typography>
          </Box>

          <Typography variant="h6" gutterBottom>
            Limitations of Liability
          </Typography>
          <Box component="ul" sx={{ ml: 4, mb: 2 }}>
            <Typography component="li" variant="body1" paragraph>
              The Bot is provided "as is" without any warranties.
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              The developers of the Bot shall not be liable for any damages arising from the use of the Bot.
            </Typography>
            <Typography component="li" variant="body1" paragraph>
              The developers are not responsible for Discord's downtime or any other issues that Discord may have.
            </Typography>
          </Box>
        </Box>
      </Box>
    </React.Fragment>
  );
};

export default Terms;