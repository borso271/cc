// script.js

// --- Global Variables and DOM Elements ---
const imageUpload = document.getElementById('imageUpload');
const addRegionBtn = document.getElementById('addRegionBtn');
const deleteRegionBtn = document.getElementById('deleteRegionBtn');
const filterSelect = document.getElementById('filterSelect'); // For active region
const filterParamsContainer = document.getElementById('filterParamsContainer');
const regionWidthInput = document.getElementById('regionWidthInput');   // Renamed
const regionHeightInput = document.getElementById('regionHeightInput'); // Renamed
const imageContainer = document.getElementById('imageContainer');
const displayCanvas = document.getElementById('displayCanvas');
const displayCtx = displayCanvas.getContext('2d', { willReadFrequently: true });
const originalCanvas = document.getElementById('originalCanvas');
const originalCtx = originalCanvas.getContext('2d', { willReadFrequently: true });




// --- At the top with other global DOM element variables ---
const regionColorPaletteUI = document.getElementById('regionColorPalette');


// --- NEW: Populate Color Palette Function ---
function populateColorPalette() {
    if (!regionColorPaletteUI) return; // Safety check
    regionColorPaletteUI.innerHTML = ''; // Clear existing swatches if any

    REGION_COLORS.forEach(color => {
        const swatch = document.createElement('div');
        swatch.classList.add('color-swatch');
        swatch.style.backgroundColor = color;
        swatch.dataset.color = color; // Store the color value
        swatch.title = `Set region color to ${color}`; // Tooltip

        swatch.addEventListener('click', () => {
            if (activeRegionId) {
                const activeRegion = filterRegions.find(r => r.id === activeRegionId);
                if (activeRegion) {
                    activeRegion.color = color; // Update the region object
                    // applyRegionColorToDOM(activeRegion.domElement, color); // Update the DOM element's style

                    applyRegionColor(activeRegion.wrapperElement, color); // NEW

                    updateSelectedSwatchUI(color); // Update which swatch is marked as selected
                }
            }
        });
        regionColorPaletteUI.appendChild(swatch);
    });
}


// --- Define Available Region Colors (place this with other global constants/variables) ---
const REGION_COLORS = [
    'white',
    '#007bff', // Bootstrap Primary Blue (example, pick your preferred default set)
    '#28a745', // Green
    '#dc3545', // Red
    '#ffc107', // Yellow
    '#17a2b8', // Info Cyan
    '#6f42c1', // Purple
    '#DF73FF', // heliotrope
   
    '#fd7e14', // Orange
    '#6c757d'  // Gray

];
const DEFAULT_REGION_COLOR = REGION_COLORS[0]; // The first color is the 


export let originalImage = null;
const availableFilters = {}; // Loaded filter definitions

// --- Core Data Structures for Multi-Region ---
let filterRegions = []; // Array to store all filter region objects
let activeRegionId = null; // ID of the currently selected region for editing
let regionCounter = 0; // To generate unique region IDs
let highestZIndex = 10; // To manage stacking


const activeRegionControlsUI = document.getElementById('activeRegionControls'); // New DOM element
const welcomeMessage = document.getElementById('welcomeMessage');


// --- Filter Loading (Mostly the same) ---
async function loadFilters() {
    const filterFiles = [
        './filters/invertColors.js',
        './filters/pixiAscii.js',
        './filters/pixiDotScreen.js',
        './filters/pixiEmboss.js',
        './filters/pixiPixelate.js',
        './filters/pixiCTR.js',
        './filters/pixiOldFilm.js',
        './filters/adaptiveStringAscii.js', // <-- ADD THIS LINE
        // './filters/customGridAscii.js', // <-- ADD THIS LINE

    ];
    for (const filePath of filterFiles) {
        try {
            const module = await import(filePath);
            const filterDef = module.default;
            if (filterDef && filterDef.id && filterDef.name && typeof filterDef.apply === 'function') {
                availableFilters[filterDef.id] = filterDef;
                const option = document.createElement('option');
                option.value = filterDef.id;
                option.textContent = filterDef.name;
                filterSelect.appendChild(option);
            } // else console.warn(...)
        } catch (error) { console.error(`Error loading filter from ${filePath}:`, error); }
    }
}

let isDraggingRegion = false;
let isResizingRegion = false; // We'll use this to differentiate action
let dragActionType = null; // 'move' or 'resize'
let dragStartX, dragStartY;
let initialRegionX, initialRegionY;
let initialRegionWidth, initialRegionHeight;


