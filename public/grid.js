import { renderCombatants } from './combatants.js';

const grid = document.getElementById('grid');
const gridWidthInput = document.getElementById('grid-width');
const gridHeightInput = document.getElementById('grid-height');
const distanceDisplay = document.getElementById('distance-display');
export let gridSize = 15;

export function initGrid(width, height) {
  gridSize = width;
  grid.style.gridTemplateColumns = `repeat(${width}, 60px)`;
  grid.style.gridTemplateRows = `repeat(${height}, 60px)`;
  grid.innerHTML = '';

  for (let i = 0; i < width * height; i++) {
    const square = document.createElement('div');
    square.dataset.index = i;
    square.passable = true;
    square.addEventListener('click', () => {
      square.passable = !square.passable;
      square.classList.toggle('impassable', !square.passable);
    });
    square.addEventListener('dragover', (e) => {
      if (square.passable) e.preventDefault();
    });
    square.addEventListener('drop', (e) => {
      document.dispatchEvent(new CustomEvent('grid:drop', {
        detail: { event: e, target: square }
      }));
    });
    grid.appendChild(square);
  }
}

export function resizeGrid(width, height) {
  initGrid(width, height);
  const map = document.querySelector('.map-layer');
  if (map) {
    map.style.width = `${width * 60}px`;
    map.style.height = `${height * 60}px`;
  }
  renderCombatants();
}

export function attachResizeHandler() {
  document.getElementById('resize-grid').addEventListener('click', () => {
    const width = parseInt(gridWidthInput.value, 10);
    const height = parseInt(gridHeightInput.value, 10);
    if (!isNaN(width) && !isNaN(height)) {
      resizeGrid(width, height);
    }
  });
}

export function updateDistance(startIndex, e) {
  const target = document.elementFromPoint(e.clientX, e.clientY);
  const endSquare = target?.closest('.battle-grid > div');
  if (!endSquare) return;

  const endIndex = [...grid.children].indexOf(endSquare);
  const dx = Math.abs((endIndex % gridSize) - (startIndex % gridSize));
  const dy = Math.abs(Math.floor(endIndex / gridSize) - Math.floor(startIndex / gridSize));
  const distance = dx + dy;

  distanceDisplay.textContent = `Distance: ${distance}`;
}