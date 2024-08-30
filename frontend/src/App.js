import './App.css';

import React, { useState, useEffect } from 'react';

const App = () => {
  const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

  const [history, setHistory] = useState([]);
  const [player, setPlayer] = useState([]);

  const urlSearchString = window.location.search;
  const params = new URLSearchParams(urlSearchString);

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        
        const response = await fetch(API_ENDPOINT + '/player/' + params.get('player'));
        const result = await response.json();
        setPlayer(result);
        console.log(result);
      } catch (error) {
        console.error('Error fetching player data:', error);
      }
    };

    const fetchHistory = async () => {
      try {
        const response = await fetch(API_ENDPOINT + '/player/' + params.get('player') +'/' + params.get('char_short') + '/history');
        const result = await response.json();
        setHistory(result.history);
        console.log(result.history);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchPlayer();
    fetchHistory();
  }, []);



  return (
    <div>
      <h1>{player.id} - {params.get('char_short')} - {player.name}: {player.rating} +-{player.deviation}</h1>
      <table className="table">
        <tr>
          <th>Timestamp</th>
          <th>Floor</th>
          <th>Rating</th>
          <th>Opponent</th>
          <th>Opponent Character</th>
          <th>Opp Rating</th>
          <th>Winner (yes or no)</th>
        </tr>
      

      {history.map((item, i) => (
        <tr key={i}>
          <td>{item.timestamp}</td>
          <td>{item.floor}</td>
          <td>{item.own_rating_value} +-{item.own_rating_deviation}</td>
          <td>{item.opponent_name}</td>
          <td>{item.opponent_character}</td>
          <td>{item.opponent_rating_value} +-{item.opponent_rating_deviation}</td>
          <td>{item.result_wins}</td>
        </tr>
      ))}

      </table>
    </div>
  );
};

export default App;