function createFilterRegionElement(region) {
    const wrapperDiv = document.createElement('div'); // NEW outer wrapper
    wrapperDiv.classList.add('filter-region-wrapper');
    wrapperDiv.style.left = `${region.x}px`;
    wrapperDiv.style.top = `${region.y}px`;
    wrapperDiv.style.width = `${region.width}px`;
    wrapperDiv.style.height = `${region.height}px`;
    wrapperDiv.style.zIndex = region.zIndex;
    // The --region-visual-color will be set on this wrapper by applyRegionColor

    const regionDiv = document.createElement('div'); // This is YOUR EXISTING .filter-region
    regionDiv.id = region.id;
    regionDiv.classList.add('filter-region');
    regionDiv.style.width = '100%'; // Takes full size of wrapper
    regionDiv.style.height = '100%';
    // applyRegionColor will handle its border via the CSS var on the wrapper

    // Attach mousedown for DRAG/RESIZE to the INNER (.filter-region) div
    regionDiv.addEventListener('mousedown', (e) => {
        if (e.button !== 0 || !originalImage) return;

        const clickedRegion = filterRegions.find(r => r.id === region.id);
        if (!clickedRegion) return; // Should be 'region' from closure
        
        setActiveRegion(region.id); // Make sure it's active

        dragStartX = e.clientX;
        dragStartY = e.clientY;

        const rect = regionDiv.getBoundingClientRect(); // Interaction is with regionDiv
        const borderThreshold = 10;
        const isNearRightBorder = e.clientX >= rect.right - borderThreshold && e.clientX <= rect.right + borderThreshold;
        const isNearBottomBorder = e.clientY >= rect.bottom - borderThreshold && e.clientY <= rect.bottom + borderThreshold;

        // Resize only if the region is active
        if (isNearRightBorder && isNearBottomBorder && regionDiv.classList.contains('active')) {
            dragActionType = 'resize';
            isResizingRegion = true;
            initialRegionWidth = clickedRegion.width;  // Use 'clickedRegion' which is from filterRegions array
            initialRegionHeight = clickedRegion.height;
            regionDiv.style.cursor = 'nwse-resize';
        } else {
            dragActionType = 'move';
            isDraggingRegion = true;
            initialRegionX = clickedRegion.x;
            initialRegionY = clickedRegion.y;
            regionDiv.style.cursor = 'grabbing';
        }
        document.addEventListener('mousemove', handleDocumentMouseMove);
        document.addEventListener('mouseup', handleDocumentMouseUp);
        e.preventDefault();
        e.stopPropagation();
    });

    wrapperDiv.appendChild(regionDiv);
    imageContainer.appendChild(wrapperDiv);

    // Return the INNER div (.filter-region) because that's the primary element
    // your existing logic refers to as region.domElement and passes to filters.
    return regionDiv;
}



function applyRegionColor(wrapperElement, color) { // Removed contentElement argument
    if (wrapperElement) {
        wrapperElement.style.setProperty('--region-visual-color', color);
        // Debug logs from before are still useful here if needed
        console.log(`Applying color to wrapper:`, wrapperElement);
        console.log(`  --region-visual-color set to:`, color);
        const currentVarValue = getComputedStyle(wrapperElement).getPropertyValue('--region-visual-color').trim();
        console.log(`  Computed --region-visual-color on wrapper:`, currentVarValue);
    }
}

// --- Ensure calls to applyRegionColor are updated ---

// In addFilterRegion():
// applyRegionColor(newRegion.wrapperElement, newRegion.domElement, newRegion.color); // OLD

// In populateColorPalette() click listener:
// applyRegionColorToDOM(activeRegion.domElement, color); // This was an old function name
// applyRegionColor(activeRegion.wrapperElement, activeRegion.domElement, color); // OLD
// applyRegionColor(activeRegion.wrapperElement, color); // NEW

// In renderAllRegions():
// applyRegionColor(region.wrapperElement, region.domElement, region.color); // OLD
// applyRegionColor(region.wrapperElement, region.color); // NEW


// --- NEW: Apply Color to DOM Element ---
function applyRegionColorToDOM(regionDiv, color) {
    if (!regionDiv) return;
    // For now, just setting the border color. Ribbon will use a CSS variable later.
    regionDiv.style.borderColor = color;

    // This is for the ribbon style we'll add later via CSS ::before
    // It won't do anything visible until that CSS is in place.
    regionDiv.style.setProperty('--region-border-color', color);
}

