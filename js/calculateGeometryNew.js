/* helpers ----------------------------------------------------------------- */
import * as Utils from './utils.js';

/**
 * Derive all numbers needed to draw the triangular grid and to query it later.
 * - `frameProps.outerWidth / outerHeight` are the total frameContainer size.
 * - `inputs.numTrianglesVertical`, `inputs.gridAlignment` come from the UI.
 * - `pad` is `appState.currentPadding`.
 */
function calculateGeometry(frameProps, inputs, pad) {
  const { outerWidth: W, outerHeight: H } = frameProps;
  const { numTrianglesVertical, gridAlignment } = inputs;

  /* -------- inset (snapping rectangle) ----------------------------------- */
  const inset = {
    left   : pad / 2,
    top    : pad / 2,
    right  : W - pad / 2,
    bottom : H - pad / 2
  };
  const insetW = inset.right  - inset.left;
  const insetH = inset.bottom - inset.top;

  /* guard-rails */
  if (insetW  <= 0 || insetH <= 0 || numTrianglesVertical <= 0) {
    throw new Error('Invalid frame or triangle count');
  }

  /* -------- triangle size ----------------------------------------------- */
  const h = (insetH - Utils.GRID_STROKE_WIDTH) / numTrianglesVertical;   // height
  const s = (2 * h) / Utils.SQRT3;                                       // base (side)

  if (h < 0.5 || s < 0.5) {
    throw new Error('Triangles too small for the grid to be useful');
  }

  /* -------- SVG canvas --------------------------------------------------- */
  // Make the canvas wider than inset so the pattern can scroll seamlessly.
  const svgW = Math.max(insetW * 1.5, insetW + 6 * s);
  const svgH = insetH;

  // Position the SVG so its *visible* part is centred inside the inset.
  const gridLeft  = inset.left + (insetW - svgW) / 2;
  const gridTop   = inset.top;               // we stick to the inset’s top
  const baseY     = Utils.HALF_GRID_STROKE;  // first horizontal stroke

  /* -------- horizontal alignment of pattern ------------------------------ */
  // targetX_frame = where the user wants a *stroke* to land inside the inset.
  let targetX_frame;
  switch (gridAlignment) {
    case 'left':
      targetX_frame = inset.left + Utils.HALF_GRID_STROKE;
      break;
    case 'right':
      targetX_frame = inset.right - Utils.HALF_GRID_STROKE;
      break;
    case 'center':
    default:
      targetX_frame = inset.left + insetW / 2;
      break;
  }

  // Convert that X into the SVG’s coordinate system.
  const targetX_svg = targetX_frame - gridLeft;
  const sHalf       = s / 2;

  // Pattern repeats every s/2, so choose the start so that a stroke
  // falls exactly on targetX_svg.
  const startX = targetX_svg - Math.floor(targetX_svg / sHalf) * sHalf;

  /* -------- loop bounds for j (rows) and i (columns) --------------------- */
  const j0 = -2;                               // two rows above for over-draw
  const j1 = Math.ceil(svgH / h) + 2;          // rows that cover canvas + pad
  const i0 = Math.floor(-startX / s) - 2;      // columns before left edge
  const i1 = Math.ceil((svgW - startX) / s) + 2;

  /* -------- bundle everything ------------------------------------------- */
  return {
    /* geometry of a single triangle */
    h,                // height
    s,                // side/base

    /* SVG canvas size & placement */
    svgW,
    svgH,
    gridLeft,         // offset inside frameContainer
    gridTop,
    startX,           // where column 0 starts inside SVG
    baseY,            // centre of first horizontal stroke

    /* loop limits for iterators */
    j0, j1, i0, i1,

    /* snapping rectangle (in frame coords) */
    inset             // { left, top, right, bottom }
  };
}

export { calculateGeometry };
