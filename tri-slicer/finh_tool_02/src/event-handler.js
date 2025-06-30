
 // src/event-handler.js

import { store } from './core/store.js';
import * as DOM from './core/dom-elements.js'; // Use the DOM registry
import { placeFrame } from './modules/grid/grid-interactions.js';

export function initGlobalEventListeners() {
    // --- Global Listeners ---
    document.addEventListener('keydown', e => {
        if (!(e.key === 'Delete' || e.key === 'Backspace')) return;
        const t = e.target;
        if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t.isContentEditable) return;
        store.deleteSelected();
    });

    // --- Sidebar Listener (using Event Delegation) ---
    DOM.sidebar.addEventListener('input', handleSidebarInput);
    DOM.sidebar.addEventListener('click', handleSidebarClick);

    // DOM.padIn.oninput = radIn.oninput = () => { clearSliceCache(); drawFullGrid(); };
}

function handleSidebarInput(e) {
    const target = e.target;

    // Handle the density slider input
    if (target.id === 'densityRange') {
        const newDensity = parseFloat(target.value);
        store.set({ density: newDensity });

        // Update the visual feedback label next to the slider
        const densityVal = DOM.sidebar.querySelector('#densityVal');
        if (densityVal) {
            densityVal.textContent = `${newDensity.toFixed(1)}×`;
        }
    }
    
    // You could also handle the frame width/height inputs here
    if (target.id === 'wMult') {
        // ... logic to call syncFromW and commit ...
    }
    if (target.id === 'hMult') {
        // ... logic to call syncFromH and commit ...
    }
}

function handleSidebarClick(e) {
    const target = e.target;

    // Handle frame placement buttons
    if (target.dataset.v) {
        placeFrame(target.dataset.v, null);
    }
    if (target.dataset.h) {
        placeFrame(null, target.dataset.h);
    }

   // --- ADD THIS LOGIC ---
    // Handle clear/reset buttons
    if (target.id === 'resetBtn') {
        store.resetAll(); // Call the new store method
    }
    
    // Example for a future 'Clear path' button
    if (target.id === 'clearBtn') {
        // You would create a store.clearCurrentPath() method for this
    }
}