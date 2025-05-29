import { gridSize } from './grid.js';
import { sendMessage } from './socket.js';

export let combatants = [];
export let turnIndex = 0;

const grid = document.getElementById('grid');
const list = document.getElementById('initiative-list');

export function renderCombatants() {
    grid.querySelectorAll('.combatant').forEach(el => el.remove());

    combatants.forEach((c, idx) => {
        const div = document.createElement('div');
        div.className = 'combatant';
        if (idx === turnIndex) div.classList.add('active-turn');
        div.textContent = c.name;
        div.draggable = true;
        div.dataset.tooltip = `Name: ${c.name}\nHP: ${c.hp}\nAC: ${c.ac}`;
        div.dataset.tooltipShow = 'false';

        div.addEventListener('dragstart', () => {
            div.classList.add('dragging');
            window.draggingCombatant = c;
        });
        div.addEventListener('dragend', () => {
            div.classList.remove('dragging');
            window.draggingCombatant = null;
        });

        attachTooltipHandlers(div);
        div.addEventListener('dblclick', () => {
            document.dispatchEvent(new CustomEvent('combatant:edit', { detail: c }));
        });

        const square = grid.children[c.index];
        if (!square) {
            console.warn(`[Render] Combatant "${c.name}" was out of bounds, moving to index 0.`);
            c.index = 0;
            grid.children[0].appendChild(div);
        } else {
            square.appendChild(div);
        }
        square.appendChild(div);
    });
}

export function renderInitiativeList() {
    list.innerHTML = '';
    combatants
        .slice()
        .sort((a, b) => b.initiative - a.initiative)
        .forEach((c, i) => {
            const li = document.createElement('li');
            li.textContent = `${c.name} (${c.initiative})`;
            if (i === turnIndex) li.style.fontWeight = 'bold';
            list.appendChild(li);
        });
}

export function attachDragHandlers() {
    document.addEventListener('grid:drop', (e) => {
        const square = e.detail.target;
        const combatant = window.draggingCombatant;
        const index = parseInt(square.dataset.index);
        if (combatant && combatant.index !== index) {
            combatant.index = index;
            sendMessage({ type: 'move', name: combatant.name, index });
            renderCombatants();
        }
    });
}

export function attachTooltipHandlers(el) {
    let tooltipTimeout;

    el.addEventListener('mouseenter', () => {
        tooltipTimeout = setTimeout(() => {
            el.dataset.tooltipShow = 'true';
        }, 1000);
    });

    el.addEventListener('mouseleave', () => {
        clearTimeout(tooltipTimeout);
        el.dataset.tooltipShow = 'false';
    });
}