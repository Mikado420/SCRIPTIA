import WebSocket from 'ws';

const roomCode = process.argv[2];
const url = `wss://scriptia.mikadoo420.workers.dev/ws?code=${roomCode}`;
console.log(`Connecting to ${url}...`);

const startTime = Date.now();
const ws = new WebSocket(url, {
  headers: {
    'Origin': 'https://ais-dev-xpgk25v7obwphzl62f4fgs-146110987523.asia-northeast1.run.app'
  }
});

ws.on('open', () => {
  const elapsed = Date.now() - startTime;
  console.log(`[WebSocket] OPEN - Elapsed: ${elapsed}ms`);
  
  const joinMsg = JSON.stringify({
    type: 'join_room',
    payload: {
      roomCode: roomCode,
      deckId: 'test-deck',
      playerName: 'TestPlayer'
    }
  });
  console.log(`[WebSocket] Sending: ${joinMsg}`);
  ws.send(joinMsg);
});

ws.on('message', (data) => {
  console.log(`[WebSocket] Received: ${data.toString()}`);
  
  // Close after receiving a response to cleanly exit
  setTimeout(() => {
    ws.close(1000, 'Test finished');
  }, 1000);
});

ws.on('error', (err) => {
  console.error(`[WebSocket] ERROR:`, err);
});

ws.on('close', (code, reason) => {
  console.log(`[WebSocket] CLOSE - Code: ${code}, Reason: ${reason.toString()}`);
});
