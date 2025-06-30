// src/modules/grid/index.js

import { store } from '../../core/store.js';
import * as C from '../../core/constants.js';
import * as DOM from '../../core/dom-elements.js';
import { Renderer } from './render/index.js';
import * as Interactions from './grid-interactions.js';
import { clipWithFrame } from '../../utils/clip-with-frame.js';
import { getSlices } from '../../utils/clip-with-frame.js';
import { placeFrame } from './grid-interactions.js';
// --- Module-level State ---
let vertices = [];

// --- Public API ---
export const getVertices = () => vertices;





export function initZoom() {
  const svgWrap = document.getElementById('svgWrap');
  const svg     = document.getElementById('gridSvg');
  const plus    = document.getElementById('zoomIn');
  const minus   = document.getElementById('zoomOut');
  const lockBtn = document.getElementById('lockView');

  /* ── 1.  Base canvas size ───────────────────────────────────────── */
  const baseW = +svg.getAttribute('width');   // e.g. 2000
  const baseH = +svg.getAttribute('height');  // e.g. 1200

  /* ── 2.  Zoom state ─────────────────────────────────────────────── */
  let scale = 1;
  const step = 0.1,  min = 0.25,  max = 3;

  function applyZoom() {
    svg.style.width  = `${baseW * scale}px`;
    svg.style.height = `${baseH * scale}px`;
  }

  plus .addEventListener('click', () => {
    scale = Math.min(max, scale + step);
    applyZoom();
  });

  minus.addEventListener('click', () => {
    scale = Math.max(min, scale - step);
    applyZoom();
  });

  /* ── 3.  Lock / unlock scrolling ───────────────────────────────── */
  let locked = false;

  function updateLockUI() {
    svgWrap.style.overflow = locked ? 'hidden' : 'auto';
    lockBtn.classList.toggle('locked', locked);   // swaps icons via CSS
  }

  lockBtn.addEventListener('click', () => {
    locked = !locked;
    updateLockUI();
  });

  /* ── 4.  Initialise view ───────────────────────────────────────── */
  applyZoom();
  updateLockUI();   // start unlocked, icon = closed lock
}



function centreScroll () {
  const wrap = document.getElementById('svgWrap');
  // wait one frame so scrollWidth/Height are reliable
  requestAnimationFrame(() => {
    wrap.scrollLeft = (wrap.scrollWidth  - wrap.clientWidth)  / 2;
    wrap.scrollTop  = (wrap.scrollHeight - wrap.clientHeight) / 2;
  });
}


export function initGrid() {
  // This is the function you call from main.js
  buildGridModel();
  drawFullGrid();
  centreScroll();          // centre on first load

  // Wire up the main canvas click listener
  DOM.svg.addEventListener('click', Interactions.handleCanvasClick);


  document.addEventListener('DOMContentLoaded', initZoom);

}

// This function is for major state changes (like density)
// that require a full rebuild. It should be called by your store-subscriber.
export function rebuildGrid() {
    buildGridModel();
    drawFullGrid();
}

// --- Internal Functions ---

