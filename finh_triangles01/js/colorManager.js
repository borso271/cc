// colorManager.js
import * as DOMElements from './domElements.js';
import { state as appState } from './appState.js';
import * as PolygonDrawer from './polygonDrawer.js'; // We'll need to trigger a redraw

export function initializeColorPalette(/* updateAppCallback might not be needed here directly for this change */) {
    if (DOMElements.addColorBtn && DOMElements.colorInput) {
        DOMElements.addColorBtn.addEventListener('click', () => {
            const newColor = DOMElements.colorInput.value.trim();
            if (isValidHexColor(newColor) && !appState.availableColors.includes(newColor)) {
                appState.availableColors.push(newColor);
                // If a shape is selected, don't change activeColor, let user click swatch to apply
                // If no shape selected, then make new color active for new shapes
                if (appState.selectedIndex === -1) {
                    appState.activeColor = newColor;
                }
                renderColorPalette();
                // If a shape IS selected, clicking "Add Color" could also immediately apply it,
                // but that might be unexpected. Current behavior: add to palette, user then clicks swatch.
            } else if (!isValidHexColor(newColor)) {
                alert("Invalid hex color format. Please use #RRGGBB or #RGB.");
            } else { // Color already exists
                if (appState.selectedIndex !== -1) {
                    // A shape is selected, apply this existing color to it
                    appState.finishedPolygons[appState.selectedIndex].color = newColor;
                    appState.activeColor = newColor; // Also update active color for consistency
                    PolygonDrawer.redrawAllSelections();
                } else {
                    // No shape selected, just make this color active for new shapes
                    appState.activeColor = newColor;
                }
                renderColorPalette(); // Update selection highlight on palette
            }
            DOMElements.colorInput.value = getRandomHexColor();
        });
    }
    renderColorPalette(); // Initial render
    if (DOMElements.colorInput) DOMElements.colorInput.value = getRandomHexColor();
}

export function renderColorPalette() {
    if (!DOMElements.colorPaletteContainer) return;
    DOMElements.colorPaletteContainer.innerHTML = '';

    appState.availableColors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.classList.add('color-swatch');
        swatch.style.backgroundColor = color;
        swatch.dataset.color = color;

        // Highlight if it's the active color FOR NEW SHAPES,
        // OR if it's the color of the currently SELECTED SHAPE
        let isSwatchSelected = false;
        if (appState.selectedIndex !== -1) { // A shape is selected
            if (appState.finishedPolygons[appState.selectedIndex] && appState.finishedPolygons[appState.selectedIndex].color === color) {
                isSwatchSelected = true;
            }
        } else { // No shape is selected, highlight based on activeColor for new shapes
            if (color === appState.activeColor) {
                isSwatchSelected = true;
            }
        }
        if (isSwatchSelected) {
            swatch.classList.add('selected');
        }


        swatch.addEventListener('click', () => {
            if (appState.selectedIndex !== -1) {
                // A shape is selected, apply this swatch's color to it
                if (appState.finishedPolygons[appState.selectedIndex]) {
                    appState.finishedPolygons[appState.selectedIndex].color = color;
                    appState.activeColor = color; // Also update the general active color
                    PolygonDrawer.redrawAllSelections(); // Redraw canvas to show color change
                    renderColorPalette(); // Re-render palette to update swatch selection
                }
            } else {
                // No shape is selected, this click just sets the activeColor for NEW shapes
                appState.activeColor = color;
                renderColorPalette(); // Re-render palette to update swatch selection
            }
        });
        DOMElements.colorPaletteContainer.appendChild(swatch);
    });
}


function isValidHexColor(hex) {
    return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
}

function getRandomHexColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}