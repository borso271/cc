// // svgExporter.js (New File)
// // OR this could be a new function within polygonDrawer.js

import { state as appState } from './appState.js'; // To access finishedPolygons and currentCornerRadius
import { getRoundedPolygonPath } from './polygonToRoundedPath.js'; // To generate path data
import { SVG_NS } from './utils.js'; // For consistency, though not strictly needed for string building

// /**
//  * Generates an SVG string containing only the inner rounded polygons.
//  * @param {number} width - The width of the SVG canvas (e.g., frameProps.outerWidth).
//  * @param {number} height - The height of the SVG canvas (e.g., frameProps.outerHeight).
//  * @returns {string} - The complete SVG string.
//  */
// export function generateInnerShapesSVGString(width, height) {
//     let svgPaths = '';

//     appState.finishedPolygons.forEach(polyData => {
//         if (polyData.inner && polyData.inner.length > 2) {
//             // Use a slightly smaller radius for inner polygons if desired, or same as outer
//             const innerCornerRadius = appState.currentCornerRadius > 0 
//                 ? Math.max(1, appState.currentCornerRadius / 1.2) 
//                 : 0;
            
//             const roundedInnerPathData = getRoundedPolygonPath(polyData.inner, innerCornerRadius);
            
//             if (roundedInnerPathData) {
//                 // Get the color for this polygon
//                 const fillColor = polyData.color || '#808080'; // Default to gray
//                 // For downloaded SVG, we might want no stroke or a consistent one
//                 const strokeColor = fillColor; // Or 'none' or 'black'
//                 const strokeWidth = "1";       // Or "0" for no stroke

//                 svgPaths += `  <path d="${roundedInnerPathData}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />\n`;
//             }
//         }
//     });

//     // Construct the full SVG string
//     const svgString = `<svg width="${width}" height="${height}" xmlns="${SVG_NS}">
// ${svgPaths}</svg>`;

//     return svgString;
// }



/**
 * Returns an SVG string that contains
 *   • one solid <rect> that covers the entire canvas (background colour)
 *   • every inner rounded polygon that the user has finished drawing
 *
 * @param {number} width   – outer frame width  (px)
 * @param {number} height  – outer frame height (px)
 * @returns {string}       – complete SVG markup
 */
export function generateInnerShapesSVGString(width, height) {
    const bg = appState.frameBgColor || '#ffffff';     // fallback = white
    const r  = appState.currentCornerRadius;
    let svg  = '';
  
    /* 1. background rectangle (first so every path sits on top) */
    svg += `  <rect x="0" y="0" width="${width}" height="${height}" fill="${bg}" />\n`;
  
    /* 2. inner polygons ------------------------------------------------- */
    appState.finishedPolygons.forEach(poly => {
      if (!poly.inner || poly.inner.length < 3) return;
  
      const innerR  = r > 0 ? Math.max(1, r / 1.2) : 0;          // same rule you use in-app
      const d       = getRoundedPolygonPath(poly.inner, innerR);
      if (!d) return;
  
      const fill    = poly.color || '#808080';
      svg += `  <path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="1" />\n`;
    });
  
    /* 3. wrap in the outer <svg> tag ------------------------------------ */
    return `<svg width="${width}" height="${height}" xmlns="${SVG_NS}">\n${svg}</svg>`;
  }
  