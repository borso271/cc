
/* ──────────────────────────────────────────────────────────────
 * Polygon - arbitrary edges on a triangular lattice
 *    • verts : Int16Array [q0,r0,q1,r1,…]  (clockwise loop)
 *    • pose  : translation q,r  +  R∈0-5  + flip F∈0/1
 *    • id    : stable key
 *    • canon : canonical digest of vertex list
 * ---------------------------------------------------------------- */


/* helpers once in polygon.js ---------------------------------- */


// Packs {q, r, up} into a single 32-bit integer.
// Using fewer bits would be possible with constraints on q/r range.

import { triKey,rOf,qOf, neighbours } from "../utils/polygon-mask-utils.js";
import { centroidPixel } from "../utils/tri-centroid.js";
import { SIDE } from "../core/geometry.js";
/**
 * Gets the 3 adjacent neighbors of a given triangle.
 * This is essential for the splitting algorithm to work.
 * @param {number} tk The triangle key.
 * @returns {number[]} An array of 3 neighbor keys.
 */
// function neighbours(tk) {
//     const q = qOf(tk);
//     const r = rOf(tk);
//     if (upOf(tk)) { // Up-pointing triangle ▲
//         // Neighbors are the 3 adjacent down-pointing triangles ▼
//         return [
//             triKey(q, r, 0),     // The one below it in the same hex
//             triKey(q + 1, r, 0), // The one to the right
//             triKey(q, r - 1, 0)  // The one to the top-left
//         ];
//     } else { // Down-pointing triangle ▼
//         // Neighbors are the 3 adjacent up-pointing triangles ▲
//         return [
//             triKey(q, r, 1),     // The one above it in the same hex
//             triKey(q - 1, r, 1), // The one to the left
//             triKey(q, r + 1, 1)  // The one to the bottom-right
//         ];
//     }
// }


function _logPoly(poly, label){
    const verts = [...poly.vertices()];
    const v0    = verts[0];
    const v1    = verts[1];               // <- second vertex shows rotation
    const SIDE  = 50;
    const toPx  = ([q,r]) => [
      ((q + r/2) * SIDE).toFixed(1),
      ( r * Math.sqrt(3)/2 * SIDE).toFixed(1)
    ];
    console.log(label, {
      pose : { ...poly.pose },
      v0Axial   : v0,
      v0Pixel   : toPx(v0),
      v1Axial   : v1,
      v1Pixel   : toPx(v1)
    });
  }
  










  /* classes/polygon.js
   Rotation + mirror now correct for an even-r horizontal (q,r) basis  */

export class Polygon {
    /* ───────── data & ctor ────────────────────────────────────── */
    static _nextId = 1;
  
    constructor(
      verts,
      pose  = { q:0, r:0, R:0, F:0 },
      fill  = 'hsl(0 0% 80%)',
      canon = null,
      id    = null
    ){
      this.verts = verts instanceof Int16Array
        ? verts
        : Int16Array.from(verts.flat());
  
      this.pose  = { q:pose.q, r:pose.r, R:pose.R%6, F:pose.F?1:0 };
      this.fill  = fill;
      this.id    = id ?? Polygon._nextId++;
      this.canon = canon ?? Polygon._canonicalDigest(this.verts);
    }
  
    /* ───────── helpers ────────────────────────────────────────── */
    static axialToCube(q,r){ return {x:q, y:-q-r, z:r}; }
    static cubeToAxial({x,z}){ return {q:x, r:z}; }
  
    /** axial vertex rotated by R·60 ° CCW (exact table) */
    static rotVertex(q,r,R){
      switch ((R%6+6)%6){
        case 0: return [  q     ,  r      ];          // 0°
        case 1: return [ -r     ,  q+r    ];          // 60°
        case 2: return [ -q-r   ,  q      ];          // 120°
        case 3: return [ -q     , -r      ];          // 180°
        case 4: return [  r     , -q-r    ];          // 240°
        case 5: return [  q+r   , -q      ];          // 300°
      }
    }
  
    /* ───────── fingerprint (unchanged) ────────────────────────── */
    static _canonicalDigest(v){ /* … your existing Booth algo … */ }
  
