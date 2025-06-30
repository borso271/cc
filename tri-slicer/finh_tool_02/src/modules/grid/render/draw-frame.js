import * as C from '../../../core/constants.js';
import * as DOM from '../../../core/dom-elements.js';

let frameRect = null; // Internal reference for efficient updates

export function drawFrame(frameData, SIDE) {
    DOM.frameLayer.innerHTML = '';
    const wPx = frameData.widthMult * SIDE;
    const hPx = frameData.heightMult * C.H_FROM_SIDE(SIDE);
    
    frameRect = document.createElementNS(C.NS, 'rect');
    frameRect.classList.add('frame');
    frameRect.setAttribute('x', frameData.x);
    frameRect.setAttribute('y', frameData.y);
    frameRect.setAttribute('width', wPx);
    frameRect.setAttribute('height', hPx);
    DOM.frameLayer.appendChild(frameRect);
  }


