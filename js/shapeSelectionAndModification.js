// shapeSelectionAndModification.js
import { state as appState } from './appState.js';
import * as DOMElements from './domElements.js';
import * as PolygonDrawer from './polygonDrawer.js';
import * as UIManager from './uiManager.js'; // For getMousePositionInFrameForSelection

// --- Point-in-Polygon Test (Ray Casting Algorithm) ---
// ... (isPointInPolygon function remains the same) ...
function isPointInPolygon(p, polygon) {
    if (!polygon || polygon.length < 3) return false;
    let isInside = false;
    let minX = polygon[0].x, maxX = polygon[0].x;
    let minY = polygon[0].y, maxY = polygon[0].y;
    for (let n = 1; n < polygon.length; n++) {
        minX = Math.min(minX, polygon[n].x);
        maxX = Math.max(maxX, polygon[n].x);
        minY = Math.min(minY, polygon[n].y);
        maxY = Math.max(maxY, polygon[n].y);
    }
    if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) return false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        if (((polygon[i].y > p.y) !== (polygon[j].y > p.y)) &&
            (p.x < (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
            isInside = !isInside;
        }
    }
    return isInside;
}


function handleShapeDoubleClick(event) {
  

    const mousePos = UIManager.getMousePositionInFrameForSelection(event);
    let clickedPolygonIndex = -1;

    for (let i = appState.finishedPolygons.length - 1; i >= 0; i--) {
        const polyData = appState.finishedPolygons[i];
        if (polyData.outer && isPointInPolygon(mousePos, polyData.outer)) {
            clickedPolygonIndex = i;
            break;
        }
    }
    
    if (appState.selectedIndex === clickedPolygonIndex && clickedPolygonIndex !== -1) {
        // Double-clicked the ALREADY selected shape: Deselect it.
        appState.selectedIndex = -1;
        // console.log("Shape deselected by double-clicking it again.");
    } else {
        // Clicked a new shape or empty space.
        appState.selectedIndex = clickedPolygonIndex; // Select new or deselect if clicked empty space
        // console.log("Shape selected/deselected. New index:", appState.selectedIndex);
    }
    
    updateSelectedShapeActionsUI();
    PolygonDrawer.redrawAllSelections();
}

function handleDeleteKeyPress(event) {
    // Check if focus is on an input field, if so, don't delete shape
    if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
        return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && appState.selectedIndex !== -1) {
        // console.log("Delete key pressed for selected shape.");
        event.preventDefault(); // Prevent browser back navigation on Backspace if not in input
        deleteSelectedShape();
    }
}

function deleteSelectedShape() {
    if (appState.selectedIndex !== -1) {
        appState.finishedPolygons.splice(appState.selectedIndex, 1);
        appState.selectedIndex = -1; // Deselect
        updateSelectedShapeActionsUI();
        PolygonDrawer.redrawAllSelections();
        // console.log("Shape deleted.");
    }
}

export function initializeShapeSelection(/* updateAppCallback is not strictly needed here anymore */) {
    DOMElements.frameContainer.addEventListener('dblclick', handleShapeDoubleClick);
    
    // Global keydown listener for Delete key
    document.addEventListener('keydown', handleDeleteKeyPress);

    // Remove event listeners for the old buttons if they were previously attached here
    // DOMElements.deleteSelectedShapeBtn no longer needs a listener here if the button is removed
    // DOMElements.deselectShapeBtn no longer needs a listener here if the button is removed
    
    // Initial UI state for action buttons
    updateSelectedShapeActionsUI();
}

export function updateSelectedShapeActionsUI() {
    if (DOMElements.selectedShapeActionsContainer) {
        const showActions = appState.selectedIndex !== -1;
        DOMElements.selectedShapeActionsContainer.style.display = showActions ? 'flex' : 'none'; // Use flex for better layout
        if (showActions) {
            // If you still have the "Delete" button in UI and want it to work:
            if (DOMElements.deleteSelectedShapeBtn) { // Check if element exists
                 // DOMElements.deleteSelectedShapeBtn.onclick = deleteSelectedShape; // Or add event listener
            }
            // "Deselect" button is also removed based on new requirements
        }
    }
}