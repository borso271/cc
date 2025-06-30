import * as C from '../../../core/constants.js';
import * as DOM from '../../../core/dom-elements.js';

// export function drawVertices(vertices, onVertexClick) {
//     vertices.forEach((v, i) => {
//       const circle = document.createElementNS(C.NS, 'circle');
//       circle.setAttribute('cx', v.x);
//       circle.setAttribute('cy', v.y);
//       circle.setAttribute('r', 3);
//       circle.classList.add('vertex');
//       circle.dataset.i = i;
//       circle.addEventListener('click', onVertexClick);
//       DOM.vertexLayer.appendChild(circle);
//       v.el = circle; // Attach the DOM element to the data object
//     });
//   }
export function drawVertices(vertices, onVertexClick){
  /* visible circles (below slices) ---------------------------- */
  DOM.vertexLayer.innerHTML = '';
  DOM.vertexHitLayer.innerHTML = '';          // <- clear hits too

  vertices.forEach((v,i)=>{
    /* --- visible mark ---------------------------------------- */
    const cVis = document.createElementNS(C.NS,'circle');
    cVis.setAttribute('cx', v.x);
    cVis.setAttribute('cy', v.y);
    cVis.setAttribute('r', 3);
    cVis.classList.add('vertex');
    cVis.dataset.i = i;
    DOM.vertexLayer.appendChild(cVis);

    /* --- invisible hit circle (on top) ----------------------- */
    const cHit = document.createElementNS(C.NS,'circle');
    cHit.setAttribute('cx', v.x);
    cHit.setAttribute('cy', v.y);
    cHit.setAttribute('r', 5);               // a bit larger
    cHit.setAttribute('fill','transparent');
    cHit.style.pointerEvents = 'all';
    cHit.dataset.i = i;
    cHit.addEventListener('click', onVertexClick);
    DOM.vertexHitLayer.appendChild(cHit);

    v.el = cVis;                             // keep visible ref
  });
}
