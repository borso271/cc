// utils/random-blob.js
import { triKey, neighbours } from './polygon-mask-utils.js';
import { maskToPolygon } from './polygon-mask-utils.js';
import { Polygon } from '../classes/polygon.js';
import { store } from '../core/store.js';



// // utils/random-blob.js
// import { triKey, neighbours }     from './tri-utils.js';
// import { maskToPolygon }          from './polygon-mask-utils.js';
// import { store }                  from '../core/store.js';

/* helpers to unpack q,r from a packed triKey -------------------- */
const qOf = tk => (tk >> 17) & 0x7fff;     // uses your original layout
const rOf = tk => (tk >>  2) & 0x7fff;

/**
 * Grow-blob generator
 * @param {number}   N        target triangle count   (≥3)
 * @param {number}   compact  0…1 prefer compactness  (default 0.7)
 * @param {function} rnd      RNG                     (default Math.random)
 * @returns {Polygon}
 */
export function makeRandomBlob (N, compact = 0.9, rnd = Math.random){

  /* ---- 1 · pick a seed safely inside the lattice ------------- */
  const b = store.gridBounds;                        // live bounds
  const seedQ = Math.floor(rnd() * (b.maxQ - b.minQ - 4)) + b.minQ + 2;
  const seedR = Math.floor(rnd() * (b.maxR - b.minR - 4)) + b.minR + 2;
  const mask   = new Set([
    triKey(seedQ, seedR, rnd() < 0.5 ? 0 : 1)        // random up/down
  ]);

  /* ---- 2 · expand until we reach N triangles ----------------- */
  while (mask.size < N){

    /* collect frontier triangles still inside lattice ---------- */
    const frontier = new Set();
    mask.forEach(tk => neighbours(tk).forEach(nk=>{
      if (mask.has(nk)) return;                      // already inside
      const q = qOf(nk), r = rOf(nk);
      if (q < b.minQ || q > b.maxQ || r < b.minR || r > b.maxR) return;
      frontier.add(nk);
    }));

    if (frontier.size === 0){
      /* stuck against border → restart blob generation ---------- */
      return makeRandomBlob(N, compact, rnd);        // tail-call
    }

    const frontArr = [...frontier];
    let pick;

    if (rnd() < compact){
      /* prefer triangles that close concavities ---------------- */
      frontArr.sort((a,b)=>
        neighbours(b).filter(tk=>mask.has(tk)).length -
        neighbours(a).filter(tk=>mask.has(tk)).length);
      pick = frontArr[0];
    } else {
      pick = frontArr[Math.floor(rnd()*frontArr.length)];
    }
    mask.add(pick);
  }

  /* ---- 3 · convert mask → canonical Polygon ----------------- */
  const poly = maskToPolygon(mask,
               `hsl(${Math.floor(rnd()*360)} 80% 60%)`);

  /* ---- 4 · choose a pose that keeps it wholly inside lattice - */
  poly.pose.q = Math.floor(rnd() * (b.maxQ - b.minQ + 1)) + b.minQ;
  poly.pose.r = Math.floor(rnd() * (b.maxR - b.minR + 1)) + b.minR;

  return poly;
}