export function buildGridModel () {
  const density = store.state.density;
  const SIDE    = C.BASE_SIDE / density;
  const ROWS    = Math.round(C.BASE_ROWS * density);
  const COLS    = Math.round(C.BASE_COLS * density);

  /* ---- lattice vertex cache --------------------------------- */
  vertices = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * SIDE + (row % 2) * (SIDE / 2);
      const y = row * C.H_FROM_SIDE(SIDE);
      const q = col - ((row - (row & 1)) >> 1);      // axial-q
      const r = row;                                 // axial-r
      vertices.push({ x, y, q, r, el: null });
    }
  }

  /* ─── NEW: save real axial bounds for drag-clamp ───────────── */
  const qs = vertices.map(v => v.q);
  const rs = vertices.map(v => v.r);
  store.gridBounds = {                      // <—— live limits
    minQ : Math.min(...qs),
    maxQ : Math.max(...qs),
    minR : Math.min(...rs),
    maxR : Math.max(...rs)
  };
  /* ───────────────────────────────────────────────────────────── */

  /* ---- ensure frame has BOTH multipliers -------------------- */
  const f = store.state.frame;
  if (f.widthMult == null && f.heightMult == null) f.widthMult = 4;

  const [rw, rh] = f.ratio;
  if (f.widthMult != null && f.heightMult == null) {
    f.heightMult = f.widthMult * (2 / Math.sqrt(3)) * (rh / rw);
  }
  if (f.heightMult != null && f.widthMult == null) {
    f.widthMult  = f.heightMult * (Math.sqrt(3) / 2) * (rw / rh);
  }

  /* ---- auto-centre only on very first build ----------------- */
  // if (f.x === 0 && f.y === 0) {
  //   const gridW = (COLS - 1) * SIDE + SIDE;
  //   const gridH = (ROWS - 1) * C.H_FROM_SIDE(SIDE);
  //   const wPx   = f.widthMult  * SIDE;
  //   const hPx   = f.heightMult * C.H_FROM_SIDE(SIDE);

  //   store.patchFrame({
  //     x: (gridW - wPx) / 2,
  //     y: (gridH - hPx) / 2
  //   });


    
  // }

  if (f.x === 0 && f.y === 0) {
        placeFrame('top', 'center');     // <-- use your helper
      }

}


// export function buildGridModel () {
//   const density = store.state.density;                 // keep live refs
//   const SIDE    = C.BASE_SIDE / density;
//   const ROWS    = Math.round(C.BASE_ROWS * density);
//   const COLS    = Math.round(C.BASE_COLS * density);

//   /* ---- lattice vertex cache --------------------------------- */
//   vertices = [];
//   for (let row = 0; row < ROWS; row++) {
//     for (let col = 0; col < COLS; col++) {
//       const x = col * SIDE + (row % 2) * (SIDE / 2);
//       const y = row * C.H_FROM_SIDE(SIDE);
//       const q = col - ((row - (row & 1)) >> 1);        // axial-q
//       const r = row;                                   // axial-r
//       vertices.push({ x, y, q, r, el: null });
//     }
//   }

//   /* ---- ensure frame has BOTH multipliers -------------------- */
//   const f = store.state.frame;                         // live object
//   if (f.widthMult == null && f.heightMult == null) f.widthMult = 4;   // fallback

//   const [rw, rh] = f.ratio;                            // e.g. [16,9]
//   if (f.widthMult != null && f.heightMult == null) {
//     f.heightMult = f.widthMult * (2 / Math.sqrt(3)) * (rh / rw);
//   }
//   if (f.heightMult != null && f.widthMult == null) {
//     f.widthMult  = f.heightMult * (Math.sqrt(3) / 2) * (rw / rh);
//   }

//   /* ---- auto-centre only the very first time ----------------- */
//   if (f.x === 0 && f.y === 0) {
//     const gridW = (COLS - 1) * SIDE + SIDE;
//     const gridH = (ROWS - 1) * C.H_FROM_SIDE(SIDE);
//     const wPx   = f.widthMult  * SIDE;
//     const hPx   = f.heightMult * C.H_FROM_SIDE(SIDE);

//     store.patchFrame({
//       x: (gridW - wPx) / 2,
//       y: (gridH - hPx) / 2
//     });
//   }

// }

// export function buildGridModel() {
//   const density = store.s.density;
//   const SIDE = C.BASE_SIDE / density;
//   const ROWS = Math.round(C.BASE_ROWS * density);
//   const COLS = Math.round(C.BASE_COLS * density);

//   // Calculate vertex positions and store them
//   vertices = [];
//    for (let row = 0; row < ROWS; row++) {
//       for (let col = 0; col < COLS; col++) {
//         const x = col * SIDE + (row % 2) * (SIDE / 2);
//         const y = row * C.H_FROM_SIDE(SIDE);
  
//         /* axial-coords for an odd-row-offset grid
//          * q = col − (row − (row&1)) / 2
//          * r = row
//          */
//         const q = col - ((row - (row & 1)) >> 1);
//         const r = row;
  