// --- NEW: Update Selected Swatch in UI ---
function updateSelectedSwatchUI(selectedColor) {
    if (!regionColorPaletteUI) return;
    const swatches = regionColorPaletteUI.querySelectorAll('.color-swatch');
    swatches.forEach(sw => {
        if (sw.dataset.color === selectedColor) {
            sw.classList.add('selected');
        } else {
            sw.classList.remove('selected');
        }
    });
}

// --- Modify `addFilterRegion()` ---
function addFilterRegion() {
    if (!originalImage) {
        alert("Please upload an image first.");
        return;
    }
    regionCounter++;
    const newRegionId = `region-${regionCounter}`;
    highestZIndex++;

    const defaultWidth = parseInt(regionWidthInput.value) || 100;
    const defaultHeight = parseInt(regionHeightInput.value) || 100;
    const initialX = Math.max(0, (displayCanvas.width / 2) - (defaultWidth / 2));
    const initialY = Math.max(0, (displayCanvas.height / 2) - (defaultHeight / 2));

    const newRegion = {
        id: newRegionId,
        x: initialX,
        y: initialY,
        width: defaultWidth,
        height: defaultHeight,
        filterId: 'none',
        filterParams: {},
        filterState: null,
        domElement: null,      // This will be the inner .filter-region div
        wrapperElement: null,  // This will be the outer .filter-region-wrapper
        zIndex: highestZIndex,
        color: DEFAULT_REGION_COLOR
    };

    newRegion.domElement = createFilterRegionElement(newRegion); // Returns inner div
    newRegion.wrapperElement = newRegion.domElement.parentElement; // Get the wrapper

    // Apply initial color to both wrapper (for ::before) and content (for border via CSS var)
    // applyRegionColor(newRegion.wrapperElement, newRegion.domElement, newRegion.color);
    applyRegionColor(newRegion.wrapperElement, newRegion.color); // NEW

    filterRegions.push(newRegion);
    setActiveRegion(newRegionId); // This will also handle 'active' class on wrapper
    renderAllRegions();
}











function setActiveRegion(regionId) {
    // Deactivate previous
    if (activeRegionId) {
        const oldActiveRegion = filterRegions.find(r => r.id === activeRegionId);
        if (oldActiveRegion) {
            if (oldActiveRegion.domElement) oldActiveRegion.domElement.classList.remove('active');
            if (oldActiveRegion.wrapperElement) {
                oldActiveRegion.wrapperElement.classList.remove('active-wrapper');
                // Reset z-index of the wrapper for non-active state
                oldActiveRegion.wrapperElement.style.zIndex = oldActiveRegion.zIndex;
            }
        }
    }

    activeRegionId = regionId;

    if (activeRegionId) {
        const activeRegion = filterRegions.find(r => r.id === activeRegionId);
        if (activeRegion) {
            if (activeRegion.domElement) activeRegion.domElement.classList.add('active');
            if (activeRegion.wrapperElement) {
                activeRegion.wrapperElement.classList.add('active-wrapper');
                highestZIndex++;
                // activeRegion.zIndex = highestZIndex; // zIndex should be on the wrapper
                activeRegion.wrapperElement.style.zIndex = highestZIndex;
            }
            // ... (update UI controls: filterSelect, inputs, deleteBtn) ...
            activeRegionControlsUI.style.display = 'block';
            filterSelect.disabled = false;
            regionWidthInput.disabled = false;
            regionHeightInput.disabled = false;
            deleteRegionBtn.disabled = false;

            filterSelect.value = activeRegion.filterId;
            regionWidthInput.value = activeRegion.width;
            regionHeightInput.value = activeRegion.height;

            updateSelectedSwatchUI(activeRegion.color);
            generateFilterParamsUI(activeRegion.filterId, activeRegion); // Pass inner .filter-region
        }
    } else {
        // ... (disable UI controls) ...
        activeRegionControlsUI.style.display = 'none';
        filterParamsContainer.innerHTML = '';
        deleteRegionBtn.disabled = true;
        filterSelect.disabled = true;
        regionWidthInput.disabled = true;
        regionHeightInput.disabled = true;
        updateSelectedSwatchUI(null);
    }
}



