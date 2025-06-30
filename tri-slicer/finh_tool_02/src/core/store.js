// store.js
import { Polygon } from "../classes/polygon.js";


import { triKey, maskToPolygon } from '../utils/polygon-mask-utils.js';  // ← add
import { clearSliceCache } from '../utils/clip-with-frame.js';
import * as C from './constants.js';




// axial neighbour counts depend on density, so wrap in a fn
function gridLimits (density) {
    return {
      maxQ : Math.round(C.BASE_COLS * density) - 1,
      maxR : Math.round(C.BASE_ROWS * density) - 1
    };
  }

  /** call immediately after addPolygon() so the new one is both
 *  selected *and* highlighted. */

export const store = new (class extends EventTarget {
  state = {
    density  : 1.5,

    // ─── pre-filled with a demo polygon ─────────────────────────
    polygons : [] ,
    frame    : { ratio:[1,1], widthMult:null, heightMult:7, x:0, y:0 },
    currentFill : '#678BFF',   // ← default “current colour”
    pad     : 8,
    radius  : 6,
    padRatio    : 0.10,     // fraction of ONE triangle side (0-1)
    radiusPx    : null,     // if null → auto = padPx/2
    preview : false   ,     // ← NEW  presentation-mode flag,
    selectedId : null,
    highlightId : null          // ← temporary visual accent
  };

    get s() { return structuredClone(this.state); }
    set(patch){ 
      if ('density' in patch || 'pad' in patch || 'radius' in patch) clearSliceCache();
      Object.assign(this.state, patch); this.emit(); }

                    // ← NEW
        /* ---------- selection ---------- */
        selectPolygon(id){
          this.state.selectedId = id;  // id or null
          this.state.highlightId = null;   // drop accent
          console.log("polygon selected: ",  this.state.selectedId)
           this.emit();
         }
        
         deleteSelected(){
              const { selectedId, polygons } = this.state;
              if (selectedId == null) return;
              const idx = polygons.findIndex(p => p.id === selectedId);
              if (idx !== -1) polygons.splice(idx, 1);
              this.state.selectedId = null;
           this.emit();
         }



          setRoundStyle({ padRatio, radius }){
            let changed = false;
          
            if (padRatio !== undefined && padRatio !== this.state.padRatio){
              this.state.padRatio = padRatio; changed = true;
            }
            if (radius !== undefined){
              this.state.radiusPx = radius;            // user override (may be null)
              changed = true;
            }
            if (!changed) return;
            clearSliceCache();
            this.emit();
          }
        
        


            get padPx() {
              return (C.BASE_SIDE / this.state.density) * this.state.padRatio;
            }
            get radiusPx() {
              console.log("RADIUS PX STA", this.padPx)
              return this.state.radiusPx ?? this.padPx;
            }
            



            /* ---------- change fill of the selected polygon --------------- */
 setFillOfSelected(col){
      const id  = this.state.selectedId;
      if (id == null) return;
      const poly = this.state.polygons.find(p => p.id === id);
      if (!poly) return;
      if (poly.fill === col) return;            // no change
      poly.fill = col;
      clearSliceCache();
      this.emit();
    }
  
     /* --- change the global current colour --------------------- */
 setCurrentFill(col){
  console.log("set current fill called")
   if (col === this.state.currentFill) {
   
      return;}
   this.state.currentFill = col;
   this.emit();                 // listeners can react if needed
 }

patchFrame (p) {
    const f = this.state.frame;
    Object.assign(f, p);          // merge caller's patch first
  
    // ── auto-complete missing multiplier ──
    const [rw, rh] = f.ratio;     // e.g. [16, 9]
    if (f.widthMult == null && f.heightMult == null) f.widthMult = 4;
  
    if (f.widthMult != null && f.heightMult == null) {
      f.heightMult = f.widthMult * (2 / Math.sqrt(3)) * (rh / rw);
    }
    if (f.heightMult != null && f.widthMult == null) {
      f.widthMult  = f.heightMult * (Math.sqrt(3) / 2) * (rw / rh);
    }

    clearSliceCache();
    this.emit();
  }

  
/* --------------------------------------------- */
/*  add a brand-new polygon                      */
/* --------------------------------------------- */
/**
 * @param {Array<[number,number]>|Int16Array} verts  lattice vertices q,r
 * @param {{q:number,r:number,R:number,F:0|1}} pose  lattice pose  (optional)
 * @param {string}  [fill]                          css fill colour
 * @returns {number} poly.id                        handy for the caller
 */
addPolygon(verts, pose = { q:0, r:0, R:0, F:0 }, fill  = this.state.currentFill  ){
  const poly = new Polygon(verts, pose, fill);
  this.state.polygons.push(poly);
  this.emit();
  return poly.id;
}


selectAndHighlight(id){
  this.state.selectedId  = id;
  this.state.highlightId = id;
  this.emit();
}






addPolygonInstance(poly){
  this.state.polygons.push(poly);
  this.emit();
  return poly.id;
}


  
    emit(){ this.dispatchEvent(new Event('change')); }


    resetAll() {
        // Reset polygons and selection
        this.state.polygons = [];
       
        this.state.selectedId  = null;
        clearSliceCache();
        this.emit(); // Announce that the state has changed
    }




   /* NEW — accepts a ready-made Polygon instance */
 addPolygonInstance(poly){
  this.state.polygons.push(poly);
   this.emit();
   return poly.id;
 }




  /* ------------------------------------------------------------ */
  /*  Apply an in-place transform to the selected polygon         */
  /* ------------------------------------------------------------ */
  applyTransform (fn) {
    const poly = this.state.polygons
                  .find(p => p.id === this.state.selectedId);
    if (!poly) return;

    /* bounding box before */
    const verts = [...poly.vertices()];
    let minQ = Math.min(...verts.map(v=>v[0]));
    let maxQ = Math.max(...verts.map(v=>v[0]));
    let minR = Math.min(...verts.map(v=>v[1]));
    let maxR = Math.max(...verts.map(v=>v[1]));

    /* run the transform --------------------------------------- */
    fn(poly);        // rotate / mirror / translate preview delta

    /* bounding box after */
    const after = [...poly.vertices()];
    minQ = Math.min(...after.map(v=>v[0]));
    maxQ = Math.max(...after.map(v=>v[0]));
    minR = Math.min(...after.map(v=>v[1]));
    maxR = Math.max(...after.map(v=>v[1]));

    /* clamp into lattice rectangle ---------------------------- */
    // const { maxQ:Qmax, maxR:Rmax } = gridLimits(this.state.density);
    // let dq = 0, dr = 0;
    // if (minQ < 0)   dq = -minQ;
    // if (maxQ > Qmax) dq = Qmax - maxQ;
    // if (minR < 0)   dr = -minR;
    // if (maxR > Rmax) dr = Rmax - maxR;
   

    const b = this.gridBounds;           // may be undefined on first run
let dq = 0, dr = 0;
if (b){                               // bounds are known
  if (minQ < b.minQ) dq = b.minQ - minQ;
  if (maxQ > b.maxQ) dq = b.maxQ - maxQ;
  if (minR < b.minR) dr = b.minR - minR;
  if (maxR > b.maxR) dr = b.maxR - maxR;
}



    clearSliceCache();
    this.emit();
  }

  })();
  