    /* ───────── transforms ─────────────────────────────────────── */
    translate(dq,dr){ this.pose.q += dq; this.pose.r += dr; }
  
    /** +k·60° CCW, k may be negative */
    rotate(k=1){
      _logPoly(this,'rotate BEFORE');
      this.pose.R = (this.pose.R + k) % 6;
      if (this.pose.R < 0) this.pose.R += 6;
      _logPoly(this,'rotate AFTER');
    }
  
mirror(){
   
  }
  
    /* ───────── lattice vertices iterator ─────────────────────── */
    *vertices(){
      const { q:Tq, r:Tr, R, F } = this.pose;
      const fx = F ? -1 : 1;
  
      for (let i=0;i<this.verts.length;i+=2){
        const q0 = this.verts[i] * fx;
        const r0 = this.verts[i+1];
        let [q,r] = Polygon.rotVertex(q0,r0,R);
        yield [q+Tq, r+Tr];
      }
      /* close loop */
      let [q1,r1] = Polygon.rotVertex(this.verts[0]*fx,this.verts[1],R);
      yield [q1+Tq, r1+Tr];
    }
  


/* ============================================================== */
    /*  NEW, CORRECT triMask IMPLEMENTATION                           */
    /* ============================================================== */

    triMask (keyFn = triKey) {
        /* A — polygon vertices in pixel space ---------------------- */
        const side = SIDE();                        // always current density
        const H    = side * Math.sqrt(3) / 2;
      
        const pixV = [...this.vertices()].map(([q,r]) => [
          (q + r / 2) * side,                      // x
          r * H                                    // y
        ]);
      


        /* B — bounding box in axial ------------------------------- */
  
        const qs = pixV.map(([x,y]) => (x - y / Math.sqrt(3)) / side);
  const rs = pixV.map(([x,y]) =>  y * 2 / (Math.sqrt(3) * side));

        const minQ = Math.floor(Math.min(...qs)) - 1;
        const maxQ = Math.ceil (Math.max(...qs)) + 1;
        const minR = Math.floor(Math.min(...rs)) - 1;
        const maxR = Math.ceil (Math.max(...rs)) + 1;
      
        /* C — pixel-space point-in-polygon test -------------------- */
        const inside = (x, y) => {
          let wn = 0;
          for (let i = 0; i < pixV.length - 1; i++) {
            const [x1,y1] = pixV[i];
            const [x2,y2] = pixV[i+1];
            const crosses = (y1 <= y && y2 > y) || (y1 > y && y2 <= y);
            if (crosses) {
              const t = (y - y1) / (y2 - y1);
              if (x < x1 + t * (x2 - x1) - 1e-9) wn ^= 1;   // ε keeps edge cases out
            }
          }
          return wn === 1;
        };
      
        /* D — scan, test, collect --------------------------------- */
        const mask = new Set();
        for (let q = minQ; q <= maxQ; q++){
          for (let r = minR; r <= maxR; r++){
            for (let up = 0; up < 2; up++){
              const [cx, cy] = centroidPixel(q, r, up, side);
              if (inside(cx, cy)) mask.add( keyFn(q, r, up) );
            }
          }
        }
        return mask;
      }
  
  
  }


  
  /* ───────── DEBUG logger (leave or remove when happy) ────────── */
//   function _logPoly(poly,label){
//     const V = [...poly.vertices()];
//     const v0 = V[0], v1 = V[1];
//     const SIDE = 50;                               // any scale
//     const px = ([q,r]) => [
//       ((q+r/2)*SIDE).toFixed(1),
//       ( r*Math.sqrt(3)/2*SIDE).toFixed(1)
//     ];
//     console.log(label,{
//       pose:{...poly.pose},
//       v0Axial:v0, v0Pixel:px(v0),
//       v1Axial:v1, v1Pixel:px(v1)
//     });
//   }
  

      /* classes/polygon.js
   Complete, corrected Polygon class with proper 60° rotation and
   vertical mirror.  No skew, no double-translate.                    */

// export class Polygon {
//     /* ------------------------------------------------------------ */
//     /*  DATA & CONSTRUCTOR                                          */
//     /* ------------------------------------------------------------ */
//     static _nextId = 1;
  