function deleteActiveRegion() {
    if (!activeRegionId) return;

    const regionIndex = filterRegions.findIndex(r => r.id === activeRegionId);
    if (regionIndex > -1) {
        const regionToDelete = filterRegions[regionIndex];

        // Cleanup filter state (call destroy)
        if (regionToDelete.filterId !== 'none' && availableFilters[regionToDelete.filterId]) {
            const filterDef = availableFilters[regionToDelete.filterId];
            if (typeof filterDef.destroy === 'function') {
                // Pass the region's domElement as the outputElement for destroy context
                filterDef.destroy(regionToDelete.domElement, regionToDelete.filterState);
            }
        }

        // Remove DOM element
        if (regionToDelete.domElement) {
            regionToDelete.domElement.remove();
        }

        filterRegions.splice(regionIndex, 1);
        setActiveRegion(null); // Deactivate
        renderAllRegions();
    }
}

// --- Generate UI for Active Region's Filter Parameters ---
// MODIFIED to take activeRegion to pre-fill params and update specific region
function generateFilterParamsUI(filterId, activeRegion) {
    filterParamsContainer.innerHTML = '';
    // currentFilterParams = {}; // This will be specific to the activeRegion now

    const filterDef = availableFilters[filterId];
    if (!filterDef || !activeRegion) { // No UI if no filter or no active region
        if(activeRegion && filterId === 'none') {
            // If filter is "none", ensure no params UI and filterState is cleared
            if (typeof availableFilters[activeRegion.filterId]?.destroy === 'function' && activeRegion.filterId !== 'none') {
                availableFilters[activeRegion.filterId].destroy(activeRegion.domElement, activeRegion.filterState);
            }
            activeRegion.filterId = 'none';
            activeRegion.filterParams = {};
            activeRegion.filterState = null;
        }
        renderAllRegions(); // Re-render if filter changed to none
        return;
    }


    // Call INIT for the filter IF it's a new filter for this region or state is missing
    if (activeRegion.filterId !== filterId || !activeRegion.filterState) {
        // First, destroy previous filter state if changing filters
        if (activeRegion.filterId !== 'none' && activeRegion.filterId !== filterId && availableFilters[activeRegion.filterId]) {
            const oldFilterDef = availableFilters[activeRegion.filterId];
            if (typeof oldFilterDef.destroy === 'function') {
                oldFilterDef.destroy(activeRegion.domElement, activeRegion.filterState);
            }
        }
        activeRegion.filterState = null; // Clear old state

        if (typeof filterDef.init === 'function') {
            const initialOptionsForInit = {}; // Build from param defaults or current activeRegion.filterParams
            if (filterDef.params) {
                filterDef.params.forEach(p => {
                    initialOptionsForInit[p.id] = activeRegion.filterParams[p.id] !== undefined
                        ? activeRegion.filterParams[p.id]
                        : (p.type === 'select' && typeof p.defaultValue === 'boolean' ? String(p.defaultValue) : p.defaultValue);
                });
            }
            activeRegion.filterState = filterDef.init(activeRegion.domElement, activeRegion.width, activeRegion.height, initialOptionsForInit) || null;
            // Note: filterDef.init might return the state (e.g., pixiApp) or just true/false.
            // We store whatever it returns (or null) in filterState.
            // PixiJS filters should return their app instance from init if they want it stored.
            // For now, our Pixi filters manage pixiApp internally. This needs refinement.
            // Let's assume for now init sets up state within the filter module itself using its module-level vars.
        }
        activeRegion.filterId = filterId; // Update region's filterId
        if (!filterDef.params) activeRegion.filterParams = {}; // Reset params if new filter has no params
    }


    if (filterDef.params) {
        const paramsTitle = document.createElement('h4');
        paramsTitle.textContent = `${filterDef.name} Parameters:`;
        filterParamsContainer.appendChild(paramsTitle);

        filterDef.params.forEach(param => {
            const paramWrapper = document.createElement('div'); /* ... */
            const label = document.createElement('label'); /* ... */
            paramWrapper.classList.add('param-control');
            label.htmlFor = `param-${activeRegion.id}-${param.id}`;
            label.textContent = `${param.name}: `;
            paramWrapper.appendChild(label);


            let input;
            // Use current region's param value or the filter's default
            let currentValue = activeRegion.filterParams[param.id] !== undefined
                ? activeRegion.filterParams[param.id]
                : param.defaultValue;

            if (param.type === 'range' || param.type === 'number') {
                input = document.createElement('input');
                input.type = param.type;
                input.value = currentValue;
                activeRegion.filterParams[param.id] = parseFloat(currentValue); // Ensure numeric
                if (param.min !== undefined) input.min = param.min;
                if (param.max !== undefined) input.max = param.max;
                if (param.step !== undefined) input.step = param.step;
                paramWrapper.appendChild(input);

                if (param.type === 'range') {
                    const valueSpan = document.createElement('span');
                    valueSpan.textContent = ` (${currentValue})`;
                    paramWrapper.appendChild(valueSpan);
                    input.addEventListener('input', (e) => valueSpan.textContent = ` (${e.target.value})`);
                }
            } else if (param.type === 'select') {
                input = document.createElement('select');
                const selectValue = typeof currentValue === 'boolean' ? String(currentValue) : currentValue;
                activeRegion.filterParams[param.id] = currentValue; // Store actual type

                (param.options || []).forEach(opt => {
                    const optionEl = document.createElement('option');
                    optionEl.value = opt.value;
                    optionEl.textContent = opt.label;
                    if (opt.value === selectValue) optionEl.selected = true;
                    input.appendChild(optionEl);
                });
                paramWrapper.appendChild(input);
            }

            if (input) {
                input.id = `param-${activeRegion.id}-${param.id}`;
                input.name = param.id;
                const eventType = (param.type === 'range' || param.type === 'select') ? 'input' : 'change';
                input.addEventListener(eventType, (e) => {
                    if (!activeRegionId) return;
                    const region = filterRegions.find(r => r.id === activeRegionId);
                    if (!region) return;

                    let value = e.target.value;
                    if (param.type === 'number' || param.type === 'range') {
                        value = parseFloat(value);
                    } else if (param.type === 'select' && (value === 'true' || value === 'false')) {
                        value = (value === 'true');
                    }
                    region.filterParams[param.id] = value;
                    renderAllRegions();
                });
            }
            filterParamsContainer.appendChild(paramWrapper);
        });
    }
    renderAllRegions(); // Re-render after params UI is built or filter changes
}









