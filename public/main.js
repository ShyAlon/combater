import { initGrid, resizeGrid, attachResizeHandler } from './grid.js';
import { renderCombatants, renderInitiativeList, attachDragHandlers } from './combatants.js';
import { setupCombatantDialog, setupAddCombatantButton } from './ui.js';
import { setupMapUpload } from './ui.js';
import { setupContextMenu } from './ui.js';
import { socket, sendMessage, initializeSocketHandlers } from './socket.js';

const gridElement = document.getElementById('grid');

window.addEventListener('DOMContentLoaded', () => {
  initGrid(15, 15); // Default 15x15 grid

  attachDragHandlers();
  attachResizeHandler();
  setupCombatantDialog();
  setupAddCombatantButton();
  setupMapUpload();
  setupContextMenu();
  initializeSocketHandlers();

  // Initial sync
  sendMessage({ type: 'get-map' });
  sendMessage({ type: 'get-turn' });
  sendMessage({ type: 'get-combatants' });

  // Turn button
  document.getElementById('next-turn').addEventListener('click', () => {
    window.turnIndex = (window.turnIndex + 1) % window.combatants.length;
    renderCombatants();
    renderInitiativeList();
    sendMessage({ type: 'next-turn', index: window.turnIndex });
  });
});