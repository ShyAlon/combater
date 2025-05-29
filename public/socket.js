export const socket = new WebSocket(
  `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`
);

export const clientId = crypto.randomUUID();

export function sendMessage(message) {
  if (typeof message !== 'object') {
    console.error('[WebSocket Send Error] Expected object, got:', message);
    return;
  }
  const fullMessage = { ...message, clientId };
  socket.send(JSON.stringify(fullMessage));
  console.log('[WebSocket Send]', fullMessage);
}

export function initializeSocketHandlers() {
  socket.addEventListener('open', () => {
    console.log('[WebSocket] Connected');
  });

  socket.addEventListener('message', async (event) => {
    let text;
    if (event.data instanceof Blob) {
      text = await event.data.text();
    } else {
      text = event.data;
    }

    const msg = JSON.parse(text);
    if (msg.clientId && msg.clientId === clientId) return;

    console.log('[WebSocket Receive]', msg);

    document.dispatchEvent(new CustomEvent(`ws:${msg.type}`, { detail: msg }));
  });
}