// // --- Main Rendering Loop ---
// function renderAllRegions() {
//     if (!originalImage) return;

//     // 1. Draw the original image to the display canvas
//     displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height); // Clear previous frame
//     displayCtx.drawImage(originalImage, 0, 0);

//     // 2. Sort regions by z-index for correct overlap rendering
//     const sortedRegions = [...filterRegions].sort((a, b) => a.zIndex - b.zIndex);

//     // 3. Apply filter for each region
//     sortedRegions.forEach(region => {
//         if (region.filterId === 'none' || !availableFilters[region.filterId]) {
//             // If filter is 'none', the region div is just a visual box.
//             // If it's a PixiJS filter, its domElement (the region div) will contain the Pixi canvas.
//             // For simple ImageData filters, we draw onto displayCtx.
//             // So, if filter is 'none', ensure its domElement is empty (if it previously held a Pixi canvas)
//             if (region.domElement.hasChildNodes() && availableFilters[region.filterIdBeforeNone]?.init) {
//                  // Heuristic: if it had an init function, it might have a canvas child
//                  region.domElement.innerHTML = '';
//             }
//             region.domElement.style.backgroundColor = 'rgba(0, 0, 255, 0.05)'; // Reset visual
//             return; // Skip actual filtering for "none"
//         }

//         const filterDef = availableFilters[region.filterId];
//         const { x, y, width, height } = region;

//         if (x + width > originalCanvas.width || y + height > originalCanvas.height || width <= 0 || height <= 0) {
//             console.warn(`Region ${region.id} out of bounds or invalid size for rendering.`);
//             return;
//         }
        
//         // applyRegionColor(region.wrapperElement, region.domElement, region.color);

//         applyRegionColor(region.wrapperElement, region.color); // NEW


//         const imageData = originalCtx.getImageData(x, y, width, height);

//         // Call the filter's apply function
//         // The filter's 'apply' function is responsible for its output
//         // It's passed its own DOM element (region.domElement) to render into if needed
//         const result = filterDef.apply(imageData, region.domElement, width, height, region.filterParams, region.filterState);

//         // Process result ONLY if the filter is NOT an init/destroy type managing its own DOM
//         if (typeof filterDef.init !== 'function') { // Simple filters
//             if (result instanceof ImageData) {
//                 // Ensure region.domElement is clear if it's a simple filter drawing on main canvas
//                 region.domElement.innerHTML = ''; 
//                 region.domElement.style.backgroundColor = 'rgba(0,0,0,0)'; // Transparent, effect is on canvas
//                 displayCtx.putImageData(result, x, y);
//             } else if (typeof result === 'string') {
//                 // For ASCII in a simple filter, it goes into region.domElement


