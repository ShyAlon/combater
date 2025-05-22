const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));

// Broadcast to all except sender
function broadcast(sender, data) {
    wss.clients.forEach(client => {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

wss.on('connection', ws => {
    console.log('[WebSocket] Client connected');

    ws.on('message', message => {
        console.log('[WebSocket] Message received:', message.toString());
        broadcast(ws, message);
    });

    ws.on('close', () => {
        console.log('[WebSocket] Client disconnected');
    });
});

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});