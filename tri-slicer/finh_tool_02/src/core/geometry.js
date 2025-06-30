export function clampDelta(poly, dq, dr, bounds){
    /* current bbox */
    const verts = [...poly.vertices()];
    const minQ = Math.min(...verts.map(v=>v[0])) + dq;
    const maxQ = Math.max(...verts.map(v=>v[0])) + dq;
    const minR = Math.min(...verts.map(v=>v[1])) + dr;
    const maxR = Math.max(...verts.map(v=>v[1])) + dr;
  
    if (minQ < bounds.minQ) dq += bounds.minQ - minQ;
    if (maxQ > bounds.maxQ) dq += bounds.maxQ - maxQ;
    if (minR < bounds.minR) dr += bounds.minR - minR;
    if (maxR > bounds.maxR) dr += bounds.maxR - maxR;
  
    return { dq, dr };
  }
  


  // core/geom.js   (new)
import { store } from './store.js';
import * as C    from './constants.js';

export const SIDE = () =>
  C.BASE_SIDE / store.state.density;     // always in sync
