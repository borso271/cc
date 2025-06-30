/* utils/split-polygon.js --------------------------------------- */
import { triKey, neighbours } from './polygon-mask-utils.js';
import { maskToPolygon } from './polygon-mask-utils.js';
import { qOf, rOf }           from './polygon-mask-utils.js';

/**
 * Split a parent Polygon into `n` contiguous sub-polygons.
 * @param {Polygon} parent      polygon to split
 * @param {number}  n           desired number of parts (≥ 1)
 * @param {Function} rng=Math.random  optional PRNG
 * @returns {Polygon[]}  array of child polygons (length ≤ n)
 */
export function splitPolygon (parent, n, rng = Math.random){
  /* ---------- 1 · full triangle mask ------------------------- */
  const mask = parent.triMask(triKey);                 // Set<string>
  if (n <= 1 || mask.size <= n) return [parent];       // nothing to do

  /* ---------- 2 · choose n random seeds ---------------------- */
  const triList = [...mask];
  for (let i = triList.length - 1; i; i--) {           // Fisher-Yates
    const j = Math.floor(rng() * (i + 1));
    [triList[i], triList[j]] = [triList[j], triList[i]];
  }
  const seeds = triList.slice(0, n);

  /* ---------- 3 · multi-source BFS (contiguous regions) ------ */
  const owner    = new Map();          // triKey → region index
  const frontier = seeds.map(s => new Set([s]));   // wave-fronts

  seeds.forEach((tk,i)=> owner.set(tk, i));

  while (owner.size < mask.size){
    frontier.forEach((wave,i)=>{
      const next = new Set();
      wave.forEach(tk=>{
        neighbours(tk).forEach(ntk=>{
          if (!mask.has(ntk) || owner.has(ntk)) return;
          owner.set(ntk, i);           // claim for this region
          next.add(ntk);
        });
      });
      frontier[i] = next;              // advance this wave
    });
  }

  /* ---------- 4 · build child polygons ----------------------- */
  const regionMasks = Array.from({ length:n }, () => new Set());
  owner.forEach((idx, tk) => regionMasks[idx].add(tk));



 console.log(
       'splitPolygon » mask size', mask.size,
       '| region sizes', regionMasks.map(m => m.size)
     );

  return regionMasks
    .filter(m => m.size)               // skip impossible empty region
    .map(m => {
      const child = maskToPolygon(m, parent.fill);

      /* pose alignment: keep parent rotation/flip, translate so
         lattice position matches the absolute q,r of the mask. */
      const absMinQ = Math.min(...[...m].map(qOf));
      const absMinR = Math.min(...[...m].map(rOf));

      const relMask = child.triMask(triKey);
      const relMinQ = Math.min(...[...relMask].map(qOf));
      const relMinR = Math.min(...[...relMask].map(rOf));

      child.pose = {
        ...parent.pose,
        q: parent.pose.q + absMinQ - relMinQ,
        r: parent.pose.r + absMinR - relMinR
      };
      return child;
    });
}
