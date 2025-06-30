// src/modules/grid/grid-interactions.js

import { store } from '../../core/store.js';
import { pathToPolygon } from '../../utils/path-to-polygon.js';
import { getVertices } from './index.js'; // To get vertex data
import { Renderer } from './render/index.js';
import { BASE_SIDE, BASE_ROWS, BASE_COLS } from '../../core/constants.js';
import { H } from '../../utils.js';




let currentPath = []; // Internal state for the current drawing path

// --- Private Helpers -------------------------------------------------
function resetPath() {
  const vertices = getVertices();
  currentPath.forEach(i => vertices[i].el.classList.remove('active'));
  currentPath = [];
  Renderer.clearAllTempLines();
}

// --- Exported Handlers ----------------------------------------------

export function handleVertexClick(e) {
  e.stopPropagation();
  const i        = +e.target.dataset.i;
  const vertices = getVertices();

  /* —— undo last click —— */
  if (currentPath.length && i === currentPath.at(-1)) {
    currentPath.pop();
    vertices[i].el.classList.remove('active');
    Renderer.removeLastTempLine();
    return;
  }

  /* —— close path into a Polygon —— */
  if (currentPath.length >= 3 && i === currentPath[0]) {
    const { verts, pose } = pathToPolygon(currentPath, vertices);
    if (verts) store.addPolygon(verts, pose);
    resetPath();
    return;
  }

  /* —— ignore re-click on any earlier vertex —— */
  if (currentPath.includes(i)) return;

  /* —— forward progress —— */
  const lastV = currentPath.length ? vertices[currentPath.at(-1)] : null;
  currentPath.push(i);
  vertices[i].el.classList.add('active');
  if (lastV) Renderer.drawTempLine(lastV, vertices[i]);
}

export function handlePolygonClick(e, poly) {
  e.stopPropagation();
  store.selectPolygon(poly.id);          // id-based selection
}

export function handleCanvasClick() {
  store.selectPolygon(null);
  if (currentPath.length) resetPath();    // cancel incomplete path
}


export function placeFrame(vChoice = "top", hChoice = "center") {
    const density  = store.state.density;
    const SIDE     = BASE_SIDE / density;
    const ROW_H    = H(SIDE);                 // pixel height of one grid row
    // const COL_W    = SIDE;                    // pixel width of one column
    const COL_W   = SIDE / 2;
    // grid extents
    const ROWS = Math.round(BASE_ROWS * density);
    const COLS = Math.round(BASE_COLS * density);
    const gridW = (COLS - 1) * SIDE + SIDE;
    const gridH = (ROWS - 1) * ROW_H;
  
    // frame size in pixels
    const f   = store.state.frame;
    const wPx = f.widthMult  * SIDE;
    const hPx = f.heightMult * ROW_H;
  
    /* ----- horizontal ----- */
    let x = f.x;
    switch (hChoice) {
    //   case 'left':   x = 0;                    break;
    //   case 'right':  x = gridW - wPx;          break;

         case 'left': {
             const centredLeft = (gridW - wPx) / 2;
             x = Math.floor(centredLeft / COL_W) * COL_W;
             break;
           }
           case 'right': {
             const centredRight = (gridW + wPx) / 2;     // left + width
             const colX = Math.ceil(centredRight / COL_W) * COL_W;
             x = colX - wPx;
             break;
           }

      case 'center': x = (gridW - wPx) / 2;    break;
    }

    /* ----- vertical ----- */
    let y = f.y;
    switch (vChoice) {
      case 'top': {
        const centredTop = (gridH - hPx) / 2;
        y = Math.floor(centredTop / ROW_H) * ROW_H;
        break;
      }
      case 'bottom': {
        const centredBot = (gridH + hPx) / 2;
        const rowY       = Math.ceil(centredBot / ROW_H) * ROW_H;
        y = rowY - hPx;
        break;
      }
      case 'center': y = (gridH - hPx) / 2;    break;
    }
  
    store.patchFrame({ x, y });               // one emit → one rebuild
  }
  











import { drawFullGrid } from './index.js';
import * as C from '../../core/constants.js';
import * as DOM from '../../core/dom-elements.js';

function svgPt (e) {
    const p = DOM.svg.createSVGPoint();
    p.x = e.clientX; p.y = e.clientY;
    return p.matrixTransform(DOM.svg.getScreenCTM().inverse());
  }
  
  
  const DIR_PIX_TO_AXIAL = (x, y, SIDE) => ({
    dq : Math.round( (x - y/Math.sqrt(3)) / SIDE ),
    dr : Math.round( y * 2/Math.sqrt(3) / SIDE )
  });
  let dragPoly   = null;      // Polygon instance being dragged
  let startPose  = null;      // {q,r}
  let startMouse = null;      // pixel coords
  

  export function onPolyPointerDown (e, poly) {
  if (store.state.selectedId !== poly.id) return;   // only selected moves
  e.stopPropagation();
  dragPoly   = poly;
  startPose  = { q: poly.pose.q, r: poly.pose.r };
  const p    = svgPt(e);                              // helper from grid.js
  startMouse = { x:p.x, y:p.y };
  DOM.svg.onpointermove = onDragMove;
  DOM.svg.onpointerup   = onDragEnd;
  }
  


  function onDragMove(e){
  if (!dragPoly) return;
  const p  = svgPt(e);
  const dx = p.x - startMouse.x;
  const dy = p.y - startMouse.y;
  const SIDE = C.BASE_SIDE / store.state.density;
  
  /* convert pixel delta -> snapped axial delta */
  const { dq, dr } = DIR_PIX_TO_AXIAL(dx, dy, SIDE);
  
  /* preview move */
  dragPoly.pose.q = startPose.q + dq;
  dragPoly.pose.r = startPose.r + dr;
     
  Renderer.redrawSinglePolygon(dragPoly); // lightweight helper
                   // light enough for a quick preview
  }
  
  function onDragEnd(){
  if (!dragPoly) return;
  const dq = dragPoly.pose.q - startPose.q;
  const dr = dragPoly.pose.r - startPose.r;
  DOM.svg.onpointermove = DOM.svg.onpointerup = null;
  
 

  /* 1 · undo the preview move */
  dragPoly.pose.q = startPose.q;
  dragPoly.pose.r = startPose.r;

  /* 2 · now commit exactly once through the store helper */
  store.applyTransform(p => p.translate(dq, dr));


  dragPoly = null;
  }
  