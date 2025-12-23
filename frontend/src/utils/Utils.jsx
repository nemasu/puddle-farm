import { Typography } from "@mui/material";
import { StorageUtils } from "./Storage";
import React from "react";

const rankThresholds = [
    { rating: 45000, name: 'Vanquisher', spriteX: 3, spriteY: 4 , color: '#ae71f8'},
    { rating: 40800, name: 'Diamond 3', spriteX: 2, spriteY: 4, color: '#cfbfeb' },
    { rating: 36600, name: 'Diamond 2', spriteX: 1, spriteY: 4, color: '#cfbfeb' },
    { rating: 32400, name: 'Diamond 1', spriteX: 0, spriteY: 4, color: '#cfbfeb' },
    { rating: 28400, name: 'Platinum 3', spriteX: 3, spriteY: 3, color: '#56e4bc' },
    { rating: 24400, name: 'Platinum 2', spriteX: 2, spriteY: 3, color: '#56e4bc' },
    { rating: 20400, name: 'Platinum 1', spriteX: 1, spriteY: 3, color: '#56e4bc' },
    { rating: 18000, name: 'Gold 3', spriteX: 0, spriteY: 3, color: '#f0db3b' },
    { rating: 15600, name: 'Gold 2', spriteX: 3, spriteY: 2, color: '#f0db3b' },
    { rating: 13200, name: 'Gold 1', spriteX: 2, spriteY: 2, color: '#f0db3b' },
    { rating: 11000, name: 'Silver 3', spriteX: 1, spriteY: 2, color: '#b8cde6' },
    { rating: 8800, name: 'Silver 2', spriteX: 0, spriteY: 2, color: '#b8cde6' },
    { rating: 6600, name: 'Silver 1', spriteX: 3, spriteY: 1, color: '#b8cde6' },
    { rating: 5400, name: 'Bronze 3', spriteX: 2, spriteY: 1, color: '#cc8c4e' },
    { rating: 4200, name: 'Bronze 2', spriteX: 1, spriteY: 1, color: '#cc8c4e' },
    { rating: 3000, name: 'Bronze 1', spriteX: 0, spriteY: 1, color: '#cc8c4e' },
    { rating: 2000, name: 'Iron 3', spriteX: 3, spriteY: 0, color: '#838fa4' },
    { rating: 1000, name: 'Iron 2', spriteX: 2, spriteY: 0, color: '#838fa4' },
    { rating: 1, name: 'Iron 1', spriteX: 1, spriteY: 0, color: '#838fa4' },
    { rating: 0, name: 'Placement', spriteX: 0, spriteY: 0, color: 'rgba(54, 162, 235, 0.6)' }
];