//                 // ascii background
//                 // region.domElement.style.backgroundColor = 'rgba(255, 255, 255, 0.85)';

//                 const charWidth = 0.6; const charHeight = 1; /* ... font sizing ... */
//                 const lines = result.split('\n').length;
//                 const maxLineLength = result.split('\n').reduce((max, l) => Math.max(max, l.length),0);
//                 const fontSize = Math.min(16, width / (maxLineLength * charWidth), height / (lines * charHeight * 0.7));
//                 region.domElement.innerHTML = `<pre style="font-size:${fontSize}px; line-height:${fontSize*0.9}px;">${result}</pre>`;
//             }
//         }
  
//     });
// }


// script.js










// script.js

// --- Main Rendering Loop ---
function renderAllRegions() {
    if (!originalImage) return;

    displayCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    displayCtx.drawImage(originalImage, 0, 0);

    const sortedRegions = [...filterRegions].sort((a, b) => {
        const zA = parseInt(a.wrapperElement?.style.zIndex || '0'); // Use wrapper for z-index
        const zB = parseInt(b.wrapperElement?.style.zIndex || '0');
        return zA - zB;
    });

    sortedRegions.forEach(region => {
        if (!region.domElement || !region.wrapperElement) {
            console.warn(`Region ${region.id} is missing DOM elements, skipping render.`);
            return;
        }
        applyRegionColor(region.wrapperElement, region.color);

        if (region.filterId === 'none' || !availableFilters[region.filterId]) {
            if (region.domElement.innerHTML !== '') {
                region.domElement.innerHTML = ''; // Clear content if filter is 'none'
            }
            return;
        }

        const filterDef = availableFilters[region.filterId];
        const { x, y, width, height } = region; // These are region's logical screen dimensions

        const ix = Math.max(0, Math.floor(x));
        const iy = Math.max(0, Math.floor(y));
        const iw = Math.min(Math.floor(width), originalCanvas.width - ix);
        const ih = Math.min(Math.floor(height), originalCanvas.height - iy);

        if (iw <= 0 || ih <= 0) {
            if (typeof filterDef.init !== 'function' && region.domElement) {
                region.domElement.innerHTML = '';
            }
            return;
        }
        
        const imageData = originalCtx.getImageData(ix, iy, iw, ih);
        // outputContainer is region.domElement (the inner div, which has overflow:hidden)
        const outputContainer = region.domElement; 

        const result = filterDef.apply(imageData, outputContainer, iw, ih, region.filterParams, region.filterState);

        if (typeof filterDef.init !== 'function' && result !== null) { // For simple filters like adaptiveStringAscii
            if (result instanceof ImageData) {
                outputContainer.innerHTML = '';
                displayCtx.putImageData(result, ix, iy);
            } else if (typeof result === 'string') {
                // --- REVISED STRING RENDERING FOR FIXED FONT SIZE ---
                const currentParams = region.filterParams || {};
                
                // Get fixed font size from parameters, fallback to a default if not found in definition
                const fontSizeParamDef = filterDef.params.find(p => p.id === 'fontSizeFixed');
                const fixedFontSize = parseFloat(currentParams.fontSizeFixed) || (fontSizeParamDef ? parseFloat(fontSizeParamDef.defaultValue) : 10);

                // Get other relevant params
                const wantsDarkText = (currentParams.invertMap === 'true' || currentParams.invertMap === true);
                const fontFamilyParamDef = filterDef.params.find(p => p.id === 'fontFamily'); // Assuming adaptiveStringAscii has fontFamily param
                const fontFamily = currentParams.fontFamily || (fontFamilyParamDef ? fontFamilyParamDef.defaultValue : 'monospace');

                let effectiveTextColor = wantsDarkText ? 'black' : region.color;
                let effectiveBgColor = wantsDarkText ? region.color : 'rgba(0,0,0,0.85)';

                if (wantsDarkText && (!region.color || region.color.toLowerCase() === 'transparent' || region.color.toLowerCase() === 'black')) {
                    effectiveBgColor = 'white';
                } else if (!wantsDarkText && (!region.color || region.color.toLowerCase() === 'transparent' || region.color.toLowerCase() === 'white')) {
                    effectiveTextColor = 'white';
                }

                // Line height is relative to the fixed font size
                const lineHeight = Math.max(1, Math.floor(fixedFontSize * 0.9)); // Or 0.85 for denser

                // The <pre> tag will now determine its own width/height based on its content and font size.
                // The outputContainer (region.domElement) will clip it with overflow:hidden.
                outputContainer.innerHTML =
                    `<pre style="
                        font-family: '${fontFamily.replace(/'/g, "\\'")}';
                        font-size: ${fixedFontSize}px;
                        line-height: ${lineHeight}px;
                        color: ${effectiveTextColor};
                        background-color: ${effectiveBgColor};
                        margin: 0;
                        padding: 0; 
                        /* NO width:100%; height:100%; -- let it size naturally */
                        /* NO overflow:hidden on <pre> -- parent .filter-region does this */
                        display: inline-block; /* So it takes size of content */
                        text-align: left;
                        white-space: pre;
                        /* To make it slightly overflow to ensure no gaps (optional, use with care) */
                        /* transform: scale(1.02); */ /* Example: make pre 2% bigger */
                        /* transform-origin: top left; */
                    ">${result}</pre>`;
            }
        }
        // If filterDef.init exists (PixiJS, SVG etc.) OR result is null,
        // we assume the filter handled its own output within outputContainer.
    });
}
regionWidthInput.addEventListener('change', () => {
    if (!activeRegionId) return;
    const region = filterRegions.find(r => r.id === activeRegionId);
    if (region) {
        const newWidth = parseInt(regionWidthInput.value);
        if (isNaN(newWidth) || newWidth < 10) {
            regionWidthInput.value = region.width; // Revert if invalid
            return;
        }
        region.width = newWidth;
        region.domElement.style.width = `${region.width}px`;
        // For PixiJS filters, their internal canvas might need resizing.
        // This is best handled if the filter's 'apply' method checks for dimension changes.
        renderAllRegions();
    }
});

