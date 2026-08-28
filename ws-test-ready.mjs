import WebSocket from 'ws';
import fetch from 'node-fetch';

async function test() {
  const res = await fetch('http://localhost:3000/api/room/create', { method: 'POST' });
  const data = await res.json();
  const roomCode = data.code;
  console.log('Room Code:', roomCode);

  const wsA = new WebSocket(`ws://localhost:3000/ws?code=${roomCode}`);
  const wsB = new WebSocket(`ws://localhost:3000/ws?code=${roomCode}`);
  
  wsA.on('open', () => {
    wsA.send(JSON.stringify({ type: 'create_room', version: '2.3' }));
  });

  wsB.on('open', () => {
    // just wait for A to create room
  });

  let aCreated = false;

  wsA.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    console.log('[PlayerA received]', data.type);
    if (data.type === 'room_created') {
       wsB.send(JSON.stringify({ type: 'join_room', code: roomCode, version: '2.3' }));
    }
    if (data.type === 'room_joined') {
      const validDeck = Array(40).fill('A-01');
      wsA.send(JSON.stringify({ type: 'player_ready', code: roomCode, deckCards: validDeck }));
    }
    if (data.type === 'game_started') {
       console.log("Player A game started! Deck A length:", data.state.playerA.deck.length);
       setTimeout(() => { process.exit(0); }, 500);
    }
    if (data.type === 'error') {
       console.error("Player A error:", data.message);
    }
  });

  wsB.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    console.log('[PlayerB received]', data.type);
    if (data.type === 'room_joined') {
      const validDeck = Array(40).fill('A-02');
      wsB.send(JSON.stringify({ type: 'player_ready', code: roomCode, deckCards: validDeck }));
    }
    if (data.type === 'game_started') {
       console.log("Player B game started! Deck B length:", data.state.playerB.deck.length);
    }
    if (data.type === 'error') {
       console.error("Player B error:", data.message);
    }
  });
}
test();
