import { Typography } from "@mui/material";
import { StorageUtils } from "./Storage";
import React from "react";

const Utils = {
  formatUTCToLocal: (dateTimeString) => {
    if (dateTimeString === "Now") {
      return dateTimeString;
    }

    if (StorageUtils.getUseLocalTime()) {
      const utcDateTimeString = dateTimeString.trim();
      const utcDate = new Date(utcDateTimeString + 'Z');

      const localYear = utcDate.getFullYear();
      const localMonth = String(utcDate.getMonth() + 1).padStart(2, '0');
      const localDay = String(utcDate.getDate()).padStart(2, '0');
      const localHours = String(utcDate.getHours()).padStart(2, '0');
      const localMinutes = String(utcDate.getMinutes()).padStart(2, '0');
      const localSeconds = String(utcDate.getSeconds()).padStart(2, '0');

      const localDateString = `${localYear}-${localMonth}-${localDay} ${localHours}:${localMinutes}:${localSeconds}`;

      return `${localDateString}`;
    }
    return dateTimeString;
  },
  colorChangeForRating: (change) => {
    if (StorageUtils.getDisableRatingColors()) {
      return <React.Fragment>{change}</React.Fragment>;
    }
    if (change <= -10) { // Lower than -10
      return <Typography variant={'span'} sx={{ paddingRight: '3px', display: 'inline', fontSize: '0.875rem', color: '#D32F2F' }}>{change}</Typography>;
    } else if (change <= -2) { // Between -10 and -2
      return <Typography variant={'span'} sx={{ paddingRight: '3px', display: 'inline', fontSize: '0.875rem', color: '#E57373' }}>{change}</Typography>;
    } else if (change < 0) { // Between -2 and 0
      return <Typography variant={'span'} sx={{ paddingRight: '3px', display: 'inline', fontSize: '0.875rem', color: '#FF8A80' }}>{change}</Typography>;
    } else if (change <= 2) { // Between 0 and 2
      return <Typography variant={'span'} sx={{ paddingRight: '3px', display: 'inline', fontSize: '0.875rem', color: '#A8E6A3' }}>+{change}</Typography>;
    } else if (change <= 10) { // Between 2 and 10
      return <Typography variant={'span'} sx={{ paddingRight: '3px', display: 'inline', fontSize: '0.875rem', color: '#4CAF50' }}>+{change}</Typography>;
    } else { // Greater than 10
      return <Typography variant={'span'} sx={{ paddingRight: '3px', display: 'inline', fontSize: '0.875rem', color: '#087F23' }}>+{change}</Typography>;
    }
  },
  colorChangeForPercent: (percent) => {
    if (percent > 55) { // Greater than 55%
      return <Typography variant={'span'} sx={{ paddingRight: '3px', display: 'inline', fontSize: '0.875rem', color: '#087F23' }}>{percent}%</Typography>;
    } else if (percent > 51) { // Between 51 and 55 (not inclusive)
      return <Typography variant={'span'} sx={{ paddingRight: '3px', display: 'inline', fontSize: '0.875rem', color: '#A8E6A3' }}>{percent}%</Typography>;
    } else if (percent >= 49 && percent <= 51) { // Between 49 and 51 (inclusive)
      return <Typography variant={'span'} sx={{ paddingRight: '3px', display: 'inline', fontSize: '0.875rem', color: '#A0BFF0' }}>{percent}%</Typography>; // Gold color for 49-51%
    } else if (percent > 45) { // Between 45 and 49 (not inclusive)
      return <Typography variant={'span'} sx={{ paddingRight: '3px', display: 'inline', fontSize: '0.875rem', color: '#FF8A80' }}>{percent}%</Typography>;
    } else { // Less than or equal to 45%
      return <Typography variant={'span'} sx={{ paddingRight: '3px', display: 'inline', fontSize: '0.875rem', color: '#D32F2F' }}>{percent}%</Typography>;
    }
  },
}

export { Utils };