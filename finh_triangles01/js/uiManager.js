
// uiManager.js


import * as DOMElements from './domElements.js';
import { state as appState } from './appState.js';
import * as SelectionManager from './selectionManager.js'; // For button actions
import * as PolygonDrawer from './polygonDrawer.js'; // For button actions
import * as ColorManager from './colorManager.js'; // Import new manager
import { bestGridStroke } from './utils.js';

import * as SVGExporter  from './svgExporter.js';
import { generateInnerShapesSVGString } from './svgExporter.js';
import { generateFullSVGString } from './svgExporter.js';
// helpers ---------------------------------------------------------
function isPxMode () {
    // whatever control you use – adjust selector accordingly
    const sel = document.getElementById('paddingMode');
    return !sel || sel.value === 'px';
  }



/* tiny helper reused by both buttons -------------------- */
function triggerDownload(svgText, fileName) {
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
  
    const a    = document.createElement('a');
    a.href     = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  
    URL.revokeObjectURL(url);
  }

export function getInputValues() {
    return {
        ratioString: DOMElements.aspectRatioSelect.value,
        outerWidth: parseInt(DOMElements.frameWidthInput.value, 10),
        padding: parseFloat(DOMElements.paddingInput.value) || 0,
        numTrianglesVertical: Math.max(1, parseInt(DOMElements.numTrianglesInput.value, 10) || 1),
        gridAlignment: DOMElements.gridAlignmentSelect.value,
        cornerRadius: parseFloat(DOMElements.cornerRadiusSlider.value), // Get 
        frameBgColor: DOMElements.frameBg?.value || '#ffffff',
        paddingMode  : DOMElements.paddingMode.value || 'px',   // NEW
    };
}


export function validateInputs(inputs) {
    if (isNaN(inputs.outerWidth) || inputs.outerWidth <= 0 || inputs.padding < 0) {
        DOMElements.dimensionsInfo.textContent = "Please enter valid positive numbers for width and non-negative for padding.";
        return false;
    }
    const [ratioW, ratioH] = inputs.ratioString.split(':').map(Number);
    if (isNaN(ratioW) || isNaN(ratioH) || ratioW <= 0 || ratioH <= 0) {
        DOMElements.dimensionsInfo.textContent = "Invalid aspect ratio selected.";
        return false;
    }
    return true;
}



export function clearVisualsForError() {
    DOMElements.frameContainer.style.width = '0px';
    DOMElements.frameContainer.style.height = '0px';
    // No innerFrame to clear
    DOMElements.triangularGridContainer.innerHTML = '';
}


export function updateDimensionsDisplay(text) {
    DOMElements.dimensionsInfo.textContent = text;
}

export function appendToDimensionsDisplay(text) {
    DOMElements.dimensionsInfo.textContent += text;
}


import * as ShapeSelection from './shapeSelectionAndModification.js'; // For updateSelectedShapeActionsUI

// import { generateInnerShapesSVGString } from './svgExporter.js'; // Assuming you created svgExporter.js
// Or if you put it in polygonDrawer.js:
// import { generateInnerShapesSVGString } from './polygonDrawer.js'; 

// These should store the actual current outer dimensions of the frameContainer
let currentFrameActualWidth = 300;  // Initialize with a sensible default
let currentFrameActualHeight = 300; // Initialize with a sensible default

export function updateLastValidFrameDimensions(width, height) {
    // Ensure we only update with positive, valid numbers
    if (typeof width === 'number' && width > 0) {
        currentFrameActualWidth = width;
    }
    if (typeof height === 'number' && height > 0) {
        currentFrameActualHeight = height;
    }
    // console.log("UI Manager stored frame dimensions:", currentFrameActualWidth, currentFrameActualHeight);
}

function downloadSVG(svgString, filename = 'inner_shapes.svg') {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a); // Required for Firefox
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}


// --- Helper function for UI state, can be called internally and exported ---
export function updateDrawingActionButtonsVisibility() {
    // Check if currentPolygonPoints exists and has items before checking length
    const isDrawing = appState.currentPolygonPoints && appState.currentPolygonPoints.length > 0;
    if (DOMElements.clearSelectionBtn) {
        DOMElements.clearSelectionBtn.style.display = isDrawing ? 'inline-block' : 'none';
    }
    if (DOMElements.finishPolygonBtn) {
        DOMElements.finishPolygonBtn.style.display = isDrawing ? 'inline-block' : 'none';
    }
}