//         vertices.push({ x, y, q, r, el: null });
//       }
//     }


//   // Auto-center frame on first build (business logic for initialization)
//   const f = store.s.frame;
//   if (f.x === 0 && f.y === 0) {
//     const gridW = (COLS - 1) * SIDE + SIDE;
//     const gridH = (ROWS - 1) * C.H_FROM_SIDE(SIDE);
//     const wPx = f.widthMult * SIDE;
//     const hPx = f.heightMult * C.H_FROM_SIDE(SIDE);
//     store.patchFrame({
//       x: (gridW - wPx) / 2,
//       y: (gridH - hPx) / 2
//     });
//   }
// }




// modules/grid/index.js  ── drawFullGrid (refactored)
/*  Requires:
      import { getSlices }   from '../../utils/clip-with-frame.js';
*/




// export function drawFullGrid () {
//   const state   = store.state;                 // keep Polygon prototypes
//   const density = state.density;

//   /* --- geometry of the grid ----------------------------------- */
//   const SIDE  = C.BASE_SIDE / density;
//   const ROWS  = Math.round(C.BASE_ROWS * density);
//   const COLS  = Math.round(C.BASE_COLS * density);
//   const gridW = (COLS - 1) * SIDE + SIDE;
//   const gridH = (ROWS - 1) * C.H_FROM_SIDE(SIDE);

//   /* --- static layers ------------------------------------------ */
//   Renderer.clearAllLayers();
//   Renderer.setViewBox(gridW, gridH);
//   Renderer.drawVertices(vertices, Interactions.handleVertexClick);
//   Renderer.drawMesh(vertices, ROWS, COLS);
//   Renderer.drawAxes(gridW, gridH);
//   Renderer.drawFrame(state.frame, SIDE);

//   /* --- 1. Draw the FULL, CLICKABLE polygons (Bottom Layer) ---- */
//   // This layer is responsible for filling the shape and handling all clicks.
//   // It should also handle its own selection highlight (e.g., changing fill or stroke).
//   Renderer.redrawSavedPolygons(
//     state.polygons,
//     SIDE,
//     state.selectedId,
//     (e, poly) => Interactions.handlePolygonClick(e, poly)
//   );

//   /* --- 2. Draw the non-interactive DECORATIVE slices (Top Layer) --- */
//   const { frame, pad, radius: rad } = state;
//   DOM.clipLayer.innerHTML = '';               // clear previous

//   state.polygons.forEach(poly => {
//     getSlices(poly, frame, SIDE, C.H_FROM_SIDE, pad, rad)
//       .forEach(slice => {
//         if (!slice.path) return;              // nothing inside
//         const p = document.createElementNS(C.NS, 'path');
//         p.setAttribute('d', slice.path);
//         p.setAttribute('fill', 'none');
//         p.setAttribute('stroke', slice.fill);
//         p.setAttribute('stroke-width', 1.5);
        
//         // --- THE KEY FIX ---
//         // This makes the slice path visible but completely transparent to mouse clicks.
//         // Clicks will pass through it and hit the full polygon underneath.
//         p.style.pointerEvents = 'none';

//         DOM.clipLayer.appendChild(p);
//       });
//   });
// }



