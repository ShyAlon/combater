const grid = document.getElementById('grid');
const initiativeList = document.getElementById('initiative-list');
const nextTurnBtn = document.getElementById('next-turn');
const dialog = document.getElementById('combatant-dialog');
const form = document.getElementById('edit-form');
const closeDialogBtn = document.getElementById('close-dialog');
const contextMenu = document.getElementById('context-menu');
const distanceDisplay = document.getElementById('distance-display');
const addBtn = document.getElementById('add-combatant-btn');
const removeBtn = document.getElementById('remove-combatant-btn');
const duplicateBtn = document.getElementById('duplicate-combatant-btn');
const mapUpload = document.getElementById('map-upload');
const mapWidthInput = document.getElementById('map-width');
const mapHeightInput = document.getElementById('map-height');
const setMapBtn = document.getElementById('set-map');


const clientId = crypto.randomUUID();  // Modern, reliable
let mapImage = null;
let turnIndex = 0;
let draggedElement = null;
let startIndex = null;
let contextTarget = null;
let editingCombatant = null;

let combatants = [
    { name: "Fighter", initiative: 18, hp: 30, ac: 16 },
    { name: "Goblin", initiative: 12, hp: 7, ac: 13 }
];

const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
const socket = new WebSocket(`${protocol}//${location.host}`);

function sendMessage(message) {
    const fullMessage = { ...message, clientId };
    socket.send(JSON.stringify(fullMessage));
    console.log('[WebSocket Send]', fullMessage);
}

socket.addEventListener('open', () => {
    sendMessage(({ type: 'get-map' }));
    sendMessage(({ type: 'get-combatants' }));
    sendMessage(({ type: 'get-turn' }));
});

socket.onmessage = async event => {
    let text;

    if (event.data instanceof Blob) {
        text = await event.data.text(); // works for Blob
    } else {
        text = event.data; // already a string
    }
    const msg = JSON.parse(text);
    console.log('[Sync] Received', msg);

    if (msg.clientId && msg.clientId === clientId) {
        console.log('[Sync] Ignoring own message');
        return; // Ignore own messages
    }

    if (msg.type === 'move') {
        const c = combatants.find(x => x.name === msg.name);
        if (c) {
            c.index = msg.index;
            renderCombatants();
        }
    } else if (msg.type === 'add') {
        combatants.push(msg.combatant);
        renderCombatants();
        renderInitiativeList();
    } else if (msg.type === 'bulk-add') {
        msg.combatants.forEach(c => {
            combatants.push(c);
        });
        renderCombatants();
        renderInitiativeList();
    } else if (msg.type === 'delete') {
        const index = combatants.findIndex(c => c.name === msg.name);
        if (index !== -1) {
            combatants.splice(index, 1);
            renderCombatants();
            renderInitiativeList();
        }
    } else if (msg.type === 'map-upload') {
        if (mapImage) mapImage.remove();

        mapImage = document.createElement('img');
        mapImage.src = msg.image;
        mapImage.className = 'map-layer';
        mapImage.style.width = `${msg.width * 60}px`;
        mapImage.style.height = `${msg.height * 60}px`;

        document.querySelector('.battle-grid').prepend(mapImage);
    } else if (msg.type === 'combatants-sync') {
        combatants = msg.combatants;
        renderCombatants();
        renderInitiativeList();
    } else if (msg.type === 'turn-update') {
        turnIndex = msg.index;
        renderCombatants();
        renderInitiativeList();
    }
};

// Build grid
const gridSize = 15;
const totalCells = gridSize * gridSize;
for (let i = 0; i < totalCells; i++) {
    const square = document.createElement('div');
    square.dataset.index = i;
    square.passable = true;
    square.addEventListener('click', () => {
        square.passable = !square.passable;
        square.classList.toggle('impassable', !square.passable);
    });

    square.addEventListener('dragover', e => {
        if (square.passable) e.preventDefault(); // Allow drop regardless of fog
    });

    square.addEventListener('drop', onDrop);
    grid.appendChild(square);
}