regionHeightInput.addEventListener('change', () => {
    if (!activeRegionId) return;
    const region = filterRegions.find(r => r.id === activeRegionId);
    if (region) {
        const newHeight = parseInt(regionHeightInput.value);
        if (isNaN(newHeight) || newHeight < 10) {
            regionHeightInput.value = region.height; // Revert
            return;
        }
        region.height = newHeight;
        region.domElement.style.height = `${region.height}px`;
        renderAllRegions();
    }
});



function handleDocumentMouseMove(e) {
    if (!activeRegionId) return;
    const activeRegion = filterRegions.find(r => r.id === activeRegionId);
    // Ensure both domElement (for content) and wrapperElement (for positioning) exist
    if (!activeRegion || !activeRegion.domElement || !activeRegion.wrapperElement) return;

    const dx = e.clientX - dragStartX;
    const dy = e.clientY - dragStartY;

    if (isDraggingRegion) {
        let newX = initialRegionX + dx;
        let newY = initialRegionY + dy;
        newX = Math.max(0, Math.min(newX, displayCanvas.width - activeRegion.width));
        newY = Math.max(0, Math.min(newY, displayCanvas.height - activeRegion.height));

        activeRegion.x = newX;
        activeRegion.y = newY;
        activeRegion.wrapperElement.style.left = `${newX}px`;
        activeRegion.wrapperElement.style.top = `${newY}px`;
    } else if (isResizingRegion) {
        let newWidth = Math.max(20, initialRegionWidth + dx);
        let newHeight = Math.max(20, initialRegionHeight + dy);
        newWidth = Math.min(newWidth, displayCanvas.width - activeRegion.x);
        newHeight = Math.min(newHeight, displayCanvas.height - activeRegion.y);

        activeRegion.width = newWidth;
        activeRegion.height = newHeight;
        activeRegion.wrapperElement.style.width = `${newWidth}px`;
        activeRegion.wrapperElement.style.height = `${newHeight}px`;
        // The inner .filter-region div (activeRegion.domElement) should adjust due to width/height 100%

        regionWidthInput.value = Math.round(newWidth);
        regionHeightInput.value = Math.round(newHeight);
    }
    renderAllRegions();
}

