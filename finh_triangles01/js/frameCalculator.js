// frameCalculator.js
import * as DOMElements from './domElements.js'; // Ensure DOMElements.frameContainer is exported

import { GRID_STROKE_WIDTH, SQRT3 } from './utils.js';

function currentTriangleSide(frameH, inp){
    // h = (frameH - pad_est - stroke)/inp.numTrianglesVertical
    // but pad_est itself depends on side => solve quickly with ratio algebra
    const stroke = GRID_STROKE_WIDTH;
    const r      = inp.padding;                   // the ratio number user typed
    const n      = inp.numTrianglesVertical;
    if (inp.paddingMode !== 'ratio' || n <= 0) return 0;
  
    const denom  = n + 2*r/SQRT3;
    if (denom <= 0) return 0;
    const h      = (frameH - stroke) / denom;
    return 2*h / SQRT3;                     // side length s
  }

  
export function calculateFrameProperties(inputs) {
    // This part calculates dimensions and should be correct
    const [ratioW, ratioH] = inputs.ratioString.split(':').map(Number);
    const outerWidth = inputs.outerWidth; // Assuming inputs.outerWidth is a number
    const outerHeight = (outerWidth / ratioW) * ratioH;
    
    // const padding = inputs.padding; 

     const padding =
 inputs.paddingMode === 'ratio'
    ? inputs.padding * currentTriangleSide(outerHeight, inputs)  // computed px
    : inputs.padding;     

    console.log("PADDING IS: ", padding)
    const contentAreaWidth = Math.max(0, outerWidth - (padding * 2));
    const contentAreaHeight = Math.max(0, outerHeight - (padding * 2));

    return {
        outerWidth,
        outerHeight,
        padding,
        contentAreaWidth,
        contentAreaHeight
    };
}

// THIS FUNCTION IS LIKELY MISSING OR NOT EXPORTED CORRECTLY
export function renderFrameDOM(frameProps) {
    if (DOMElements.frameContainer && frameProps) {
        DOMElements.frameContainer.style.width = `${frameProps.outerWidth}px`;
        DOMElements.frameContainer.style.height = `${frameProps.outerHeight}px`;
    } else {
        console.error("renderFrameDOM: frameContainer or frameProps is missing!");
    }
}