//     constructor(
//       verts,                                // [[q,r]…] or flat array
//       pose  = { q:0, r:0, R:0, F:0 },       // lattice pose
//       fill  = 'hsl(0 0% 80%)',
//       canon = null,
//       id    = null
//     ){
//       /* flatten vertices once: q,r,q,r,… (Int16 saves memory) */
//       this.verts = verts instanceof Int16Array
//         ? verts
//         : Int16Array.from(verts.flat());
  
//       this.pose  = { q:pose.q, r:pose.r,
//                      R:pose.R % 6, F:pose.F ? 1 : 0 };
//       this.fill  = fill;
//       this.id    = id ?? Polygon._nextId++;
//       this.canon = canon ?? Polygon._canonicalDigest(this.verts);
//     }
  
//     /* ------------------------------------------------------------ */
//     /*  STATIC HELPERS                                              */
//     /* ------------------------------------------------------------ */
  
//     /** axial ↔ cube converters (for mirror) */
//     static axialToCube(q,r){ return {x:q, y:-q-r, z:r}; }
//     static cubeToAxial({x,z}){ return {q:x, r:z}; }
  
//     /** quickest canonical fingerprint (unchanged) */
   


//     /** canonical digest: smallest lexicographic rotation of verts vs mirrored */
//     static _canonicalDigest(v) {
//       const n = v.length / 2;                 // vertices
//       const seq = [...v];                     // flat copy
  
//       // helper: lexicographically minimal rotation of flat x,y list
//       const booth = arr => {
//         let i = 0, j = 2, k = 0;              // step 2 because x,y pairs
//         while (i < arr.length && j < arr.length && k < arr.length) {
//           const a = arr[(i + k) % arr.length];
//           const b = arr[(j + k) % arr.length];
//           if (a === b) { k += 2; continue; }
//           (a > b) ? (i += k + 2) : (j += k + 2);
//           if (i === j) i += 2;
//           k = 0;
//         }
//         const s = Math.min(i, j);
//         return arr.slice(s).concat(arr.slice(0, s));
//       };
  
//       // mirror q → -q
//       const mir = seq.map((val, idx) => (idx % 2 === 0 ? -val : val));
//       const rot  = booth(seq);
//       const rotM = booth(mir);
  
//       // compare flat arrays
//       for (let i = 0; i < rot.length; i++)
//         if (rot[i] !== rotM[i]) return (rot[i] < rotM[i] ? rot : rotM).join(',');
//       return rot.join(',');
//     }
  





//     /* 60° rotation table for vertices (axial basis) */
//     static rotVertex(q,r,R){
//       switch (R & 5){
//         case 0: return [ q      ,  r      ];
//         case 1: return [ -r     ,  q + r  ];
//         case 2: return [ -q-r   ,  q      ];
//         case 3: return [ -q     , -r      ];
//         case 4: return [  r     , -q-r    ];
//         case 5: return [  q+r   , -q      ];
//       }
//     }
  
//     /* ------------------------------------------------------------ */
//     /*  TRANSFORMS                                                  */
//     /* ------------------------------------------------------------ */
//     translate(dq,dr){ this.pose.q += dq; this.pose.r += dr; }
  
//     /** +k·60° counter-clockwise (k may be negative) */
// rotate(k = 1){
//     _logPoly(this, 'rotate BEFORE');
//     this.pose.R = (this.pose.R + k) % 6;    // proper 0-5 wrap
//     if (this.pose.R < 0) this.pose.R += 6;  // handle negative k
//     _logPoly(this, 'rotate AFTER');
//   }
  
//   /** mirror across the vertical pixel axis through pose origin */
//   mirror(){
//     _logPoly(this, 'mirror BEFORE');
  
//     const { q, r } = this.pose;
//     const c = Polygon.axialToCube(q, r);
//     const m = { x: -c.x, y: -c.y, z: c.z }; // (x,y) → (−x,−y)
//     Object.assign(this.pose, Polygon.cubeToAxial(m));
//     this.pose.F ^= 1;                        // reverse edge directions
  
