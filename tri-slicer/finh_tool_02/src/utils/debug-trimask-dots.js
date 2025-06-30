// utils/debug-trimask-dots.js
// -------------------------------------------------------------
// Draw an overlay of dots, one at the centroid of every triangle
// returned by poly.triMask().  Uses the same centroid helper
// as triMask, so the overlay is always in perfect agreement.

import * as DOM from '../core/dom-elements.js';
import { triKey, qOf, rOf,upOf }   from './polygon-mask-utils.js';
import { centroidPixel }      from './tri-centroid.js';
import * as C from '../core/constants.js';


export function drawTriMaskDots(poly, SIDE, colour='limegreen', dotR=2){
  const layer = DOM.debugMaskLayer;
  layer.innerHTML = '';

  poly.triMask(triKey).forEach(tk=>{
    const q  = qOf(tk);
    const r  = rOf(tk);
    const up = upOf(tk);                       // correct

    const [cx, cy] = centroidPixel(q, r, up, SIDE);

    const dot = document.createElementNS(C.NS,'circle');
    dot.setAttribute('cx', cx);
    dot.setAttribute('cy', cy);
    dot.setAttribute('r',  dotR);
    dot.setAttribute('fill', colour);
    layer.appendChild(dot);
  });
}