const Utils = {
  getRankThresholds: () => rankThresholds,
  getRankSprite: (rating) => {
    for (const threshold of rankThresholds) {
      if (rating >= threshold.rating) {
        return { x: threshold.spriteX, y: threshold.spriteY };
      }
    }
    return { x: 0, y: 0 };
  },
  getRankDisplayName: (rating) => {
    for (const threshold of rankThresholds) {
      if (rating >= threshold.rating) {
        return threshold.name;
      }
    }
    return "Placement";
  },
  getRankColor: (name) => rankThresholds.find((r) => r.name.includes(name)).color ?? rankThresholds[rankThresholds.length - 1].color,
  displayRankIcon: (rating, size = "50px") => {
    const threshold = Utils.getRankThresholds().find(t => rating >= t.rating) || Utils.getRankThresholds()[Utils.getRankThresholds().length - 1];
    const sizeValue = parseInt(size);
    const scale = sizeValue / 256;
    const scaledSpriteSheetWidth = 1024 * scale;
    const scaledSpriteSheetHeight = 2048 * scale;
    const scaledPositionX = threshold.spriteX * sizeValue;
    const scaledPositionY = threshold.spriteY * sizeValue;
    
    return (
      <div
        style={{
          display: "inline-flex",
          width: size,
          minWidth: size,
          height: size,
          backgroundImage: "url(/RatingIcon.png)",
          backgroundSize: `${scaledSpriteSheetWidth}px ${scaledSpriteSheetHeight}px`,
          backgroundPosition: `-${scaledPositionX}px -${scaledPositionY}px`,
          backgroundRepeat: "no-repeat",
        }}
        title={threshold.name}
      />
    );
  },
  convertRating: (rating) => {
    if (rating > 10000000) {
      return Number(rating) - 10000000;
    }
    return Number(rating);
  },
  displaySimpleRating: (rating) => {
    const convertedRating = Utils.convertRating(rating);
    if (convertedRating > 10000000) {
      return `${convertedRating} DR`;
    }
    return `${convertedRating} RP`;
  },
  displayRating: (rating) => {
    const convertedRating = Utils.convertRating(rating);
    var suffix = " RP";
    if (rating > 10000000) {
      suffix = " DR";
    }

    return (
      <Typography
        variant={"span"}
        sx={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
      >
        {convertedRating} {suffix}
      </Typography>
    );
  },
  formatUTCToLocal: (dateTimeString) => {
    if (dateTimeString === "Now") {
      return dateTimeString;
    }

    if (StorageUtils.getUseLocalTime()) {
      const utcDateTimeString = dateTimeString.trim();
      const utcDate = new Date(utcDateTimeString + "Z");

      const localYear = utcDate.getFullYear();
      const localMonth = String(utcDate.getMonth() + 1).padStart(2, "0");
      const localDay = String(utcDate.getDate()).padStart(2, "0");
      const localHours = String(utcDate.getHours()).padStart(2, "0");
      const localMinutes = String(utcDate.getMinutes()).padStart(2, "0");
      const localSeconds = String(utcDate.getSeconds()).padStart(2, "0");

      const localDateString = `${localYear}-${localMonth}-${localDay} ${localHours}:${localMinutes}:${localSeconds}`;

      return `${localDateString}`;
    }
    return dateTimeString;
  },
  colorChangeForRating: (change) => {
    if (StorageUtils.getDisableRatingColors()) {
      return <React.Fragment>{change}</React.Fragment>;
    }
    if (change <= -10) {
      // Lower than -10
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#D32F2F",
          }}
        >
          {change}
        </Typography>
      );
    } else if (change <= -2) {
      // Between -10 and -2
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#E57373",
          }}
        >
          {change}
        </Typography>
      );
    } else if (change < 0) {
      // Between -2 and 0
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#FF8A80",
          }}
        >
          {change}
        </Typography>
      );
    } else if (change <= 2) {
      // Between 0 and 2
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#A8E6A3",
          }}
        >
          +{change}
        </Typography>
      );
    } else if (change <= 10) {
      // Between 2 and 10
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#4CAF50",
          }}
        >
          +{change}
        </Typography>
      );
    } else {
      // Greater than 10
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#087F23",
          }}
        >
          +{change}
        </Typography>
      );
    }
  },
  colorChangeForPercent: (percent) => {
    if (percent > 55) {
      // Greater than 55%
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#087F23",
          }}
        >
          {percent}%
        </Typography>
      );
    } else if (percent > 51) {
      // Between 51 and 55 (not inclusive)
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#A8E6A3",
          }}
        >
          {percent}%
        </Typography>
      );
    } else if (percent >= 49 && percent <= 51) {
      // Between 49 and 51 (inclusive)
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#A0BFF0",
          }}
        >
          {percent}%
        </Typography>
      ); // Gold color for 49-51%
    } else if (percent > 45) {
      // Between 45 and 49 (not inclusive)
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#FF8A80",
          }}
        >
          {percent}%
        </Typography>
      );
    } else {
      // Less than or equal to 45%
      return (
        <Typography
          variant={"span"}
          sx={{
            paddingRight: "3px",
            display: "inline",
            fontSize: "0.875rem",
            color: "#D32F2F",
          }}
        >
          {percent}%
        </Typography>
      );
    }
  },
};

export { Utils };