//     _logPoly(this, 'mirror AFTER');
//   }
  
  
//     /* ------------------------------------------------------------ */
//     /*  GEOMETRY                                                    */
//     /* ------------------------------------------------------------ */
//     /** iterator of transformed lattice vertices, incl. closing v0 */
//     *vertices(){
//       const { q:Tq, r:Tr, R, F } = this.pose;
//       const fx = F ? -1 : 1;                // mirror edges
  
//       for (let i=0;i<this.verts.length;i+=2){
//         const q0 = this.verts[i  ] * fx;
//         const r0 = this.verts[i+1];
//         let [q,r] = Polygon.rotVertex(q0,r0,R);   // rotate vertex
//         yield [q+Tq, r+Tr];
//       }
//       /* repeat first vertex to close loop */
//       const q0 = this.verts[0] * fx;
//       const r0 = this.verts[1];
//       let [q1,r1] = Polygon.rotVertex(q0,r0,R);
//       yield [q1+Tq, r1+Tr];
//     }
  
//     /* ------------------------------------------------------------ */
//     /*  TRIANGLE MASK (unchanged)                                   */
//     /* ------------------------------------------------------------ */


//     /* even-odd triangle fill – unchanged from previous version */
//     triMask(key, triCentroid) {
//       const V = [...this.vertices()];
//       const qs = V.map(v => v[0]), rs = V.map(v => v[1]);
//       const minQ = Math.min(...qs) - 1, maxQ = Math.max(...qs) + 1;
//       const minR = Math.min(...rs) - 1, maxR = Math.max(...rs) + 1;
  
//       const centroid = triCentroid ?? ((q,r,up)=>[q+(up?1/3:2/3), r+(up?1/3:2/3)]);
//       const inside = (x,y)=>{
//         let wn=0;
//         for(let i=0;i<V.length-1;i++){
//           const [x1,y1]=V[i], [x2,y2]=V[i+1];
//           if((y1<=y&&y2>y)||(y1>y&&y2<=y)){
//             const t=(y-y1)/(y2-y1);
//             if(x < x1 + t*(x2-x1)) wn^=1;
//           }
//         }
//         return wn===1;
//       };
  
//       const mask=new Set();
//       for(let q=minQ;q<=maxQ;q++){
//         for(let r=minR;r<=maxR;r++){
//           for(let up=0;up<2;up++){
//             const [cx,cy]=centroid(q,r,up);
//             if(inside(cx,cy)) mask.add(key(q,r,up));
//           }
//         }
//       }
//       return mask;
//     }

//   }
  


// export class Polygon {
//     /* -------- constructor --------------------------------------- */
//     static _nextId = 1;
  
//     constructor(
//       verts,                                 // [[q,r], …] or flat array
//       pose  = { q: 0, r: 0, R: 0, F: 0 },
//       fill  = 'hsl(0 0% 80%)',
//       canon = null,
//       id    = null
//     ) {
//       // flatten input
//       this.verts = verts instanceof Int16Array
//         ? verts
//         : Int16Array.from(verts.flat());
  
//       this.pose  = { q: pose.q, r: pose.r, R: pose.R % 6, F: pose.F ? 1 : 0 };
//       this.fill  = fill;
//       this.id    = id ?? Polygon._nextId++;
//       this.canon = canon ?? Polygon._canonicalDigest(this.verts);
//     }
  
//     /* -------- static helpers ------------------------------------ */
//     // rotation matrices for k·60°
//     static MAT60 = [
//       [ 1,  0, 0, 1],   // 0°
//       [ 1, -1, 1, 0],   // 60°
//       [ 0, -1, 1, 1],   // 120°
//       [-1,  0, 0,-1],   // 180°
//       [-1,  1,-1, 0],   // 240°
//       [ 0,  1,-1,-1]    // 300°
//     ];
  
//     /** canonical digest: smallest lexicographic rotation of verts vs mirrored */
//     static _canonicalDigest(v) {
//       const n = v.length / 2;                 // vertices
//       const seq = [...v];                     // flat copy
  
//       // helper: lexicographically minimal rotation of flat x,y list
//       const booth = arr => {
//         let i = 0, j = 2, k = 0;              // step 2 because x,y pairs
//         while (i < arr.length && j < arr.length && k < arr.length) {
//           const a = arr[(i + k) % arr.length];
//           const b = arr[(j + k) % arr.length];
//           if (a === b) { k += 2; continue; }
//           (a > b) ? (i += k + 2) : (j += k + 2);
//           if (i === j) i += 2;
//           k = 0;
//         }
//         const s = Math.min(i, j);
//         return arr.slice(s).concat(arr.slice(0, s));
//       };
  
