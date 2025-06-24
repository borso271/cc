// // svgExporter.js (New File)
// // OR this could be a new function within polygonDrawer.js

import { state as appState } from './appState.js'; // To access finishedPolygons and currentCornerRadius
import { getRoundedPolygonPath } from './polygonToRoundedPath.js'; // To generate path data
import { SVG_NS } from './utils.js'; // For consistency, though not strictly needed for string building

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
      svg += `  <path d="${d}" fill="${fill}"/>\n`;
    });
  
    /* 3. wrap in the outer <svg> tag ------------------------------------ */
    return `<svg width="${width}" height="${height}" xmlns="${SVG_NS}">\n${svg}</svg>`;
  }
  





  /* ⇢ already-existing helper unchanged …  generateInnerShapesSVGString() */

/* ─────────────────────────────────────────────────────────────────── */
/* NEW: full export – background + triangular grid + inner polygons   */

/**
 * Creates ONE consolidated SVG file that contains
 *   • the solid background rectangle
 *   • the full triangular grid (honouring its left / top offset)
 *   • every finished *inner* rounded polygon
 *
 * @param {number} width   frame outer-width  in px
 * @param {number} height  frame outer-height in px
 * @param {object} geo     latest geometry object from GridGenerator
 * @return {string}        complete <svg> markup
 */
export function generateFullSVGString (width, height, geo) {
  if (!geo || geo.error) return '';

  /* colour & geometry helpers ------------------------------------------ */
  const bg    = appState.frameBgColor   || '#ffffff';
  const gridC = appState.gridStrokeColor|| '#000000';
  const r     = appState.currentCornerRadius;

  const dx    = geo.gridContainerLeftOffset;   // same on-screen shift
  const dy    = geo.gridContainerTopOffset;

  /* 1. background rectangle ------------------------------------------- */
  let svg = `  <rect x="0" y="0" width="${width}" height="${height}" fill="${bg}" />\n`;

  /* 2. GRID paths – identical maths to on-screen draw ----------------- */
  const { h_triangle:h, s_triangle:s,
          y_pattern_origin_visual_top:y0, patternStartX_svg:startX,
          j0, j1, i0, i1 } = geo;

  let gridPaths = '';
  for (let j = j0; j < j1; j++) {
    const yTip  = y0 + j * h;
    const yBase = yTip + h;
    const off   = (j & 1) ? s / 2 : 0;

    for (let i = i0; i < i1; i++) {
      const x0 = startX + i * s + off;

      gridPaths +=
        `    <path d="M ${x0} ${yBase} L ${x0 + s/2} ${yTip} L ${x0 + s} ${yBase} Z"\n` +
        `          fill="none" stroke="${gridC}" stroke-width="1" stroke-opacity="0.15"/>\n`+
        `    <path d="M ${x0+s/2} ${yTip} L ${x0+s} ${yBase} L ${x0+1.5*s} ${yTip} Z"\n` +
        `          fill="none" stroke="${gridC}" stroke-width="1" stroke-opacity="0.15"/>\n`;
    }
  }

  /* wrap grid in a translating <g> so it lands where the user saw it */
  svg += `  <g transform="translate(${dx},${dy})">\n${gridPaths}  </g>\n`;

  /* 3. inner rounded polygons ---------------------------------------- */
  appState.finishedPolygons.forEach(poly => {
    if (!poly.inner || poly.inner.length < 3) return;
    const innerR = r > 0 ? Math.max(1, r / 1.2) : 0;
    const d      = getRoundedPolygonPath(poly.inner, innerR);
    if (!d) return;
    const fill   = poly.color || '#808080';
    svg += `  <path d="${d}" fill="${fill}" />\n`;
  });

  /* 4. outer <svg> wrapper ------------------------------------------- */
  return `<svg width="${width}" height="${height}" xmlns="${SVG_NS}">\n${svg}</svg>`;
}