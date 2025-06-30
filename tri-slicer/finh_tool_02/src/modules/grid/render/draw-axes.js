import * as C from '../../../core/constants.js';
import * as DOM from '../../../core/dom-elements.js';
import { setL } from '../../../utils.js';

export function drawAxes(w, h) {
    const cx = w / 2, cy = h / 2;
    const hL = document.createElementNS(C.NS, 'line');
    setL(hL, -C.MARGIN, cy, w + C.MARGIN, cy);
    hL.classList.add('guideLine');
    DOM.axisGroup.appendChild(hL);
    const vL = document.createElementNS(C.NS, 'line');
    setL(vL, cx, -C.MARGIN, cx, h + C.MARGIN);
    vL.classList.add('guideLine');
    DOM.axisGroup.appendChild(vL);
  }
  