function handleDocumentMouseUp(e) {
    if (isDraggingRegion || isResizingRegion) {
        if (activeRegionId) {
            const activeRegionEl = document.getElementById(activeRegionId);
            if (activeRegionEl) activeRegionEl.style.cursor = 'grab'; // Reset to default grab for the region
        }
    }

    isDraggingRegion = false;
    isResizingRegion = false;
    dragActionType = null;
    document.removeEventListener('mousemove', handleDocumentMouseMove);
    document.removeEventListener('mouseup', handleDocumentMouseUp);

    // Final render call can be useful
    if (activeRegionId) renderAllRegions();
}

imageUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (originalImage) { URL.revokeObjectURL(originalImage.src); }
            const img = new Image();
            img.onload = () => {
                originalImage = img;
                originalCanvas.width = displayCanvas.width = img.width;
                originalCanvas.height = displayCanvas.height = img.height;
                originalCtx.drawImage(img, 0, 0);
                displayCtx.drawImage(img, 0, 0); // Initial draw

                // --- HIDE WELCOME MESSAGE ---
                if (welcomeMessage) { // Check if the element exists
                    welcomeMessage.classList.add('hidden');
                }
                // --- END HIDE WELCOME MESSAGE ---

                imageContainer.classList.add('has-image');





                // // When new image is loaded, clear all existing regions
                // filterRegions.forEach(region => {
                //     if (region.filterId !== 'none' && availableFilters[region.filterId]) {
                //         const filterDef = availableFilters[region.filterId];
                //         if (typeof filterDef.destroy === 'function') {
                //             filterDef.destroy(region.domElement, region.filterState);
                //         }
                //     }
                //     if (region.domElement) region.domElement.remove();
                // });
                // filterRegions = [];
                // setActiveRegion(null);
                // renderAllRegions();



                // When new image is loaded, clear all existing regions
                filterRegions.forEach(region => {
                    // 1. Cleanup filter-specific resources
                    if (region.filterId !== 'none' && availableFilters[region.filterId]) {
                        const filterDef = availableFilters[region.filterId];
                        if (typeof filterDef.destroy === 'function') {
                            // region.domElement is the inner content div, passed to init/apply/destroy
                            filterDef.destroy(region.domElement, region.filterState);
                        }
                    }

                    // 2. Remove the region's main wrapper DIV from the DOM
                    if (region.wrapperElement && region.wrapperElement.parentNode) {
                        region.wrapperElement.remove();
                    } else if (region.domElement && region.domElement.parentNode === imageContainer) {
                        // Fallback for a structure where domElement was the top-level region div
                        // This might not be needed if wrapperElement is always present for every region.
                        console.warn("Region cleanup: wrapperElement not found, removing domElement directly.", region.id);
                        region.domElement.remove();
                    }
                });
                filterRegions = [];       // Clear the array
                setActiveRegion(null);    // No active region
                renderAllRegions();       // Render just the new image

            };
            img.onerror = () => { /* ... */ };
            img.src = e.target.result;
        };
        reader.onerror = () => { /* ... */ };
        reader.readAsDataURL(file);
    }
});

addRegionBtn.addEventListener('click', addFilterRegion);
deleteRegionBtn.addEventListener('click', deleteActiveRegion);

filterSelect.addEventListener('change', (e) => {
    if (!activeRegionId) return;
    const region = filterRegions.find(r => r.id === activeRegionId);
    if (!region) return;

    const newFilterId = e.target.value;
    // generateFilterParamsUI will handle destroying old filterState and initializing new one
    generateFilterParamsUI(newFilterId, region);
    // Note: generateFilterParamsUI already calls renderAllRegions
});

regionWidthInput.addEventListener('change', () => {
    if (!activeRegionId) return;
    const region = filterRegions.find(r => r.id === activeRegionId);
    if (region) {
        region.width = parseInt(regionWidthInput.value);
        region.domElement.style.width = `${region.width}px`;
        // For PixiJS filters, their internal canvas might need resizing via their 'apply' or a dedicated resize method
        if (availableFilters[region.filterId] && typeof availableFilters[region.filterId].init === 'function') {
            // Re-call apply to force resize within filter if it handles it
            // This is a simplification; a dedicated resize method on filterDef would be better.
        }
        renderAllRegions();
    }
});
regionHeightInput.addEventListener('change', () => {
    if (!activeRegionId) return;
    const region = filterRegions.find(r => r.id === activeRegionId);
    if (region) {
        region.height = parseInt(regionHeightInput.value);
        region.domElement.style.height = `${region.height}px`;
        renderAllRegions();
    }
});


// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadFilters();
    setActiveRegion(null); // No active region initially
    populateColorPalette(); 
});


