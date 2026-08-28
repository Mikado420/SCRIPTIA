import WebSocket from 'ws';
import fetch from 'node-fetch';

async function test() {
  const res = await fetch('http://localhost:3000/api/room/create', { method: 'POST' });
  const data = await res.json();
  const roomCode = data.code;
  
  const wsA = new WebSocket(`ws://localhost:3000/ws?code=${roomCode}`);
  
  wsA.on('open', () => {
    wsA.send(JSON.stringify({ type: 'create_room', version: '2.3' }));
  });

  wsA.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    if (data.type === 'room_created') {
      // Send invalid deck (40 cards, but contains invalid ID)
      const deck = Array(39).fill('A-01').concat(['INVALID-CARD-001']);
      wsA.send(JSON.stringify({ type: 'player_ready', code: roomCode, deckCards: deck }));
    }
    if (data.type === 'error') {
      console.log("SUCCESS ERROR:", data.message);
      process.exit(0);
    }
  });
}
test();
