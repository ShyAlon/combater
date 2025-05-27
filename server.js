const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let currentMap = null;
let combatants = [];
let turnIndex = 0;

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
        const msg = JSON.parse(message);

        if (msg.type === 'map-upload') {
            currentMap = msg; // full map object
            broadcast(ws, message); // send to others
        } else if (msg.type === 'get-map' && currentMap) {
            ws.send(JSON.stringify(currentMap));
        } else if (msg.type === 'add') {
            combatants.push(msg.combatant);
            broadcast(ws, message);
        } else if (msg.type === 'bulk-add') {
            combatants.push(...msg.combatants);
            broadcast(ws, message);
        } else if (msg.type === 'delete') {
            combatants = combatants.filter(c => c.name !== msg.name);
            broadcast(ws, message);
        } else if (msg.type === 'move') {
            const c = combatants.find(c => c.name === msg.name);
            if (c) c.index = msg.index;
            broadcast(ws, message);
        } else if (msg.type === 'get-combatants') {
            ws.send(JSON.stringify({ type: 'combatants-sync', combatants }));
        } else if (msg.type === 'next-turn') {
            turnIndex = msg.index;
            broadcast(ws, JSON.stringify({ type: 'turn-update', index: turnIndex }));
        } else if (msg.type === 'get-turn') {
            ws.send(JSON.stringify({ type: 'turn-update', index: turnIndex }));
        }
        else {
            console.log('[WebSocket] Message received:', message.toString());
            broadcast(ws, message);
        }
    });

    ws.on('close', () => {
        console.log('[WebSocket] Client disconnected');
    });
});

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});