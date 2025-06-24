// gridGenerator.js – **single source of truth** for drawing and querying the triangular grid
// -----------------------------------------------------------------------------
import * as DOMElements from './domElements.js';
import * as Utils from './utils.js';          // SVG_NS, SQRT3, GRID_STROKE_WIDTH, HALF_GRID_STROKE
import { state as appState } from './appState.js';

// -----------------------------------------------------------------------------
// 1. Geometry – derive *everything* from frame-size, UI inputs and padding
// -----------------------------------------------------------------------------
function calculateGeometry(frameProps, inputs) {
  const { outerWidth: W, outerHeight: H } = frameProps;
  const { numTrianglesVertical, gridAlignment } = inputs;
  // const pad = appState.currentPadding;
  const pad = frameProps.padding;        // always pixels

  // --- snapping (inset) rectangle -----------------------------------------
  const inset = {
    left   : pad / 2,
    top    : pad / 2,
    right  : W - pad / 2,
    bottom : H - pad / 2
  };
  const insetW = inset.right - inset.left;
  const insetH = inset.bottom - inset.top;

  if (insetW <= 0 || insetH <= 0 || numTrianglesVertical <= 0) {
    return { error: 'Invalid frame size or triangle count' };
  }

  // --- triangle size -------------------------------------------------------
  const h = (insetH - Utils.GRID_STROKE_WIDTH) / numTrianglesVertical;   // height
  const s = (2 * h) / Utils.SQRT3;                                       // side / base

  if (h < 0.5 || s < 0.5) {
    return { error: 'Triangles too small to draw' };
  }

  // --- SVG canvas ----------------------------------------------------------
  const svgW = Math.max(insetW * 1.5, insetW + 6 * s); // wide enough for seamless scroll
  const svgH = insetH;
  const gridLeft = inset.left + (insetW - svgW) / 2;   // centred horizontally inside inset
  const gridTop  = inset.top;                          // flush with inset top
  const baseY    = Utils.HALF_GRID_STROKE;             // centre of first stroke

  // --- horizontal alignment ------------------------------------------------
  let targetX_frame;
  switch (gridAlignment) {
    case 'left':
      targetX_frame = inset.left;// + Utils.HALF_GRID_STROKE;
      break;
    case 'right':
      targetX_frame = inset.right;// - Utils.HALF_GRID_STROKE;
      break;
    default:
      targetX_frame = inset.left + insetW / 2;         // centre
      break;
  }

  const targetX_svg = targetX_frame - gridLeft;
  const startX = targetX_svg - Math.floor(targetX_svg / (s / 2)) * (s / 2);

  // --- loop bounds (extra rows/cols for over-draw) -------------------------
  const j0 = -2;
  const j1 = Math.ceil(svgH / h) + 2;
  const i0 = Math.floor(-startX / s) - 2;
  const i1 = Math.ceil((svgW - startX) / s) + 2;

  return {
    error: null,
    // triangle geometry
    h_triangle: h,
    s_triangle: s,
    // svg canvas
    svgGridWidth: svgW,
    svgGridHeight: svgH,
    gridContainerLeftOffset: gridLeft,
    gridContainerTopOffset: gridTop,
    // pattern anchors
    patternStartX_svg: startX,
    y_pattern_origin_visual_top: 0,
    // loop limits
    j0,
    j1,
    i0,
    i1,
    // inset rectangle (handy for snapping)
    insetLeft: inset.left,
    insetTop: inset.top,
    insetRight: inset.right,
    insetBottom: inset.bottom
  };
}

// -----------------------------------------------------------------------------
// 2. SVG element factory – uses ONLY fields from geometry above
// -----------------------------------------------------------------------------
export function createGridSVGElement(geo,bgColor = 'ffffff') {
  const {
    h_triangle: h,
    s_triangle: s,
    svgGridWidth: svgW,
    svgGridHeight: svgH,
    patternStartX_svg: startX,
    y_pattern_origin_visual_top: y0,
    j0, j1, i0, i1
  } = geo;

  // early-out if geometry invalid
  if (!h || !s || h < 0.01 || s < 0.01) {
    return document.createElementNS(Utils.SVG_NS, 'svg');
  }

  const svg = document.createElementNS(Utils.SVG_NS, 'svg');
  svg.setAttribute('width', svgW);
  svg.setAttribute('height', svgH);
  svg.setAttribute('xmlns', Utils.SVG_NS);


 // --- background rect (fills entire SVG) --------------------------
 const rect = document.createElementNS(Utils.SVG_NS, 'rect');
 rect.setAttribute('x', '0');
 rect.setAttribute('y', '0');
 rect.setAttribute('width',  svgW);
 rect.setAttribute('height', svgH);
 console.log("here bg color is:", bgColor)
 rect.setAttribute('fill', bgColor);
 svg.appendChild(rect);     // << first child, so triangles sit on top



  for (let j = j0; j < j1; j++) {
    const yTip  = y0 + j * h + Utils.HALF_GRID_STROKE;
    const yBase = yTip + h;
    const offset = (j & 1) ? s / 2 : 0;

    for (let i = i0; i < i1; i++) {
      const x0 = startX + i * s + offset;

      // upward triangle
      const up = document.createElementNS(Utils.SVG_NS, 'path');
      up.setAttribute('d', `M ${x0} ${yBase} L ${x0 + s / 2} ${yTip} L ${x0 + s} ${yBase} Z`);
      up.setAttribute('stroke', appState.gridStrokeColor);
      svg.appendChild(up);

      // downward triangle
      const down = document.createElementNS(Utils.SVG_NS, 'path');
      down.setAttribute('d', `M ${x0 + s / 2} ${yTip} L ${x0 + s} ${yBase} L ${x0 + 1.5 * s} ${yTip} Z`);
      down.setAttribute('stroke', appState.gridStrokeColor); 
      svg.appendChild(down);
    }
  }

  return svg;
}

// -----------------------------------------------------------------------------
// 3. Public API – calculate + create + render
// -----------------------------------------------------------------------------
export function calculateGridGeometry(inputs, frameProps) {
  return calculateGeometry(frameProps, inputs);
}

// export function renderGridDOM(svgEl, geo) {
//   DOMElements.triangularGridContainer.innerHTML = '';

//   if (!svgEl || !geo || geo.error) return;

//   const host = DOMElements.triangularGridContainer;
//   host.style.width  = `${geo.svgGridWidth}px`;
//   host.style.height = `${geo.svgGridHeight}px`;
//   host.style.left   = `${geo.gridContainerLeftOffset}px`;
//   host.style.top    = `${geo.gridContainerTopOffset}px`;
//   host.appendChild(svgEl);
// }


export function renderGridDOM(svgEl, geo){
  DOMElements.triangularGridContainer.innerHTML = '';
  if(!svgEl||!geo||geo.error) return;

  const host = DOMElements.triangularGridContainer;
  host.style.width  = `${geo.svgGridWidth}px`;
  host.style.height = `${geo.svgGridHeight}px`;
  host.style.left   = `${geo.gridContainerLeftOffset}px`;
  host.style.top    = `${geo.gridContainerTopOffset}px`;

  /* NEW — pass the colour to CSS */
  // host.style.setProperty('--grid-stroke', appState.gridStrokeColor);


   /* NEW — pass the colour to *both* grid & overlay containers */
 host.style.setProperty('--grid-stroke',  appState.gridStrokeColor);
 DOMElements.selectionOverlay          // ← the <svg> for circles / lines
            .style.setProperty('--grid-stroke', appState.gridStrokeColor);



  host.appendChild(svgEl);
}
