
import { store } from '../../../core/store.js'; // Needed for selectedPoly check
import * as C from '../../../core/constants.js';
import * as DOM from '../../../core/dom-elements.js';

import { drawFrame} from "./draw-frame.js";
import { drawMesh } from "./draw-mesh.js";
import { drawAxes } from "./draw-axes.js";
import { drawVertices } from "./draw-vertices.js";


let frameRect = null; // Internal reference for efficient updates
let tempLineElements = []; // internal refs to temp lines

/* --- low‑level SVG helper ------------------------------------- */
const setL = (el, x1, y1, x2, y2) => {
  el.setAttribute('x1', x1);
  el.setAttribute('y1', y1);
  el.setAttribute('x2', x2);
  el.setAttribute('y2', y2);
};

/* --------------------------------------------------------------- */
/*  PUBLIC – scene management                                      */
/* --------------------------------------------------------------- */

export function clearAllLayers() {
  [DOM.meshLayer, DOM.polygonLayer, DOM.tempLayer,
   DOM.vertexLayer, DOM.axisGroup, DOM.frameLayer]
    .forEach(g => g.innerHTML = '');
}

export function setViewBox(width, height) {
  DOM.svg.setAttribute(
    'viewBox',
    `${-C.MARGIN} ${-C.MARGIN} ${width + 2 * C.MARGIN} ${height + 2 * C.MARGIN}`
  );
}

/**
 * Redraw every stored Polygon.
 * @param {Polygon[]} polygons                        array of instances
 * @param {number}    SIDE                            pixel length of 1 lattice unit
 * @param {number|null} selectedId                    currently‑selected polygon id
 * @param {(e:PointerEvent, poly:Polygon)=>void} onClick  callback when user clicks the fill
 */
export function redrawSavedPolygons(polygons, SIDE, selectedId, onClick) {
  DOM.polygonLayer.innerHTML = '';
  const rowH = C.H_FROM_SIDE(SIDE);           // √3/2 · SIDE

  console.log("polygons are: ", polygons)
  polygons.forEach(poly => {
  
    const verts = [...poly.vertices()];
    verts.pop();                                 // remove duplicate

    const pts = verts
      .map(([q, r]) => `${(q + r / 2) * SIDE},${r * rowH}`)
      .join(' ');

    const pEl = document.createElementNS(C.NS, 'polygon');
    pEl.setAttribute('points', pts);
    pEl.classList.add('polygon');
    pEl.style.fill = poly.fill;
    if (poly.id === selectedId) pEl.classList.add('selected');
    pEl.addEventListener('click', e => onClick(e, poly));
    DOM.polygonLayer.appendChild(pEl);
  });
}

/* --------------------------------------------------------------- */
/*  Temporary path visuals                                         */
/* --------------------------------------------------------------- */

export function drawTempLine(p1, p2) {
  const l = document.createElementNS(C.NS, 'line');
  setL(l, p1.x, p1.y, p2.x, p2.y);
  l.classList.add('tempLine');
  DOM.tempLayer.appendChild(l);
  tempLineElements.push(l);
}

export function removeLastTempLine() {
  if (tempLineElements.length) tempLineElements.pop().remove();
}

export function clearAllTempLines() {
  tempLineElements.forEach(l => l.remove());
  tempLineElements = [];
}



import { getSlices } from '../../../utils/clip-with-frame.js';
/* helper in renderer (add once) -------------------------------------
   Rerenders ONLY the outline + slices of `poly`, keeping other layers. */
   export function redrawSinglePolygon(poly) {
    /* 1. remove existing group for this id (if any) */
    DOM.clipLayer.querySelectorAll(`[data-pid="${poly.id}"]`).forEach(n=>n.remove());
    DOM.polygonLayer.querySelectorAll(`[data-pid="${poly.id}"]`).forEach(n=>n.remove());
  
    /* 2. draw outline + slices exactly as drawFullGrid does, but
          wrap them all in <g data-pid=".."> so they can be removed fast. */
    const SIDE = C.BASE_SIDE / store.state.density;
    const groupOutline = document.createElementNS(C.NS,'g');
    groupOutline.dataset.pid = poly.id;
    const pts = [...poly.vertices()].slice(0,-1)
      .map(([q,r]) => `${(q+r/2)*SIDE},${r*C.H_FROM_SIDE(SIDE)}`).join(' ');
    const outline = document.createElementNS(C.NS,'polygon');
    outline.setAttribute('points', pts);
    outline.setAttribute('fill','none');
    outline.setAttribute('stroke', poly.fill);
    outline.setAttribute('stroke-width',1);
    groupOutline.appendChild(outline);
    DOM.polygonLayer.appendChild(groupOutline);
  
    /* slices */
    const frame = store.state.frame;
    const { padPx, radiusPx } = { padPx:store.padPx, radiusPx:store.radiusPx };
    const slices = getSlices(poly, frame, SIDE, C.H_FROM_SIDE, padPx, radiusPx);
    const gClip  = document.createElementNS(C.NS,'g');
    gClip.dataset.pid = poly.id;
    slices.forEach(s=>{
      const path = document.createElementNS(C.NS,'path');
      path.setAttribute('d', s.path);
      path.setAttribute('fill', s.fill);
      path.setAttribute('stroke','none');
      path.style.pointerEvents = 'none';
      gClip.appendChild(path);
    });
    DOM.clipLayer.appendChild(gClip);
  };





// Re-export them as a single, namespaced 'Renderer' object
export const Renderer = {
    drawFrame,
    drawMesh,
    drawAxes,
    drawVertices,
    clearAllLayers,
    setViewBox,
    redrawSavedPolygons,
    drawTempLine,
    removeLastTempLine,
    clearAllTempLines,
    redrawSinglePolygon
};