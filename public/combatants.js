import { grid } from './grid.js';
import { sendMessage } from './socket.js';

export const combatants = [];
export let turnIndex = 0;

export function setTurnIndex(index) {
  turnIndex = index;
  renderCombatants();
  renderInitiativeList();
}

export function renderCombatants() {
  [...grid.children].forEach(cell => {
    const existing = cell.querySelector('.combatant');
    if (existing) cell.removeChild(existing);
  });

  combatants.forEach((c, idx) => {
    const div = document.createElement('div');
    div.className = 'combatant';
    div.textContent = c.name;
    div.draggable = true;

    if (idx === turnIndex) div.classList.add('active-turn');

    div.dataset.index = idx;

    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('combatantIndex', idx);
    });

    const square = grid.children[c.index];
    if (square) square.appendChild(div);
  });
}

export function renderInitiativeList() {
  const list = document.getElementById('initiative-list');
  list.innerHTML = '';

  combatants.forEach((c, i) => {
    const li = document.createElement('li');
    li.textContent = `${c.name} (${c.initiative})`;
    if (i === turnIndex) li.style.fontWeight = 'bold';
    list.appendChild(li);
  });
}

// Drop handler (called from main or grid)
export function moveCombatant(combatantIndex, newSquareIndex) {
  const c = combatants[combatantIndex];
  if (c) {
    c.index = newSquareIndex;
    renderCombatants();
    sendMessage({ type: 'move-combatant', index: combatantIndex, to: newSquareIndex });
  }
}