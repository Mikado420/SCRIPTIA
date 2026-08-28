import WebSocket from 'ws';

const roomCode = process.argv[2];
const url = `wss://scriptia.mikadoo420.workers.dev/ws?code=${roomCode}`;

const ws = new WebSocket(url, {
  headers: {
    'Origin': 'https://ais-dev-xpgk25v7obwphzl62f4fgs-146110987523.asia-northeast1.run.app'
  }
});

ws.on('open', () => {
  ws.send(JSON.stringify({ type: 'create_room', version: '2.3' }));
});

ws.on('message', (data) => {
  console.log(`[WebSocket] Received: ${data.toString()}`);
  setTimeout(() => ws.close(), 1000);
});
