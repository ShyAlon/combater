import { sendMessage, initializeSocketHandlers } from './socket.js';
import {
  combatants,
  renderCombatants,
  renderInitiativeList,
  setTurnIndex,
  turnIndex,
  moveCombatant
} from './combatants.js';

import { grid, initGrid } from './grid.js';

import { setupAddCombatantButton, setupCombatantDialog, setupMapUpload, setupContextMenu } from './ui.js';


document.addEventListener('DOMContentLoaded', () => {
  initializeSocketHandlers();
  renderCombatants();
  renderInitiativeList();
  setupAddCombatantButton();
  setupCombatantDialog();
  setupMapUpload();
  setupContextMenu();
  initGrid(15, 15); // Initialize grid with default size
  sendMessage({ type: 'get-combatants' });

  // Advance turn button
  document.getElementById('next-turn').addEventListener('click', () => {
    if (!combatants.length) return;

    const currentIndex = turnIndex;
    const nextIndex = (currentIndex + 1) % combatants.length;

    sendMessage({
      type: 'next-turn',
      index: nextIndex
    });

    setTurnIndex(nextIndex);
  });

  document.getElementById('add-combatant').addEventListener('click', () => {
    const dialog = document.getElementById('combatant-dialog');
    dialog.dataset.mode = 'add';
    dialog.querySelector('form').reset();
    dialog.showModal();
  });

  // Resize grid
  document.getElementById('resize-grid').addEventListener('click', () => {
    const w = parseInt(document.getElementById('grid-width').value, 10);
    const h = parseInt(document.getElementById('grid-height').value, 10);
    if (isNaN(w) || isNaN(h) || w < 8 || w > 25 || h < 8 || h > 25) {
      alert("Grid size must be between 8 and 25.");
      return;
    }

    sendMessage({ type: 'resize-grid', width: w, height: h });
  });

  // Upload map
  document.getElementById('set-map').addEventListener('click', () => {
    const file = document.getElementById('map-upload').files[0];
    const w = parseInt(document.getElementById('map-width').value, 10);
    const h = parseInt(document.getElementById('map-height').value, 10);

    if (!file || isNaN(w) || isNaN(h) || w < 8 || w > 25 || h < 8 || h > 25) {
      alert("Map dimensions must be between 8 and 25.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      sendMessage({
        type: 'set-map',
        dataUrl: reader.result,
        width: w,
        height: h,
      });
    };
    reader.readAsDataURL(file);
  });

  // Drag & drop setup on each grid square
  [...grid.children].forEach((square, idx) => {
    square.addEventListener('dragover', e => {
      e.preventDefault(); // Always allow dropping
    });

    square.addEventListener('drop', e => {
      const i = parseInt(e.dataTransfer.getData('combatantIndex'), 10);
      moveCombatant(i, idx);
    });
  });
});

// Handle turn update from server
document.addEventListener('ws:turn-update', (e) => {
  const { index } = e.detail;
  setTurnIndex(index);
});

// Handle combatant move sync from server
document.addEventListener('ws:move-combatant', (e) => {
  const { index, to } = e.detail;
  if (combatants[index]) {
    combatants[index].index = to;
    renderCombatants();
  }
});

document.addEventListener('ws:combatants-sync', e => {
  const { combatants: synced } = e.detail;
  combatants.splice(0, combatants.length, ...synced); // keep original reference
  renderCombatants();
  renderInitiativeList();
});

document.addEventListener('ws:add', e => {
  const { combatant } = e.detail;
  combatants.push(combatant);
  renderCombatants();
  renderInitiativeList();
});

document.addEventListener('ws:bulk-add', e => {
  const { combatants: newOnes } = e.detail;
  combatants.push(...newOnes);
  renderCombatants();
  renderInitiativeList();
});

document.addEventListener('ws:edit', e => {
  const { index, combatant } = e.detail;
  if (combatants[index]) {
    combatants[index] = combatant;
    renderCombatants();
    renderInitiativeList();
  }
});

document.addEventListener('ws:delete', e => {
  const { index } = e.detail;
  if (combatants[index]) {
    combatants.splice(index, 1);
    renderCombatants();
    renderInitiativeList();
  }
});