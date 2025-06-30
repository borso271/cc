// src/core/dom-elements.js

/**
 * A centralized cache of DOM elements.
 * Queries the DOM once on initialization and provides references to the rest of the application.
 * Throws an error if a critical element is not found, ensuring a fail-fast approach.
 */
function query(selector) {
    const element = document.querySelector(selector);
    if (!element) {
        throw new Error(`DOM Element not found: A critical element with selector "${selector}" is missing from the DOM.`);
    }
    return element;
}

// Main application containers
// export const app = query('#app'); 
export const sidebar = query('#sidebar');

// SVG and its layers (Grid-specific elements)
export const svg = query('#gridSvg');
export const meshLayer = query('#meshLayer');
export const polygonLayer = query('#polygonLayer');
export const frameLayer = query('#frameLayer');
export const tempLayer = query('#tempLayer');
export const vertexLayer = query('#vertexLayer');
export const axisGroup = query('#axisGuides');
export const clipLayer = query('#clipLayer');
export const vertexHitLayer = query('#vertexHitLayer');

export const debugMaskLayer = query('#debugMaskLayer');

export const previewFrameLayer = query('#previewFrameLayer');

// /* ─── hook the new inputs ─────────────────────────────────── */
// const padIn = sidebar.querySelector('#padIn');
// const radIn = sidebar.querySelector('#radIn');

// padIn.oninput = radIn.oninput = () => {
//   store.setRoundStyle({
//     pad    : +padIn.value,
//     radius : +radIn.value
//   });
// };


// You could also add UI elements here if they are complex to query
// export const densitySlider = query('#densityRange');
// export const ratioSelector = query('#ratioSel');