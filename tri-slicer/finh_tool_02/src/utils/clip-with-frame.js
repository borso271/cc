/* utils/clip-with-frame.js
   --------------------------------------------------------------
   • Clips each Polygon against the frame (via polygon-clipping)
   • Insets by `pad` pixels, then rounds corners with radius `rad`
   • Caches slices per poly.id + frame pose + pad + radius
---------------------------------------------------------------- */

import pc from 'https://esm.sh/polygon-clipping@0.15';
import { insetAndRound } from './round-utils.js';

/* ---------- runtime cache + logger --------------------------- */
export const sliceCache = new Map();   // poly.id → { stamp, data[] }

function logSliceCache(label){
  const rows = [];
  sliceCache.forEach(({ data }, parentId) =>
    data.forEach((s,i)=> rows.push({
      event: label, parentId, sliceNo: i, verts: s.verts.length, path: s.path.length
    }))
  );
  console.table(rows);
}

export const clearSliceCache = () => { sliceCache.clear(); logSliceCache('cleared'); };

/* ---------- core Boolean clip (no cache) --------------------- */
export function clipWithFrame(poly, frame, SIDE, H){
  /* 1. lattice → pixel ring */
  const ring = [...poly.vertices()]
                 .slice(0,-1)
                 .map(([q,r]) => [(q + r/2)*SIDE, r*H(SIDE)]);
  const subject = [ring];

  /* 2. frame rectangle as MultiPolygon */
  const {x,y,widthMult,heightMult} = frame;
  const W = widthMult*SIDE, Hpx = heightMult*H(SIDE);
  const rect = [[[ [x,y],[x+W,y],[x+W,y+Hpx],[x,y+Hpx],[x,y] ]]];

  /* 3. intersection => MultiPolygon */
  const result = pc.intersection(subject, rect);

  /* 4. flatten to simple pieces */
  const pieces = [];
  result.forEach(polyArr =>
    polyArr.forEach(r =>
      r.length>=4 && pieces.push({ verts: r.slice(0,-1), fill: poly.fill })
    )
  );
  return pieces;                             // [] if none inside
}

/* ---------- cached wrapper with pad & radius ----------------- */
export function getSlices(poly, frame, SIDE, H, pad = 0, rad = 0){
  const stamp = `${frame.x}|${frame.y}|${frame.widthMult}|${frame.heightMult}|${pad}|${rad}`;
  const hit   = sliceCache.get(poly.id);
  if (hit && hit.stamp === stamp) return hit.data;   // cache HIT

  /* MISS → recompute, inset + round */
  const raw  = clipWithFrame(poly, frame, SIDE, H);
  const data = raw.map(piece => ({
    verts : piece.verts,
    fill  : piece.fill,
    path  : insetAndRound(piece.verts, pad, rad)   // SVG “d” string
  }));

  sliceCache.set(poly.id, { stamp, data });
  logSliceCache(`set id=${poly.id}`);
  return data;
}

// // utils/clip-with-frame.js
// // const polygonClipping = require('polygon-clipping')
// import pc from 'https://esm.sh/polygon-clipping@0.15';
// /**
//  * @param {Polygon} poly            canonical lattice polygon
//  * @param {object}  frame           {x,y,widthMult,heightMult}
//  * @param {number}  SIDE            lattice unit in px
//  * @param {fn}      H               q,r ⇒ pixel-row height
//  * @returns {Array<{ verts:number[][], fill:string }>}
//  */
// /* ---------- runtime cache + logger --------------------------------- */
// export const sliceCache = new Map();         // poly.id → { stamp, data }

// /* helper prints one line per parent polygon */

// /* --- new logger: one row per slice --------------------------- */
// function logSliceCache(label){
//     const rows = [];
//     sliceCache.forEach(({ data }, parentId) => {
//       data.forEach((slice, i) => {
//         rows.push({
//           event   : label,           // e.g. 'set id=3' or 'cleared'
//           parentId,
//           sliceNo : i,               // 0,1,2… per parent
//           verts   : slice.verts.length
//         });
//       });
//     });
//     console.table(rows);
//   }
  
// /* clear all slices on frame / density change ------------------------ */
// export function clearSliceCache () {
//   sliceCache.clear();
//   logSliceCache('cleared');
// }

// /* cached wrapper around clipWithFrame --------------------------------*/
// export function getSlices(poly, frame, SIDE, H){
//   const stamp = `${frame.x}|${frame.y}|${frame.widthMult}|${frame.heightMult}`;
//   const hit   = sliceCache.get(poly.id);
//   if (hit && hit.stamp === stamp) return hit.data;      // cache hit

//   const data = clipWithFrame(poly, frame, SIDE, H);     // recompute
//   sliceCache.set(poly.id, { stamp, data });
//   logSliceCache(`set id=${poly.id}`);                   // ← log update
//   return data;
// }


// export function clipWithFrame(poly, frame, SIDE, H) {
//     /* 1. lattice polygon to pixel ring */
//     const subjectRing = [...poly.vertices()]
//                           .slice(0, -1)
//                           .map(([q, r]) => [(q + r / 2) * SIDE, r * H(SIDE)]);
//     const subject = [subjectRing];

    

//   /* 2. Frame rectangle in same format */
//   const {x,y,widthMult,heightMult} = frame;
//   const W = widthMult  * SIDE;
//   const Hpx = heightMult * H(SIDE);
//   const rect = [[
//     [x,y], [x+W,y], [x+W,y+Hpx], [x,y+Hpx], [x,y]   // closed ring
//   ]];

//   /* 3. Boolean intersection */
//   const result = pc.intersection(subject, rect);     // MultiPolygon

//   /* 4. Flatten & convert to your renderer format */
//   const pieces = [];
//   result.forEach(ringArr =>      // MultiPoly → Poly
//     ringArr.forEach(ring => {    // Poly      → Ring (outer first)
//       if (ring.length < 4) return;               // degenerate
//       pieces.push({
//         verts : ring.slice(0,-1),                // drop closing dup
//         fill  : poly.fill
//       });
//     })
//   );
//   return pieces;                                  // [] = none inside
// }
