import { createBattleshipServer } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const server = createBattleshipServer({ port });

server.listen(() => {
  console.log(`Battleship server listening on http://localhost:${port}`);
});
