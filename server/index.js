import { createBattleshipServer } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const server = createBattleshipServer({ port });

server.listen(() => {
  console.log(`Battleship Online listening on http://localhost:${port}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down...`);

  try {
    await server.close();
    process.exit(0);
  } catch (error) {
    console.error('Graceful shutdown failed:', error);
    process.exit(1);
  }
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
