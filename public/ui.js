import { combatants, renderCombatants, renderInitiativeList } from './combatants.js';
import { resizeGrid } from './grid.js';
import { sendMessage } from './socket.js';

const dialog = document.getElementById('combatant-dialog');
const form = document.getElementById('combatant-form');
const addBtn = document.getElementById('add-combatant-btn');
const removeBtn = document.getElementById('remove-combatant-btn');
const duplicateBtn = document.getElementById('duplicate-combatant-btn');

const mapUpload = document.getElementById('map-upload');
const mapWidthInput = document.getElementById('map-width');
const mapHeightInput = document.getElementById('map-height');
const setMapBtn = document.getElementById('set-map');

let editingCombatant = null;
let mapImage = null;

export function setupCombatantDialog() {
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        if (editingCombatant) {
            editingCombatant.name = form.name.value;
            editingCombatant.hp = +form.hp.value;
            editingCombatant.ac = +form.ac.value;
            editingCombatant.initiative = +form.initiative.value;
        } else {
            const count = parseInt(form.count.value, 10);
            if (isNaN(count) || count <= 0) return;

            const newCombatants = [];
            for (let i = 0; i < count; i++) {
                const name = count > 1 ? `${form.name.value} ${i + 1}` : form.name.value;
                const c = {
                    name,
                    hp: +form.hp.value,
                    ac: +form.ac.value,
                    initiative: +form.initiative.value,
                    index: Math.floor(Math.random() * grid.children.length),
                };
                combatants.push(c);
                newCombatants.push(c);
            }

            if (newCombatants.length === 1) {
                sendMessage({ type: 'add', combatant: newCombatants[0] });
            } else {
                sendMessage({ type: 'bulk-add', combatants: newCombatants });
            }
        }

        editingCombatant = null;
        dialog.close();
        renderCombatants();
        renderInitiativeList();
    });

    removeBtn.addEventListener('click', () => {
        if (!editingCombatant) return;
        const index = combatants.indexOf(editingCombatant);
        if (index !== -1) {
            combatants.splice(index, 1);
            sendMessage({ type: 'delete', name: editingCombatant.name });
        }
        dialog.close();
        renderCombatants();
        renderInitiativeList();
    });

    duplicateBtn.addEventListener('click', () => {
        if (!editingCombatant) return;
        const clone = { ...editingCombatant };
        clone.name += ' Copy';
        combatants.push(clone);
        sendMessage({ type: 'add', combatant: clone });
        dialog.close();
        renderCombatants();
        renderInitiativeList();
    });

    document.addEventListener('combatant:edit', (e) => {
        editingCombatant = e.detail;
        form.name.value = editingCombatant.name;
        form.hp.value = editingCombatant.hp;
        form.ac.value = editingCombatant.ac;
        form.initiative.value = editingCombatant.initiative;
        removeBtn.style.display = 'inline-block';
        duplicateBtn.style.display = 'inline-block';
        dialog.showModal();
    });
}

export function setupAddCombatantButton() {
    addBtn.addEventListener('click', () => {
        editingCombatant = null;
        form.name.value = '';
        form.hp.value = 10;
        form.ac.value = 10;
        form.initiative.value = 10;
        removeBtn.style.display = 'none';
        duplicateBtn.style.display = 'none';
        dialog.showModal();
    });
}

export function setupMapUpload() {
    setMapBtn.addEventListener('click', () => {
        const file = mapUpload.files[0];
        const width = parseInt(mapWidthInput.value, 10);
        const height = parseInt(mapHeightInput.value, 10);
        if (!file || isNaN(width) || isNaN(height)) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            if (mapImage) mapImage.remove();
            mapImage = document.createElement('img');
            mapImage.src = e.target.result;
            mapImage.className = 'map-layer';
            mapImage.style.width = `${width * 60}px`;
            mapImage.style.height = `${height * 60}px`;

            document.getElementById('map-layer-container').appendChild(mapImage);
            sendMessage({ type: 'map-upload', image: e.target.result, width, height });
        };
        reader.readAsDataURL(file);
    });
}

export function setupContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    let contextTarget = null;

    grid.addEventListener('contextmenu', (e) => {
        const square = e.target.closest('.battle-grid > div');
        if (!square) return;
        e.preventDefault();
        contextTarget = square;
        contextMenu.style.top = `${e.clientY}px`;
        contextMenu.style.left = `${e.clientX}px`;
        contextMenu.style.display = 'block';
    });

    contextMenu.addEventListener('click', (e) => {
        if (!contextTarget) return;
        const action = e.target.dataset.action;
        const index = parseInt(contextTarget.dataset.index);

        if (action === 'clear-aoe') {
            document.querySelectorAll('.battle-grid > div.aoe').forEach(cell => cell.classList.remove('aoe'));
        } else if (action?.startsWith('aoe')) {
            document.dispatchEvent(new CustomEvent('aoe:mark', { detail: { index, type: action } }));
        }

        contextMenu.style.display = 'none';
    });

    document.addEventListener('click', () => {
        contextMenu.style.display = 'none';
    });
}