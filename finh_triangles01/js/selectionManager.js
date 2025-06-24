// selectionManager.js
import { state as appState } from './appState.js';
import * as PolygonDrawer from './polygonDrawer.js';
import * as DOMElements from './domElements.js';
import { HALF_GRID_STROKE } from './utils.js'; // Ensure this is correctly defined and imported
import * as PolygonOffset from './polygonOffset.js';
import { INNER_POLYGON_PADDING_RATIO } from './config.js';


const EPSILON = 1.0;                         // px – “close enough”
const EPS2    = EPSILON * EPSILON;
function distSq(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

let currentFrameUIPadding = 0; // Stores the actual UI padding for polygon offsetting
let currentInnerPolygonOffset = 0;

export function updateFrameSettings(framePaddingValue) {
    currentFrameUIPadding = framePaddingValue;
    currentInnerPolygonOffset = currentFrameUIPadding * INNER_POLYGON_PADDING_RATIO;
}

export function getCurrentInnerPolygonOffset() {
    return currentInnerPolygonOffset;
}

function getMousePositionInFrame(event) {
    const rect = DOMElements.frameContainer.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

// Calculates the 4 corners of the INSET SNAPPING BOUNDARY
function calculateSnappingBoundaryCorners(frameProps) {
    const { outerWidth, outerHeight } = frameProps; // outerW/H are frameContainer's dims
    
    // Use appState.currentPadding for the inset calculation
    const uiPaddingValueFromState = appState.currentPadding;
    console.log("CSBC: Using uiPaddingValueFromState:", uiPaddingValueFromState, "from appState.currentPadding"); // DEBUG

    const insetAmount = uiPaddingValueFromState / 2;
    const insetX = insetAmount;
    const insetY = insetAmount;
    const insetWidth = Math.max(0, outerWidth - uiPaddingValueFromState);
    const insetHeight = Math.max(0, outerHeight - uiPaddingValueFromState);

    if (insetWidth <= 0 || insetHeight <= 0) {
        console.log("CSBC: Inset area has no size.", {outerWidth, outerHeight, uiPaddingValueFromState});
        return [];
    }

    return [
        { x: insetX, y: insetY, type: 'snapBoundaryCorner' },
        { x: insetX + insetWidth, y: insetY, type: 'snapBoundaryCorner' },
        { x: insetX, y: insetY + insetHeight, type: 'snapBoundaryCorner' },
        { x: insetX + insetWidth, y: insetY + insetHeight, type: 'snapBoundaryCorner' }
    ];
}


// Gets triangle vertices, filtering them to be within/near the SNAPPING BOUNDARY (outer frame)
function getTriangleVerticesForSnapping(gridGeoParams, frameProps) {
    const vertices = new Set();
    const uniquePoints = [];

    if (!gridGeoParams) return []; // Essential check
    const {
        h_triangle, s_triangle, patternStartX_svg, y_pattern_origin_visual_top,
        svgGridWidth, svgGridHeight, gridContainerLeftOffset, gridContainerTopOffset
    } = gridGeoParams;
    
    // Snapping boundary is the outer frame
    const { outerWidth, outerHeight } = frameProps;
    const snapping_padding = 0; // Effective padding for these bounds is 0

    if (h_triangle < 0.01 || s_triangle < 0.01 || outerWidth <= 0 || outerHeight <= 0) return [];

    // Note: y_pattern_origin_visual_top and patternStartX_svg ARE based on frameProps.padding
    // because that's how the grid is visually aligned. We are selecting from this visual grid.
    const j_start = Math.floor(-y_pattern_origin_visual_top / h_triangle) - 2;
    const j_end = Math.ceil((svgGridHeight - y_pattern_origin_visual_top) / h_triangle) + 2;
    const i_start = Math.floor(-patternStartX_svg / s_triangle) - 2;
    const i_end = Math.ceil((svgGridWidth - patternStartX_svg) / s_triangle) + 2;

    const addVertex = (x_svg, y_svg) => {
        const x_frame = x_svg + gridContainerLeftOffset;
        const y_frame = y_svg + gridContainerTopOffset;

        const baseTolerance = s_triangle / 4;
        const tolerance = baseTolerance > 1 ? baseTolerance : 1;

        // Bounds check against the OUTER frame (snapping_padding is 0)
        if (x_frame >= snapping_padding - tolerance && x_frame <= snapping_padding + outerWidth + tolerance &&
            y_frame >= snapping_padding - tolerance && y_frame <= snapping_padding + outerHeight + tolerance) {
            const key = `${x_frame.toFixed(2)},${y_frame.toFixed(2)}`;
            if (!vertices.has(key)) {
                vertices.add(key);
                uniquePoints.push({ x: x_frame, y: y_frame, type: 'triangleVertex' });
            }
        }
    };

    for (let j = j_start; j < j_end; j++) {
        const y_tip_svg = y_pattern_origin_visual_top + (j * h_triangle) + HALF_GRID_STROKE;
        const y_base_svg = y_pattern_origin_visual_top + ((j + 1) * h_triangle) + HALF_GRID_STROKE;
        let x_row_offset_svg = (j % 2 !== 0) ? s_triangle / 2 : 0;
        for (let i = i_start; i < i_end; i++) {
            const x_col_start_svg = patternStartX_svg + i * s_triangle + x_row_offset_svg;
            addVertex(x_col_start_svg, y_base_svg);
            addVertex(x_col_start_svg + s_triangle / 2, y_tip_svg);
            addVertex(x_col_start_svg + s_triangle, y_base_svg);
            addVertex(x_col_start_svg + s_triangle * 1.5, y_tip_svg);
        }
    }
    return uniquePoints;
}

// Finds intersections of triangle edges with the SNAPPING BOUNDARY (outer frame)
function getTriangleEdgeIntersectionsWithSnappingBoundary(gridGeoParams, frameProps) {
    const intersections = new Set();
    const uniqueIntersections = [];

    if (!gridGeoParams) return []; // Essential check
    const {
        h_triangle, s_triangle, patternStartX_svg, y_pattern_origin_visual_top,
        svgGridWidth, svgGridHeight, gridContainerLeftOffset,gridContainerTopOffset
    } = gridGeoParams;

    // Snapping boundary is the outer frame
    const { outerWidth, outerHeight } = frameProps;

    if (h_triangle < 0.01 || s_triangle < 0.01 || outerWidth <= 0 || outerHeight <= 0) return [];

    // Define the boundaries of the OUTER frame for intersection
    const uiPaddingValueFromState = appState.currentPadding;

    const insetAmount = uiPaddingValueFromState / 2;
    const leftEdgeX = insetAmount;
    const rightEdgeX = outerWidth-insetAmount;
    const topEdgeY = insetAmount;
    const bottomEdgeY = outerHeight-insetAmount;

    // Note: y_pattern_origin_visual_top etc. are based on frameProps.padding for visual grid.
    const j_start = Math.floor(-y_pattern_origin_visual_top / h_triangle) - 2;
    const j_end = Math.ceil((svgGridHeight - y_pattern_origin_visual_top) / h_triangle) + 2;
    const i_start = Math.floor(-patternStartX_svg / s_triangle) - 2;
    const i_end = Math.ceil((svgGridWidth - patternStartX_svg) / s_triangle) + 2;

    const addIntersection = (point) => {
        if (point && typeof point.x === 'number' && typeof point.y === 'number' && !isNaN(point.x) && !isNaN(point.y)) {
            const key = `${point.x.toFixed(2)},${point.y.toFixed(2)}`;
            if (!intersections.has(key)) {
                intersections.add(key);
                uniqueIntersections.push(point);
            }
        }
    };
    
    for (let j = j_start; j < j_end; j++) {
        const y_tip_svg = y_pattern_origin_visual_top + (j * h_triangle) + HALF_GRID_STROKE;
        const y_base_svg = y_pattern_origin_visual_top + ((j + 1) * h_triangle) + HALF_GRID_STROKE;
        let x_row_offset_svg = (j % 2 !== 0) ? s_triangle / 2 : 0;
        for (let i = i_start; i < i_end; i++) {
            const x_col_start_svg = patternStartX_svg + i * s_triangle + x_row_offset_svg;
            const svg_vertices = [
                { x: x_col_start_svg, y: y_base_svg },
                { x: x_col_start_svg + s_triangle / 2, y: y_tip_svg },
                { x: x_col_start_svg + s_triangle, y: y_base_svg },
                { x: x_col_start_svg + s_triangle * 1.5, y: y_tip_svg }
            ];
            const v = svg_vertices.map(p => ({ x: p.x + gridContainerLeftOffset, y: p.y + gridContainerTopOffset }));
            if (v.some(p => isNaN(p.x) || isNaN(p.y))) continue;


            const segments = [
                {p1: v[0], p2: v[1]}, {p1: v[1], p2: v[2]}, {p1: v[2], p2: v[0]}, // Upward
                {p1: v[2], p2: v[3]}, {p1: v[3], p2: v[1]}  // Downward (sides)
            ];

            for (const seg of segments) {
                 if (!seg.p1 || !seg.p2 || isNaN(seg.p1.x) || isNaN(seg.p1.y) || isNaN(seg.p2.x) || isNaN(seg.p2.y)) continue;
                // Vertical intersections
                addIntersection(getIntersectionWithVerticalLine(seg.p1, seg.p2, leftEdgeX, topEdgeY, bottomEdgeY));
                addIntersection(getIntersectionWithVerticalLine(seg.p1, seg.p2, rightEdgeX, topEdgeY, bottomEdgeY));
                // Horizontal intersections (needs getIntersectionWithHorizontalLine helper)
                addIntersection(getIntersectionWithHorizontalLine(seg.p1, seg.p2, topEdgeY, leftEdgeX, rightEdgeX));
                addIntersection(getIntersectionWithHorizontalLine(seg.p1, seg.p2, bottomEdgeY, leftEdgeX, rightEdgeX));
            }
        }
    }
    return uniqueIntersections;
}

function getIntersectionWithVerticalLine(p0, p1, x_line, y_min, y_max) {
    if ((p0.x < x_line && p1.x < x_line) || (p0.x > x_line && p1.x > x_line)) return null;
    if (p0.x === p1.x) return null; // Parallel or co-linear, no single crossing point
    const t = (x_line - p0.x) / (p1.x - p0.x);
    if (t >= 0 && t <= 1) {
        const y = p0.y + t * (p1.y - p0.y);
        if (y >= y_min && y <= y_max) return { x: x_line, y: y, type: 'intersection' };
    }
    return null;
}

// Helper: Intersect segment p0-p1 with horizontal line y_line, within x_bounds
function getIntersectionWithHorizontalLine(p0, p1, y_line, x_min, x_max) {
    if ((p0.y < y_line && p1.y < y_line) || (p0.y > y_line && p1.y > y_line)) return null;
    if (p0.y === p1.y) return null; // Parallel or co-linear
    const t = (y_line - p0.y) / (p1.y - p0.y);
    if (t >= 0 && t <= 1) {
        const x = p0.x + t * (p1.x - p0.x);
        if (x >= x_min && x <= x_max) return { x: x, y: y_line, type: 'intersection' };
    }
    return null;
}



export function calculateAllSnapPoints(frameProps, gridGeoParams) {
    /* 0. trivial reject ------------------------------------------------ */
    if (!frameProps || frameProps.outerWidth <= 0 || frameProps.outerHeight <= 0) {
      appState.allSnapPoints = [];
      return;
    }
  
    /* 1. gather raw candidates ---------------------------------------- */
    const frameCorners   = calculateSnappingBoundaryCorners(frameProps);              // inset rectangle
    const triVertices    = getTriangleVerticesForSnapping(gridGeoParams, frameProps); // all grid vertices
    const intersections  = getTriangleEdgeIntersectionsWithSnappingBoundary(
                             gridGeoParams, frameProps);                              // grid–boundary crosses
  
    /* 2. start list with inset + vertices (those always win) ---------- */
    const snap = [ ...frameCorners, ...triVertices ];
  
    /* 3. add an intersection only if no vertex is within EPSILON ------ */
    intersections.forEach(pI => {
      if (!pI || isNaN(pI.x) || isNaN(pI.y)) return;
      const tooClose = snap.some(pV => distSq(pI, pV) < EPS2);
      if (!tooClose) snap.push(pI);
    });
  
    /* 4. final de-dup (round to 0.1 px so identical floats collapse) -- */
    const uniq = new Map();
    snap.forEach(p => {
      const key = `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      if (!uniq.has(key)) uniq.set(key, p);
    });
  
    appState.allSnapPoints = [...uniq.values()];
    console.log('SM Final Snap Points:', appState.allSnapPoints.length,
                JSON.parse(JSON.stringify(appState.allSnapPoints)));
  }
export function clearCurrentSelection() {
    appState.currentPolygonPoints = [];
    PolygonDrawer.redrawAllSelections();
}

export function handleFrameClick(event) {
    if (!appState.isSelectionModeActive || appState.allSnapPoints.length === 0) {
      return;
    }
  
    /* -------------------------------------------------- *
     * 1. locate nearest snap-point                       */
    /* -------------------------------------------------- */
    const mousePos = getMousePositionInFrame(event);
    let closest = null;
    let minDistSq = appState.snapTolerance * appState.snapTolerance;
  
    appState.allSnapPoints.forEach(pt => {
      const dsq = distSq(mousePos, pt);
      if (dsq < minDistSq) {
        minDistSq = dsq;
        closest   = pt;
      }
    });
  
    if (!closest) return;                            // nothing near cursor
  
    
    const idx = appState.currentPolygonPoints.findIndex(
      p => Math.abs(p.x - closest.x) < 0.1 &&
           Math.abs(p.y - closest.y) < 0.1
    );
  
    if (idx !== -1) {
      /* ── already present ─────────────────────────── */
      if (idx === 0 && appState.currentPolygonPoints.length >= 3) {
        /* first vertex + ≥3 pts → close polygon */
        finishCurrentPolygon();
        return;
      }
  
      /* otherwise: remove the vertex */
      appState.currentPolygonPoints.splice(idx, 1);
    } else {
      /* ── new vertex ─────────────────────────────── */
      appState.currentPolygonPoints.push({ x: closest.x, y: closest.y });
    }
  
   
    let liveInner = [];
    if (appState.currentPolygonPoints.length >= 3 && currentInnerPolygonOffset > 0) {
      let pts = [...appState.currentPolygonPoints];
      if (PolygonOffset.getPolygonWindingOrder(pts) > 0) pts.reverse();
      liveInner = PolygonOffset.calculateInsetPolygon(pts, currentInnerPolygonOffset);
    }
  
    /* -------------------------------------------------- *
     * 4. redraw overlay                                 *
     * -------------------------------------------------- */
    PolygonDrawer.redrawAllSelections(undefined, liveInner);
  }
  


export function finishCurrentPolygon() {
    if (appState.currentPolygonPoints.length < 3) {
        alert("A polygon needs at least 3 points to be finished.");
        return;
    }

    let outerPoly = [...appState.currentPolygonPoints];
    if (PolygonOffset.getPolygonWindingOrder(outerPoly) > 0) {
        outerPoly.reverse();
    }

    let innerPoly = [];
    if (currentInnerPolygonOffset > 0) {
        innerPoly = PolygonOffset.calculateInsetPolygon(outerPoly, currentInnerPolygonOffset);
    }
    
    appState.finishedPolygons.push({ 
        id: appState.nextPolygonId++, // Assign and increment ID
        outer: outerPoly, 
        inner: innerPoly, 
        color: appState.activeColor 
    });

    appState.currentPolygonPoints = [];
    appState.selectedIndex = -1; // Deselect any previously selected shape
    PolygonDrawer.redrawAllSelections();
}


export function initializeSelectionHandling() {
    DOMElements.frameContainer.addEventListener('click', handleFrameClick);
}
