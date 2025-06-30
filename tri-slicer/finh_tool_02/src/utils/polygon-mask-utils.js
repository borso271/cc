
import { Polygon } from "../classes/polygon.js";


/* ---------- Triangle key helpers -------------------------------- */
// export const triKey   = (q,r,up) => (q<<17) | (r<<1) | up;          // 13|13|1 bits


export const triUnKey = k => k.split(',').map(Number);   // [q,r,up]


export const triKey = (q, r, up) => `${q},${r},${up}`;   // string

export const qOf  = tk => +tk.split(',')[0];
export const rOf  = tk => +tk.split(',')[1];
export const upOf = tk => +tk.split(',')[2];
// Remove every old bit-wise version 


/* ---------- Polygon → mask  (wrapper around Polygon.triMask) ---- */
export function polygonToMask(poly, keyFn = triKey) {
  return poly.triMask(keyFn);   // re‑use the even‑odd fill already in class
}








/* ---------- Mask → canonical Polygon ------------------------ */
export function maskToPolygon(mask, fill = 'hsl(0 0% 80%)') {
  if (!mask.size) throw new Error('maskToPolygon: empty mask');

  /* 1 ─ build half-edge map (drop internal edges) ------------- */
  const edgeMap = new Map();                    // startKey → [q1,r1,q2,r2]
  const keyEdge = (q1,r1,q2,r2)=>`${q1},${r1},${q2},${r2}`;
  const revKey  = (q1,r1,q2,r2)=>`${q2},${r2},${q1},${r1}`;

  function addEdge(q1,r1,q2,r2){
    const k  = keyEdge(q1,r1,q2,r2);
    const rk = revKey (q1,r1,q2,r2);
    if (edgeMap.has(rk)) edgeMap.delete(rk);    // internal → discard both
    else                 edgeMap.set(k,[q1,r1,q2,r2]);
  }

  for (const k of mask){
    
      const q  = qOf(k);
  const r  = rOf(k);
 const up = upOf(k);


    if (up){                    /* ▲ --------------------------- */
      addEdge(q  , r  , q+1, r-1);   // left
      addEdge(q+1, r-1, q  , r-1);   // top
      addEdge(q  , r-1, q  , r  );   // right
    }else{                     /* ▼ --------------------------- */
      addEdge(q  , r  , q+1, r  );   // left
      addEdge(q+1, r  , q+1, r+1);   // bottom  (was r-1) ✅
      addEdge(q+1, r+1, q  , r+1);   // right   (was r-1) ✅
    }
  }

  if (!edgeMap.size)
    throw new Error('maskToPolygon: mask reduced to zero edges');

  /* 2 ─ adjacency: startVertex → nextVertex (clockwise) --------*/
  const adj = new Map();                       // "q,r" → [q2,r2]
  for (const [,e] of edgeMap){
    const [q1,r1,q2,r2] = e;
    adj.set(`${q1},${r1}`,[q2,r2]);
  }

  /* 3 ─ pick lexicographically smallest vertex to start loop -- */
  const startKey = [...adj.keys()].sort((a,b)=>{
    const [qA,rA] = a.split(',').map(Number);
    const [qB,rB] = b.split(',').map(Number);
    return qA!==qB ? qA-qB : rA-rB;
  })[0];

  /* 4 ─ walk the border clockwise ----------------------------- */
  const verts = [];
  let [q,r] = startKey.split(',').map(Number);
  do{
    verts.push([q,r]);
    const next = adj.get(`${q},${r}`);
    if (!next)
      throw new Error(`maskToPolygon: dangling edge at ${q},${r}`);
    [q,r] = next;
  }while(!(q===verts[0][0] && r===verts[0][1]));

  if (verts.length < 4)
    throw new Error('maskToPolygon: degenerate polygon (fewer than 3 vertices)');

  /* 5 ─ translate so first vertex becomes (0,0) --------------- */
  const [Q0,R0] = verts[0];
  const localVerts = verts.map(([q,r]) => [q-Q0, r-R0]);

  return new Polygon(
    localVerts,                     // canonical vertex list
    { q:Q0, r:R0, R:0, F:0 },       // pose in world coords
    fill
  );
}



/**
 * Return the three edge-sharing neighbours of a triangle key.
 * Works for an “even-r horizontal” lattice.
 * @param {number} tk  packed triKey
 * @returns {number[]} array of 3 triKeys
 */


export const neighbours = tk => {
  const q = qOf(tk), r = rOf(tk), up = upOf(tk);
  return up
    ? [ triKey(q, r, 0),
        triKey(q, r-1, 0),
        triKey(q+1, r-1, 0) ]
    : [ triKey(q, r, 1),
        triKey(q-1, r+1, 1),
        triKey(q,   r+1, 1) ];
};