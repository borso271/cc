import * as C from '../../../core/constants.js';
import * as DOM from '../../../core/dom-elements.js';
import { setL } from '../../../utils.js';
export function drawMesh(vertices, ROWS, COLS) {
    const edge = (i, j) => {
      const l = document.createElementNS(C.NS, 'line');
      setL(l, vertices[i].x, vertices[i].y, vertices[j].x, vertices[j].y);
      l.classList.add('meshLine');
      DOM.meshLayer.appendChild(l);
    };
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      if (c < COLS - 1) edge(i, i + 1);
      if (r < ROWS - 1) {
        const d = i + COLS;
        edge(i, d);
        if (r % 2 === 0 && c > 0) edge(i, d - 1);
        if (r % 2 === 1 && c < COLS - 1) edge(i, d + 1);
      }
    }
  }
  