function renderCombatants() {
    grid.querySelectorAll('.combatant').forEach(el => el.remove());

    combatants.forEach((c, idx) => {
        const div = document.createElement('div');
        div.className = 'combatant';

        // Highlight active turn
        if (idx === turnIndex) {
            div.classList.add('active-turn');
        }

        div.textContent = c.name;
        div.setAttribute('data-tooltip', `Name: ${c.name}\nHP: ${c.hp}\nAC: ${c.ac}`);
        div.draggable = true;
        div.addEventListener('dragstart', onDragStart);
        div.addEventListener('dblclick', () => openEditDialog(c));
        attachCombatantTooltip(div);
        // attachCombatantTooltip?.(div, c); // optional if you're using it

        if (typeof c.index !== 'number') c.index = Math.floor(Math.random() * grid.children.length);
        grid.children[c.index].appendChild(div);
    });
}

function attachCombatantTooltip(el) {
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

function renderInitiativeList() {
    initiativeList.innerHTML = '';
    combatants.sort((a, b) => b.initiative - a.initiative);
    combatants.forEach((c, idx) => {
        const li = document.createElement('li');
        li.textContent = `${c.name} (Init: ${c.initiative})`;
        if (idx === turnIndex) li.classList.add('active');
        initiativeList.appendChild(li);
    });
}

function onDragStart(e) {
    draggedElement = e.target;
    draggedElement.classList.add('dragging');

    const square = draggedElement.parentElement;
    startIndex = [...grid.children].indexOf(square);
    console.log('[Drag Start] Combatant:', draggedElement.textContent, 'From Index:', startIndex);

    distanceDisplay.style.display = 'block';
    document.addEventListener('dragover', updateDistance);

    document.addEventListener('dragend', () => {
        distanceDisplay.style.display = 'none';
        document.removeEventListener('dragover', updateDistance);

        if (draggedElement) draggedElement.classList.remove('dragging');
        draggedElement = null;
        console.log('[Drag End]');
    }, { once: true });
}

function onDrop(e) {
    e.preventDefault();

    const dropTarget = e.currentTarget;
    const isOccupied = dropTarget.querySelector('.combatant');
    const index = [...grid.children].indexOf(dropTarget);

    console.log('[Drop] Attempting to drop at index:', index);
    console.log(' - Passable:', dropTarget.passable);
    console.log(' - Is Occupied:', !!isOccupied);
    console.log(' - Dragged Element:', draggedElement ? draggedElement.textContent : 'None');

    if (!draggedElement) {
        console.warn(' - Drop failed: No dragged element');
        return;
    }

    if (!dropTarget.passable) {
        console.warn(' - Drop failed: Target not passable');
        return;
    }

    if (isOccupied) {
        console.warn(' - Drop failed: Target already has a combatant');
        return;
    }

    // Append to new square
    dropTarget.appendChild(draggedElement);
    console.log(' - Drop success: Combatant placed');

    // Update model
    const combatant = combatants.find(c => c.name === draggedElement.textContent);
    if (combatant) {
        combatant.index = index;
        sendMessage(({ type: 'move', name: combatant.name, index }));
        console.log(' - Combatant index updated:', combatant);
    } else {
        console.warn(' - Combatant model not found');
    }
}

function updateDistance(e) {
    const target = document.elementFromPoint(e.clientX, e.clientY);
    const endSquare = target.closest('.battle-grid > div');
    if (!endSquare) return;

    const endIndex = [...grid.children].indexOf(endSquare);
    const dx = Math.abs((endIndex % gridSize) - (startIndex % gridSize));
    const dy = Math.abs(Math.floor(endIndex / gridSize) - Math.floor(startIndex / gridSize));
    const distance = dx + dy;

    distanceDisplay.textContent = `Distance: ${distance}`;
}

nextTurnBtn.addEventListener('click', () => {
    turnIndex = (turnIndex + 1) % combatants.length;
    renderCombatants();
    renderInitiativeList();
    sendMessage(({ type: 'next-turn', index: turnIndex }));
});


function openEditDialog(c) {
    editingCombatant = c;
    form.name.value = c.name;
    form.hp.value = c.hp;
    form.ac.value = c.ac;
    form.initiative.value = c.initiative;
    dialog.style.display = 'block';
    removeBtn.style.display = 'inline-block';
    duplicateBtn.style.display = 'inline-block';
}

form.addEventListener('submit', (e) => {
    e.preventDefault();

    if (editingCombatant) {
        // Update existing combatant
        editingCombatant.name = form.name.value;
        editingCombatant.hp = +form.hp.value;
        editingCombatant.ac = +form.ac.value;
        editingCombatant.initiative = +form.initiative.value;
    } else {
        const count = parseInt(prompt("How many combatants to add?", "1"), 10);
        if (isNaN(count) || count <= 0) return;

        const newCombatants = [];
        for (let i = 0; i < count; i++) {
            const name = count > 1 ? `${form.name.value} ${i + 1}` : form.name.value;
            const combatant = {
                name,
                hp: +form.hp.value,
                ac: +form.ac.value,
                initiative: +form.initiative.value,
                index: Math.floor(Math.random() * grid.children.length),
            };
            combatants.push(combatant);
            newCombatants.push(combatant);
        }

        if (newCombatants.length === 1) {
            sendMessage({ type: 'add', combatant: newCombatants[0] });
        } else {
            sendMessage({ type: 'bulk-add', combatants: newCombatants });
        }
    }

    editingCombatant = null;
    dialog.style.display = 'none';
    renderCombatants();
    renderInitiativeList();
});

closeDialogBtn.addEventListener('click', () => {
    dialog.style.display = 'none';
});

grid.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    const square = e.target.closest('.battle-grid > div');
    if (!square) return;

    contextTarget = square;
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top = `${e.pageY}px`;
    contextMenu.style.display = 'block';
});