//       // mirror q → -q
//       const mir = seq.map((val, idx) => (idx % 2 === 0 ? -val : val));
//       const rot  = booth(seq);
//       const rotM = booth(mir);
  
//       // compare flat arrays
//       for (let i = 0; i < rot.length; i++)
//         if (rot[i] !== rotM[i]) return (rot[i] < rotM[i] ? rot : rotM).join(',');
//       return rot.join(',');
//     }
  
//     /* -------- transforms ---------------------------------------- */
//     translate(dq, dr) { this.pose.q += dq; this.pose.r += dr; }
//     // rotate(k = 1)     { this.pose.R = (this.pose.R + k) % 6; }

//    /* ------- cube helpers (add once at top of class) --------------- */
// static axialToCube(q,r){ return {x:q, y:-q-r, z:r}; }
// static cubeToAxial({x,z}){ return {q:x, r:z}; }

// /* rotate +k·60° CCW, k∈ℤ --------------------------------------- */
// rotate(k = 1){
//     _logPoly(this, 'rotate BEFORE');
//     this.pose.R = (this.pose.R + k) & 5;   // same as before
//     _logPoly(this, 'rotate AFTER');
//   }
  
//   mirror(){
//     _logPoly(this, 'mirror BEFORE');
  
//     const { axialToCube, cubeToAxial } = Polygon;
//     const { q, r } = this.pose;
//     const c = axialToCube(q, r);
//     const m = { x:-c.x, y:-c.y, z:c.z };   // vertical mirror
//     Object.assign(this.pose, cubeToAxial(m));
//     this.pose.F ^= 1;
  
//     _logPoly(this, 'mirror AFTER');
//   }

  
//     /* -------- derived geometry ---------------------------------- */
//     /** generator of transformed (q,r) vertices incl. return to origin */
//     *vertices() {
//       const { q:Tq, r:Tr, R, F } = this.pose;
//       const [a,b,c,d] = Polygon.MAT60[R];
//       const fx = F ? -1 : 1;
  
//       for (let i = 0; i < this.verts.length; i += 2) {
//         const q0 = this.verts[i]   * fx;
//         const r0 = this.verts[i+1];
//         const q  = a*q0 + b*r0 + Tq;
//         const r  = c*q0 + d*r0 + Tr;
//         yield [q, r];
//       }
//       // repeat first vertex for algorithms that expect closed loop
//       const q0 = this.verts[0] * fx;
//       const r0 = this.verts[1];
//       yield [a*q0 + b*r0 + Tq,  c*q0 + d*r0 + Tr];
//     }
  

//     /* even-odd triangle fill – unchanged from previous version */
//     triMask(key, triCentroid) {
//       const V = [...this.vertices()];
//       const qs = V.map(v => v[0]), rs = V.map(v => v[1]);
//       const minQ = Math.min(...qs) - 1, maxQ = Math.max(...qs) + 1;
//       const minR = Math.min(...rs) - 1, maxR = Math.max(...rs) + 1;
  
//       const centroid = triCentroid ?? ((q,r,up)=>[q+(up?1/3:2/3), r+(up?1/3:2/3)]);
//       const inside = (x,y)=>{
//         let wn=0;
//         for(let i=0;i<V.length-1;i++){
//           const [x1,y1]=V[i], [x2,y2]=V[i+1];
//           if((y1<=y&&y2>y)||(y1>y&&y2<=y)){
//             const t=(y-y1)/(y2-y1);
//             if(x < x1 + t*(x2-x1)) wn^=1;
//           }
//         }
//         return wn===1;
//       };
  
//       const mask=new Set();
//       for(let q=minQ;q<=maxQ;q++){
//         for(let r=minR;r<=maxR;r++){
//           for(let up=0;up<2;up++){
//             const [cx,cy]=centroid(q,r,up);
//             if(inside(cx,cy)) mask.add(key(q,r,up));
//           }
//         }
//       }
//       return mask;
//     }
//   }
  