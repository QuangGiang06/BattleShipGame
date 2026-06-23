import { io } from 'socket.io-client';

const TOKEN_KEY = 'battleship.playerToken';
const configuredUrl = import.meta.env.VITE_SERVER_URL?.trim();
const serverUrl = configuredUrl || window.location.origin;
const storedToken = window.localStorage.getItem(TOKEN_KEY);

export const socket = io(serverUrl, {
  autoConnect: false,
  auth: storedToken ? { playerToken: storedToken } : {},
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
  timeout: 8000,
});

socket.on('server_ready', ({ playerToken }) => {
  if (!playerToken) {
    return;
  }

  window.localStorage.setItem(TOKEN_KEY, playerToken);
  socket.auth = { ...socket.auth, playerToken };
});

export function clearStoredSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  socket.auth = {};
}