document.addEventListener('click', (e) => {
    contextMenu.style.display = 'none';

    // Clear AoE if clicked outside menu or grid context
    if (!e.target.closest('#context-menu')) {
        clearAllAoE();
    }
});

setMapBtn.addEventListener('click', () => {
    const file = mapUpload.files[0];
    if (!file) return alert('Please select an image.');

    const widthTiles = parseInt(mapWidthInput.value, 10);
    const heightTiles = parseInt(mapHeightInput.value, 10);
    if (isNaN(widthTiles) || isNaN(heightTiles)) {
        return alert('Please enter map dimensions.');
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        if (mapImage) mapImage.remove(); // remove previous map if any

        mapImage = document.createElement('img');
        mapImage.src = e.target.result;
        mapImage.className = 'map-layer';
        mapImage.style.width = `${widthTiles * 60}px`;
        mapImage.style.height = `${heightTiles * 60}px`;

        document.querySelector('.battle-grid').prepend(mapImage);

        sendMessage(({
            type: 'map-upload',
            image: e.target.result,
            width: widthTiles,
            height: heightTiles
        }));
    };
    reader.readAsDataURL(file);
});

contextMenu.addEventListener('click', (e) => {
    if (!contextTarget) return;
    const action = e.target.dataset.action;

    if (action === 'toggle-aoe') {
        toggleAoESquare(contextTarget);
    }

    if (action === 'aoe-square') {
        toggleAoESquare(contextTarget);
    }

    if (action === 'aoe-line') {
        toggleAoELine(contextTarget);
    }

    if (action === 'aoe-cone') {
        toggleAoECone(contextTarget);
    }

    contextMenu.style.display = 'none';
});

function toggleAoESquare(square) {
    const index = parseInt(square.dataset.index);
    const x = index % gridSize;
    const y = Math.floor(index / gridSize);

    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
                const ni = ny * gridSize + nx;
                grid.children[ni].classList.toggle('aoe');
            }
        }
    }
}