// --- Main Event Setup ---
export function setupEventListeners(updateCallback) {
    // Standard input listeners
    if (DOMElements.aspectRatioSelect) DOMElements.aspectRatioSelect.addEventListener('change', updateCallback);
    if (DOMElements.frameWidthInput) DOMElements.frameWidthInput.addEventListener('input', updateCallback);
    if (DOMElements.numTrianglesInput) DOMElements.numTrianglesInput.addEventListener('input', updateCallback);
    if (DOMElements.gridAlignmentSelect) DOMElements.gridAlignmentSelect.addEventListener('change', updateCallback);
    

    DOMElements.paddingMode  ?.addEventListener('change', updateCallback); // NEW


    //  DOMElements.frameBg             ?.addEventListener('input',  updateCallback);   // ← NEW




     DOMElements.frameBg .addEventListener('input', () => {
        const hex = DOMElements.frameBg    .value || '#ffffff';
        appState.frameBgColor    = hex;
        appState.gridStrokeColor = bestGridStroke(hex);      // ★ NEW ★
        console.log("changing stroke!", appState.gridStrokeColor)
        
        updateCallback(true);                                // force re-draw
      });



// Padding <input> listener  --------------------------------------
if (DOMElements.paddingInput) {
    DOMElements.paddingInput.addEventListener('input', () => {
      /* 1. store raw UI value (could be px OR ratio) */
      const raw = parseFloat(DOMElements.paddingInput.value) || 0;
  
      /* 2. let the main update pipeline calculate the actual pixel padding
            (FrameCalculator → main.js will copy it into appState.currentPadding) */
      appState.pendingPaddingUIValue = raw;     // *** optional: if you cache it
      updateCallback();                         // runs FrameCalculator …
  
      /* 3. reactively update the corner-radius slider *only* in PX mode */
      if (isPxMode() && !appState.isCornerRadiusManuallySet) {
        const px = appState.currentPadding;     // ≙ real pixels after update
        console.log("real px is: ", px)
        const newR = Math.max(0, px / 2);       // your “half-padding” rule
  
        appState.currentCornerRadius = newR;
        if (DOMElements.cornerRadiusSlider)
          DOMElements.cornerRadiusSlider.value = newR;
        if (DOMElements.cornerRadiusValueDisplay)
          DOMElements.cornerRadiusValueDisplay.textContent =
              `${newR.toFixed(1)} px`;
      }
    });
  } else {
    console.warn('UI: paddingInput not found.');
  }

    // Corner Radius Slider Listener
    if (DOMElements.cornerRadiusSlider && DOMElements.cornerRadiusValueDisplay) {
        DOMElements.cornerRadiusSlider.addEventListener('input', () => {
            const manuallySetRadius = parseFloat(DOMElements.cornerRadiusSlider.value);
            DOMElements.cornerRadiusValueDisplay.textContent = `${manuallySetRadius.toFixed(1)} px`;
            appState.currentCornerRadius = manuallySetRadius;
            appState.isCornerRadiusManuallySet = true;
            updateCallback();
        });
        // Initial display text for corner radius will be set by the 'load' listener
    } else {
        if (!DOMElements.cornerRadiusSlider) console.warn("UI: cornerRadiusSlider not found.");
        if (!DOMElements.cornerRadiusValueDisplay) console.warn("UI: cornerRadiusValueDisplay not found.");
    }
    
    // Color Palette Initialization
    if (ColorManager && ColorManager.initializeColorPalette) {
        ColorManager.initializeColorPalette();
    } else {
        console.error("UI: ColorManager.initializeColorPalette is not available.");
    }
    
    // Drawing Action Buttons (Clear & Finish) Listeners
    if (DOMElements.clearSelectionBtn) {
        DOMElements.clearSelectionBtn.addEventListener('click', () => {
            if (SelectionManager && SelectionManager.clearCurrentSelection) {
                SelectionManager.clearCurrentSelection(); // This will call updateDrawingActionButtonsVisibility
            } else { console.error("UI: SelectionManager.clearCurrentSelection not found for clear button.");}
        });
    } else { console.warn("UI: clearSelectionBtn not found."); }

    if (DOMElements.finishPolygonBtn) {
        DOMElements.finishPolygonBtn.addEventListener('click', () => {
            if (SelectionManager && SelectionManager.finishCurrentPolygon) {
                SelectionManager.finishCurrentPolygon(); // This will call updateDrawingActionButtonsVisibility
            } else { console.error("UI: SelectionManager.finishCurrentPolygon not found for finish button.");}
        });
    } else { console.warn("UI: finishPolygonBtn not found."); }



    // download svg
    if (DOMElements.downloadSvgBtn) {
        DOMElements.downloadSvgBtn.addEventListener('click', () => {
            if (!appState.finishedPolygons || appState.finishedPolygons.length === 0) {
                alert("No shapes to download!");
                return;
            }
            
            // Use the stored actual frame dimensions for the SVG export
            // console.log("Downloading SVG with dimensions:", currentFrameActualWidth, "x", currentFrameActualHeight);
            const svgString = generateInnerShapesSVGString(currentFrameActualWidth, currentFrameActualHeight);
            downloadSVG(svgString, 'inner_shapes.svg'); // Added default filename
        });
    } else {
        console.warn("UI: downloadSvgBtn element not found.");
    }


    /* NEW listener ------------------------------------------------------ */
if (DOMElements.downloadFullSvgBtn) {
    DOMElements.downloadFullSvgBtn.addEventListener('click', () => {
      const w = appState.lastFrameWidth;
      const h = appState.lastFrameHeight;
      const geo = appState.latestGeo;             // set in step 3
  
      if (!geo || geo.error) {
        alert('Grid not ready – draw something first!');
        return;
      }
  
      const svg = generateFullSVGString(w, h, geo);
      downloadSVG(svg, 'grid_and_shapes.svg');
    });
  } else {
    console.warn('UI: downloadFullSvgBtn element not found.');
  }













    // Toggle Outer Polygon Visibility Button Listener
    if (DOMElements.toggleOuterPolygonVisibilityBtn) {
        DOMElements.toggleOuterPolygonVisibilityBtn.textContent = appState.showOuterPolygons ? 'Hide Outer Polygons' : 'Show Outer Polygons';
        DOMElements.toggleOuterPolygonVisibilityBtn.addEventListener('click', () => {
            appState.showOuterPolygons = !appState.showOuterPolygons;
            DOMElements.toggleOuterPolygonVisibilityBtn.textContent = appState.showOuterPolygons ? 'Hide Outer Polygons' : 'Show Outer Polygons';
            
            if (PolygonDrawer && PolygonDrawer.redrawAllSelections) {
                let liveInnerPreview = [];
                if (appState.currentPolygonPoints.length >= 3 && SelectionManager.getCurrentInnerPolygonOffset && PolygonOffset.calculateInsetPolygon && PolygonOffset.getPolygonWindingOrder) {
                    const offset = SelectionManager.getCurrentInnerPolygonOffset();
                    if (offset > 0) {
                        let pointsToOffset = [...appState.currentPolygonPoints];
                        if (PolygonOffset.getPolygonWindingOrder(pointsToOffset) > 0) {
                            pointsToOffset.reverse();
                        }
                        liveInnerPreview = PolygonOffset.calculateInsetPolygon(pointsToOffset, offset);
                    }
                }
              
                + PolygonDrawer.redrawAllSelections(undefined, liveInnerPreview);

            } else {
                console.error("UI: PolygonDrawer.redrawAllSelections not available for outer polygon toggle.");
            }
        });
    } else {
        console.warn("UI: toggleOuterPolygonVisibilityBtn not found.");
    }

    // helper reused by the input-listener -------------------------------
// function isPxMode () {
//     const sel = document.getElementById('paddingMode');   // <select>
//     return !sel || sel.value === 'px';
//   }
  
  // ────────────────────────────────────────────────────────────────────
  //  Initial Setup on Page-Load
  // ────────────────────────────────────────────────────────────────────
  window.addEventListener('load', () => {
  
    /* 1. copy the raw UI value the user sees ------------------------- */
    const rawPad = parseFloat(DOMElements.paddingInput?.value) || 0;
    appState.pendingPaddingUIValue = rawPad;      // <- optional cache
  
    /* 2. run the normal pipeline once – this computes                *
     *    · frame size  · triangle geometry  · pixel-padding          */
    updateCallback(true);                           // forces snap-point pass
  
    /* 3. set corner-radius only in PX mode (and only if user didn’t   *
     *    already touch the slider)                                    */
    if (isPxMode() && !appState.isCornerRadiusManuallySet) {
      const px   = appState.currentPadding;         // now a real pixel value
      const newR = Math.max(0, px / 2);             // your old “½-padding” rule
  
      appState.currentCornerRadius = newR;
      if (DOMElements.cornerRadiusSlider)
        DOMElements.cornerRadiusSlider.value = newR;
      if (DOMElements.cornerRadiusValueDisplay)
        DOMElements.cornerRadiusValueDisplay.textContent =
            `${newR.toFixed(1)} px`;
    }
  
    /* 4. overlay should accept clicks right away -------------------- */
    DOMElements.selectionOverlay &&
      (DOMElements.selectionOverlay.style.pointerEvents = 'auto');
  
    /* 5. buttons / palette / toggle text ---------------------------- */
    updateDrawingActionButtonsVisibility();
    ShapeSelection.updateSelectedShapeActionsUI?.();
    if (DOMElements.toggleOuterPolygonVisibilityBtn) {
      DOMElements.toggleOuterPolygonVisibilityBtn.textContent =
        appState.showOuterPolygons ? 'Hide Outer Polygons' : 'Show Outer Polygons';
    }
  });
  
  
    // // --- Initial Setup on Page Load ---
    // window.addEventListener('load', () => {
    //     // 1. Set initial padding in appState from DOM input's default value
    //     if (DOMElements.paddingInput) {
    //         appState.currentPadding = parseFloat(DOMElements.paddingInput.value) || 0;
    //     } else {
    //         appState.currentPadding = appState.currentPadding || 0; 
    //     }

    //     // 2. Set initial corner radius
    //     if (!appState.isCornerRadiusManuallySet) {
    //         appState.currentCornerRadius = Math.max(0, appState.currentPadding / 2);
    //     } // else it keeps its default or a value potentially set by tests/other init
    //     if (DOMElements.cornerRadiusSlider) DOMElements.cornerRadiusSlider.value = appState.currentCornerRadius;
    //     if (DOMElements.cornerRadiusValueDisplay) DOMElements.cornerRadiusValueDisplay.textContent = `${appState.currentCornerRadius.toFixed(1)} px`;
        
    //     // 3. Initial setup for selection overlay (always 'auto' if drawing is always on)
    //     if (DOMElements.selectionOverlay) {
    //         DOMElements.selectionOverlay.style.pointerEvents = 'auto';
    //     } else {
    //         console.error("UI: DOMElements.selectionOverlay NOT FOUND for load setup!");
    //     }

    //     // 4. Initial visibility for drawing action buttons
    //     updateDrawingActionButtonsVisibility(); // Call the function directly
        
    //     // 5. Initial state for selected shape actions UI
    //     appState.selectedIndex = -1;
    //     if (ShapeSelection && ShapeSelection.updateSelectedShapeActionsUI) {
    //         ShapeSelection.updateSelectedShapeActionsUI();
    //     }
        
    //     // 6. Update text for toggleOuterPolygonVisibilityBtn on load
    //     if (DOMElements.toggleOuterPolygonVisibilityBtn) {
    //         DOMElements.toggleOuterPolygonVisibilityBtn.textContent = appState.showOuterPolygons ? 'Hide Outer Polygons' : 'Show Outer Polygons';
    //     }
        
    //     // 7. Initial full draw of the application
    //     updateCallback(true); // Force snap point calculation on initial load
    // });



}


// MAKE SURE 'export' IS PRESENT HERE
export function getMousePositionInFrameForSelection(event) {
    if (!DOMElements.frameContainer) return { x: 0, y: 0 };
    const rect = DOMElements.frameContainer.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}
