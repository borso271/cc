
// import { store } from '../../core/store.js';
// import * as C from '../../core/constants.js';
// import * as DOM from '../../core/dom-elements.js';

// function svgPt (e) {
//     const p = DOM.svg.createSVGPoint();
//     p.x = e.clientX; p.y = e.clientY;
//     return p.matrixTransform(DOM.svg.getScreenCTM().inverse());
//   }
  
  
//   const DIR_PIX_TO_AXIAL = (x, y, SIDE) => ({
//     dq : Math.round( (x - y/Math.sqrt(3)) / SIDE ),
//     dr : Math.round( y * 2/Math.sqrt(3) / SIDE )
//   });
//   let dragPoly   = null;      // Polygon instance being dragged
//   let startPose  = null;      // {q,r}
//   let startMouse = null;      // pixel coords
  
//   export function onPolyPointerDown (e, poly) {
//   if (store.state.selectedId !== poly.id) return;   // only selected moves
//   e.stopPropagation();
//   dragPoly   = poly;
//   startPose  = { q: poly.pose.q, r: poly.pose.r };
//   const p    = svgPt(e);                              // helper from grid.js
//   startMouse = { x:p.x, y:p.y };
//   DOM.svg.onpointermove = onDragMove;
//   DOM.svg.onpointerup   = onDragEnd;
//   }
  
//   function onDragMove(e){
//   if (!dragPoly) return;
//   const p  = svgPt(e);
//   const dx = p.x - startMouse.x;
//   const dy = p.y - startMouse.y;
//   const SIDE = C.BASE_SIDE / store.state.density;
  
//   /* convert pixel delta -> snapped axial delta */
//   const { dq, dr } = DIR_PIX_TO_AXIAL(dx, dy, SIDE);
  
//   /* preview move */
//   dragPoly.pose.q = startPose.q + dq;
//   dragPoly.pose.r = startPose.r + dr;
//   drawFullGrid();                       // light enough for a quick preview
//   }
  
//   function onDragEnd(){
//   if (!dragPoly) return;
//   const dq = dragPoly.pose.q - startPose.q;
//   const dr = dragPoly.pose.r - startPose.r;
//   DOM.svg.onpointermove = DOM.svg.onpointerup = null;
  
//   /* commit through store so bounding-clamp + cache clear happen */
//   store.applyTransform(p => p.translate(dq, dr));
//   dragPoly = null;
//   }
  