function toggleAoELine(square) {
    const index = parseInt(square.dataset.index);
    const x = index % gridSize;
    const y = Math.floor(index / gridSize);

    for (let i = 1; i <= 5; i++) {
        if (x + i < gridSize) {
            const ni = y * gridSize + (x + i);
            grid.children[ni].classList.toggle('aoe');
        }
    }
}

function toggleAoECone(square) {
    const index = parseInt(square.dataset.index);
    const x = index % gridSize;
    const y = Math.floor(index / gridSize);

    const conePattern = [
        [0, 1],
        [-1, 2], [0, 2], [1, 2]
    ];

    conePattern.forEach(([dx, dy]) => {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
            const ni = ny * gridSize + nx;
            grid.children[ni].classList.toggle('aoe');
        }
    });
}

function toggleAoE(square) {
    const index = parseInt(square.dataset.index);
    const x = index % 10;
    const y = Math.floor(index / 10);

    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
                const ni = ny * 10 + nx;
                const cell = grid.children[ni];
                cell.classList.toggle('aoe');
            }
        }
    }
}

addBtn.addEventListener('click', () => {
    editingCombatant = null;
    form.name.value = '';
    form.hp.value = 10;
    form.ac.value = 10;
    form.initiative.value = 10;
    removeBtn.style.display = 'none';
    duplicateBtn.style.display = 'none';
    dialog.style.display = 'block';
});

removeBtn.addEventListener('click', () => {
    if (!editingCombatant) return;

    const index = combatants.indexOf(editingCombatant);
    if (index !== -1) {
        const deletedName = editingCombatant.name;
        combatants.splice(index, 1);

        sendMessage(({ type: 'delete', name: deletedName }));
    }

    dialog.style.display = 'none';
    renderCombatants();
    renderInitiativeList();
});

duplicateBtn.addEventListener('click', () => {
    if (!editingCombatant) return;

    const baseName = editingCombatant.name;
    let counter = 2;
    let newName = `${baseName} ${counter}`;

    // Ensure name uniqueness
    while (combatants.some(c => c.name === newName)) {
        counter++;
        newName = `${baseName} ${counter}`;
    }

    const duplicate = {
        name: newName,
        hp: editingCombatant.hp,
        ac: editingCombatant.ac,
        initiative: editingCombatant.initiative,
        index: Math.floor(Math.random() * grid.children.length),
    };

    combatants.push(duplicate);
    dialog.style.display = 'none';
    renderCombatants();
    renderInitiativeList();
});

function clearAllAoE() {
    document.querySelectorAll('.battle-grid > div.aoe').forEach(cell =>
        cell.classList.remove('aoe')
    );
}

const gridWidthInput = document.getElementById('grid-width');
const gridHeightInput = document.getElementById('grid-height');
const resizeBtn = document.getElementById('resize-grid');

resizeBtn.addEventListener('click', () => {
    const width = parseInt(gridWidthInput.value, 10);
    const height = parseInt(gridHeightInput.value, 10);
    if (isNaN(width) || isNaN(height)) return;

    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${width}, 60px)`;
    grid.style.gridTemplateRows = `repeat(${height}, 60px)`;
    gridSize = width;

    for (let i = 0; i < width * height; i++) {
        const square = document.createElement('div');
        square.dataset.index = i;
        square.passable = true;
        square.addEventListener('click', () => {
            square.passable = !square.passable;
            square.classList.toggle('impassable', !square.passable);
        });
        square.addEventListener('dragover', e => {
            if (square.passable) e.preventDefault();
        });
        square.addEventListener('drop', onDrop);
        grid.appendChild(square);
    }

    if (mapImage) {
        mapImage.style.width = `${width * 60}px`;
        mapImage.style.height = `${height * 60}px`;
    }

    renderCombatants();
});

renderCombatants();
renderInitiativeList();