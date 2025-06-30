import * as DOM from '../core/dom-elements.js';
import * as C   from '../core/constants.js';
import { triKey, qOf, rOf } from './polygon-mask-utils.js';


const GREEN = 'limegreen', RED = 'crimson';

/* ----- triangle ring (closed) in pixel space ---------------- */
function triRingPx(tk, SIDE){
    const q  = qOf(tk);
    const r  = rOf(tk);
    const up = tk & 1;                // 1 = ▲, 0 = ▼
    const H  = SIDE * Math.sqrt(3) / 2;
  
    const x0 = (q + r / 2) * SIDE;
    const y0 =  r * H;
  
    return up
      ? [ [x0,           y0          ],
          [x0 + SIDE,    y0          ],
          [x0 + SIDE/2,  y0 - H      ],
          [x0,           y0          ] ]   // close
      : [ [x0,           y0          ],
          [x0 + SIDE,    y0          ],
          [x0 + SIDE/2,  y0 + H      ],
          [x0,           y0          ] ];
  }
  
  /* ----- draw mask overlay ------------------------------------ */
  export function drawTriMaskOverlay(poly, SIDE, colour = GREEN){
    const layer = DOM.debugMaskLayer;
    layer.innerHTML = '';
  
    const mask = poly.triMask(triKey);
  
    mask.forEach(tk => {
      const ring = triRingPx(tk, SIDE);
      const pts  = ring.map(([x,y]) => `${x},${y}`).join(' ');
      const p    = document.createElementNS(C.NS, 'polygon');
      p.setAttribute('points', pts);
      p.setAttribute('fill',   colour);
      p.setAttribute('stroke', colour);
      p.setAttribute('stroke-width', 0.3);
      layer.appendChild(p);
    });
  }
  