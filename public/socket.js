export let socket;
export const clientId = crypto.randomUUID();
const messageQueue = [];

const MAX_RETRIES = 5;
let retryCount = 0;
let reconnectDelay = 1000;

function connectWebSocket() {
  socket = new WebSocket(
    `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`
  );

  socket.addEventListener('open', () => {
    console.log('[WebSocket] Connected');
    retryCount = 0;
    reconnectDelay = 1000;

    while (messageQueue.length > 0) {
      const msg = messageQueue.shift();
      socket.send(JSON.stringify(msg));
    }
  });

  socket.addEventListener('message', async (event) => {
    let text;
    if (event.data instanceof Blob) {
      text = await event.data.text();
    } else {
      text = event.data;
    }

    const msg = JSON.parse(text);
    console.log('[WebSocket] Message received:', msg);
    if (msg.clientId && msg.clientId === clientId) return;

    document.dispatchEvent(new CustomEvent(`ws:${msg.type}`, { detail: msg }));
  });

  socket.addEventListener('close', () => {
    console.warn('[WebSocket] Disconnected');
    attemptReconnect();
  });

  socket.addEventListener('error', (e) => {
    console.error('[WebSocket] Error:', e);
    socket.close();
  });
}

function attemptReconnect() {
  if (retryCount >= MAX_RETRIES) return;

  retryCount++;
  setTimeout(() => {
    connectWebSocket();
    reconnectDelay *= 2;
  }, reconnectDelay);
}

export function sendMessage(message) {
  if (typeof message !== 'object') return;

  const fullMessage = { ...message, clientId };
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(fullMessage));
  } else {
    messageQueue.push(fullMessage);
  }
}

export function initializeSocketHandlers() {
  connectWebSocket();
}