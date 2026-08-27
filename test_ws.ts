import { io } from "socket.io-client";

console.log("Connecting...");
const socketA = io("http://localhost:3000");
const socketB = io("http://localhost:3000");

socketA.on("connect", () => {
  console.log("Socket A connected");
  socketA.emit("create_room", { version: "2.3" });
});

let roomCode = "";

socketA.on("room_created", (data) => {
  console.log("Room created:", data.code);
  roomCode = data.code;
  socketA.emit("player_ready", { code: roomCode, deckCards: [] });
  socketB.emit("join_room", { code: roomCode, version: "2.3" });
});

socketA.on("error", (err) => console.error("A error:", err));
socketB.on("error", (err) => console.error("B error:", err));

socketB.on("room_joined", (data) => {
  console.log("Socket B joined:", data.code);
  socketB.emit("player_ready", { code: roomCode, deckCards: [] });
});

let aStarted = false;
let bStarted = false;

socketA.on("game_started", (data) => {
  console.log("A Game Started! Player ID:", data.playerId);
  aStarted = true;
});

socketB.on("game_started", (data) => {
  console.log("B Game Started! Player ID:", data.playerId);
  bStarted = true;
  if (aStarted && bStarted) {
    console.log("Both started! Sending action from A...");
    socketA.emit("action", { code: roomCode, action: { type: "PASS" } });
  }
});

socketB.on("state_update", (data) => {
  console.log("B received state update from A's action!", data.state.turn);
  process.exit(0);
});

setTimeout(() => {
  console.log("Timeout!");
  process.exit(1);
}, 10000);