export function drawFullGrid () {
  const state   = store.state;
  const density = state.density;
 

  /* --- grid geometry ----------------------------------------- */
  const SIDE  = C.BASE_SIDE / density;
  const ROWS  = Math.round(C.BASE_ROWS * density);
  const COLS  = Math.round(C.BASE_COLS * density);
  const gridW = (COLS - 1) * SIDE + SIDE;
  const gridH = (ROWS - 1) * C.H_FROM_SIDE(SIDE);

  /* --- clear static layers ----------------------------------- */
  Renderer.clearAllLayers();
  Renderer.setViewBox(gridW, gridH);
  Renderer.drawMesh(vertices, ROWS, COLS);
  Renderer.drawAxes(gridW, gridH);
  Renderer.drawFrame(state.frame, SIDE);

  /* --- outline layer ----------------------------------------- */
  DOM.polygonLayer.innerHTML = '';
  state.polygons.forEach(poly => {
    const pts = [...poly.vertices()].slice(0,-1)
      .map(([q,r]) => `${(q+r/2)*SIDE},${r*C.H_FROM_SIDE(SIDE)}`).join(' ');

    const outline = document.createElementNS(C.NS,'polygon');

    outline.setAttribute('points', pts);
    outline.setAttribute('fill', 'none');
    outline.setAttribute('stroke', poly.fill);
    outline.setAttribute('stroke-width', 1);
    outline.style.pointerEvents = 'visibleStroke';
    outline.addEventListener('click',
      e => Interactions.handlePolygonClick(e, poly));
    outline.addEventListener('pointerdown',
      e => Interactions.onPolyPointerDown(e, poly));



    if (state.selectedId === poly.id)
      outline.classList.add('selected-outline');
    
    if (state.highlightId === poly.id)       // accent while “just added”
      outline.classList.add('just-added');




    DOM.polygonLayer.appendChild(outline);
  });

  /* --- slice layer ------------------------------------------- */
  const padPx = store.padPx;
  const radPx = store.radiusPx;
  DOM.clipLayer.innerHTML = '';

  state.polygons.forEach(poly => {

    



    const slices = getSlices(poly, state.frame, SIDE, C.H_FROM_SIDE,
                             padPx, radPx);

    /* fully-outside polygon gets an invisible hit-area */
    if (slices.length === 0) {
      const pts = [...poly.vertices()].slice(0,-1)
        .map(([q,r]) => `${(q+r/2)*SIDE},${r*C.H_FROM_SIDE(SIDE)}`).join(' ');
      const hit = document.createElementNS(C.NS,'polygon');
      hit.setAttribute('points', pts);
      hit.style.fill          = 'transparent';
       hit.style.pointerEvents = 'visibleFill';
      
      hit.addEventListener('click',
        e => Interactions.handlePolygonClick(e, poly));
      hit.addEventListener('pointerdown',
        e => Interactions.onPolyPointerDown(e, poly));
      DOM.clipLayer.appendChild(hit);
    }

    /* draw each interior slice */
    slices.forEach(slice => {
      /* filled shape */
      if (slice.path) {
        const path = document.createElementNS(C.NS,'path');
        path.setAttribute('d', slice.path);
        path.setAttribute('fill', slice.fill);
        path.setAttribute('stroke', 'none');
        path.style.pointerEvents = 'none';   // ignore pointer for drag

        if (state.selectedId === poly.id)
          path.classList.add('selected-outline');

        DOM.clipLayer.appendChild(path);
      }

      /* transparent hit-polygon on top of the slice */
      const hit = document.createElementNS(C.NS,'polygon');
      hit.setAttribute('points',
        slice.verts.map(([x,y]) => `${x},${y}`).join(' '));
      hit.style.fill          = 'transparent';
       hit.style.pointerEvents = 'visibleFill';
      
      hit.addEventListener('click',
        e => Interactions.handlePolygonClick(e, poly));
      hit.addEventListener('pointerdown',
        e => Interactions.onPolyPointerDown(e, poly));
      DOM.clipLayer.appendChild(hit);
    });
  });





  // ----- enlarged bleeding frame ---------------------------------
const pf = DOM.previewFrameLayer;
pf.innerHTML = '';                       // nuke whatever was there

const pad = store.padPx;                 // current padding in px
const f   = store.state.frame;

const rowH = C.H_FROM_SIDE(SIDE);

const big = document.createElementNS(C.NS,'rect');
big.setAttribute('x', f.x - pad);
big.setAttribute('y', f.y - pad);
big.setAttribute('width',  f.widthMult  * SIDE + pad*2);
big.setAttribute('height', f.heightMult * rowH + pad*2);
big.setAttribute('fill',   'none');
big.setAttribute('stroke', 'var(--foreground)');
pf.appendChild(big);
  /* --- vertices LAST so they sit above everything ------------ */
  Renderer.drawVertices(vertices, Interactions.handleVertexClick);
}

