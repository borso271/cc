/* ui.js */
import { store } from '../../core/store.js';
import * as C from '../../core/constants.js';
import { H } from '../../utils.js';
import * as DOM from '../../core/dom-elements.js';
const sidebar = document.getElementById('sidebar');
// shorthand query helper
const qs = (sel, root = document) => root.querySelector(sel);


const K      = 2 / Math.sqrt(3);   // multiply H-units by K  →  SIDE-units
const K_INV  = Math.sqrt(3) / 2;   // multiply SIDE-units by K_INV → H-units



export function initUI () {
  const sidebar = document.getElementById('sidebar');
  setupThemeSwitcher();
  /* ----------------------------------------------------------------
   *  Theme switch / base HTML for sidebar was inserted earlier
   *  so the inputs already exist in the DOM.
   * -------------------------------------------------------------- */

  /* ---- frame-ratio / multiplier controls ----------------------- */
  const ratioSel = qs('#ratioSel');
  const wIn      = qs('#wMult');
  const hIn      = qs('#hMult');

  /* ---- slice-style controls ----------------------------------- */
  const padIn     = sidebar.querySelector('#padIn');   // %
  const padMinus  = sidebar.querySelector('#padMinus');
  const padPlus   = sidebar.querySelector('#padPlus');
  const radIn     = sidebar.querySelector('#radIn');   // px (blank = auto)
  const radMinus  = sidebar.querySelector('#radMinus');
  const radPlus   = sidebar.querySelector('#radPlus');

  /* ---------- helpers ------------------------------------------ */
  const parseR   = () => ratioSel.value.split(':').map(Number);      // "16:9"
  const [K, K_INV] = [2 / Math.sqrt(3), Math.sqrt(3) / 2];

  function syncFromW () {
    const [rw, rh] = parseR();
    if (!wIn.value) { hIn.value = ''; return; }
    hIn.value = (+wIn.value * K) * (rh / rw);
  }
  function syncFromH () {
    const [rw, rh] = parseR();
    if (!hIn.value) { wIn.value = ''; return; }
    wIn.value = (+hIn.value * K_INV) * (rw / rh);
  }

  /* commit frame patch — re-centre when requested --------------- */
  function commitFrame (recenter = false) {
    const patch = {
      ratio      : parseR(),
      widthMult  : wIn.value ? +wIn.value : null,
      heightMult : hIn.value ? +hIn.value : null
    };
    if (recenter) { patch.x = 0; patch.y = 0; }
    store.patchFrame(patch);
  }

  /* commit padding / radius ------------------------------------- */
  function commitPadRad () {
    const pct = Math.min(100, Math.max(0, +padIn.value || 0));
    const rad = radIn.value === '' ? null : Math.max(0, +radIn.value);
    store.setRoundStyle({ padRatio: pct / 100, radius: rad });

    /* if radius is auto (blank), show computed value */
    if (radIn.value === '') radIn.value = store.radiusPx.toFixed(1);
  }

  /* ---------- initial values ----------------------------------- */
  const f0 = store.state.frame;
  ratioSel.value = f0.ratio.join(':');
  wIn.value      = f0.widthMult  ?? '';
  hIn.value      = f0.heightMult ?? '';
  padIn.value    = (store.state.padRatio * 100).toFixed(0);
  radIn.value    = store.state.radiusPx ?? '';

  /* ---------- listeners ---------------------------------------- */
  ratioSel.onchange = () => {
    wIn.value ? syncFromW() : syncFromH();
    commitFrame(true);                       // <- auto-centre on ratio change
  };
  wIn.oninput = () => { syncFromW(); commitFrame(); };
  hIn.oninput = () => { syncFromH(); commitFrame(); };

  padIn.oninput = commitPadRad;
  radIn.oninput = commitPadRad;

  /* step buttons (+ / −) --------------------------------------- */
  padMinus.onclick = () => { padIn.stepDown(); commitPadRad(); };
  padPlus .onclick = () => { padIn.stepUp();   commitPadRad(); };
  radMinus.onclick = () => { radIn.stepDown(); commitPadRad(); };
  radPlus .onclick = () => { radIn.stepUp();   commitPadRad(); };
}


/**
 * Attaches a click event listener to the main title to cycle through themes.
 */
function setupThemeSwitcher() {
  // ⭐️ Get the title element instead of a button
  const titleElement = document.getElementById('appTitle');
  const body = document.body;

  const palettes = [
    
    { name: 'Dracula', className: 'theme-dracula' },
    { name: 'Solar',   className: 'theme-solarized' },
    { name: 'Dark',    className: 'theme-dark' },
    { name: 'Light',   className: 'theme-light' },
    
  ];

  let currentPaletteIndex = 0;

  const updateTheme = () => {
    // Remove all possible theme classes to prevent conflicts
    palettes.forEach(p => body.classList.remove(p.className));

    // Add the new theme class
    const newPalette = palettes[currentPaletteIndex];
    body.classList.add(newPalette.className);

    // Optional: You could update the title text to reflect the theme,
    // but the visual change is usually enough.
    // titleElement.textContent = `TRI-GRID DRAW (${newPalette.name})`;
  };

  // ⭐️ Attach the event listener to the title element
  titleElement.addEventListener('click', () => {
    // Increment index, looping back to 0 at the end
    currentPaletteIndex = (currentPaletteIndex + 1) % palettes.length;
    updateTheme();
  });

  // Set initial theme on page load
  updateTheme();
}


function initNumControls() {
  document.querySelectorAll('.num-control').forEach(ctrl => {
    const input = ctrl.querySelector('input[type="number"]');
    const plus  = ctrl.querySelector('.plus');
    const minus = ctrl.querySelector('.minus');

    /* read HTML attributes (or fall back) */
    const step = parseFloat(input.step) || 1;         // still used for exact integers
    const min  = input.min !== "" ? parseFloat(input.min) : -Infinity;
    const max  = input.max !== "" ? parseFloat(input.max) :  Infinity;

    /* helper: clamp to min / max */
    const clamp = v => Math.max(min, Math.min(max, v));

    /* -----  Handlers  ------------------------------------------------ */

    plus.addEventListener('click', () => {
      let v = +input.value || 0;

      /* next integer logic */
      v = Number.isInteger(v) ? v + step      // already an int → add 1 (or step)
                              : Math.ceil(v); // not an int   → round up
      input.value = clamp(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    minus.addEventListener('click', () => {
      let v = +input.value || 0;

      /* previous integer logic */
      v = Number.isInteger(v) ? v - step       // already an int → subtract 1 (or step)
                              : Math.floor(v); // not an int    → round down
      input.value = clamp(v);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
}

document.addEventListener('DOMContentLoaded', initNumControls);


function initAdvancedToggle(){
  const btn = document.getElementById('toggleAdvanced');
  btn.addEventListener('click', () => {
    
    document.body.classList.toggle('show-adv');
    const open = document.body.classList.contains('show-adv');
    btn.textContent = open ? 'Advanced ▲' : 'Advanced ▼';
    btn.setAttribute('aria-expanded', open);
  });
}

document.addEventListener('DOMContentLoaded', initAdvancedToggle);

const btn = document.getElementById('toggleAdvanced');
btn.addEventListener('click', () => console.log('clicked!'));




/* --- colour palette ------------------------------------------ */
const defaultPalette = ["#678BFF","#212647","#A6B9CC","#E4E9F2","#F9FAFC"];


const swatchRow    = sidebar.querySelector('#swatchRow');
const newColourIn  = sidebar.querySelector('#newColourIn');
const addColourBtn = sidebar.querySelector('#addColourBtn');

let activeSwatch = null;
function setActive(sw) {
  if (activeSwatch) activeSwatch.classList.remove('active');
  activeSwatch = sw;
  sw.classList.add('active');
}

function addSwatch(col) {
  const sw = document.createElement('button');
  sw.className = 'swatch';
  sw.style.cssText =
    'width:28px;height:28px;border:none;border-radius:4px;' +
    'cursor:pointer;outline:2px solid #555;';
  sw.style.background = col;
  sw.title = col;

  sw.onclick = () => {
    /* 1 · remember as “current colour” */
    store.setCurrentFill(col);
    /* 2 · recolour selected polygon (if any) */
    store.setFillOfSelected(col);
    /* 3 · highlight chosen swatch */
    setActive(sw);
  };

  swatchRow.appendChild(sw);

  /* auto-select if matches store colour or first swatch */
  if (col === store.state.currentFill || !activeSwatch) setActive(sw);
}

defaultPalette.forEach(addSwatch);

addColourBtn.onclick = () => {
  const col = newColourIn.value.trim();
  if (col) addSwatch(col);
  newColourIn.value = '';
};

/* --- swatch highlight style (append once to your CSS) --------
.swatch.active { outline:3px solid #222 !important; }
--------------------------------------------------------------- */


document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;     // ignore when typing
  const id = store.state.selectedId;
  if (!id) return;

  if (e.key === 'r' && !e.shiftKey){
    store.applyTransform(p => p.rotate(1));     // +60°
  } else if (e.key === 'R' || (e.key==='r' && e.shiftKey)){
    store.applyTransform(p => p.rotate(5));     // -60°  (5 ≡ -1 mod 6)
  } else if (e.key.toLowerCase() === 'm'){
    store.applyTransform(p => p.mirror());
  }
});



import { SIDE } from '../../core/geometry.js';


import { drawTriMaskDots } from '../../utils/debug-trimask-dots.js';
debugMaskBtn.onclick = () => {
  const poly = store.state.polygons
                  .find(p => p.id === store.state.selectedId);
  if(!poly){ alert('Select a polygon first'); return; }

  // const SIDE = C.BASE_SIDE / store.state.density;
  // drawTriMaskDots(poly, SIDE);          // green
  drawTriMaskDots(poly, SIDE());   
};


import { makeRandomBlob } from '../../utils/random-blob.js';
import { splitPolygon } from '../../utils/split-polygon.js';

const randBtn   = qs('#randBtn');
const randSize  = qs('#randSize');
const splitBtn  = qs('#splitBtn');
const splitKIn  = qs('#splitK');

/* blob generator (unchanged) */
randBtn.onclick = () => {
  const n = Math.max(3, +randSize.value || 25);
  const blob = makeRandomBlob(n);
  store.addPolygonInstance(blob);
};







import { triKey } from '../../utils/polygon-mask-utils.js';
splitBtn.onclick = () => {

  const parent   = store.state.polygons.find(p => p.id === store.state.selectedId);
  const parts = splitPolygon(parent, 3);   // split into 3 parts
  


  /* --- DEBUG: print how big each child really is --------------- */

parts.forEach((p, i) => {
  console.log(`child ${i} has`,
              p.triMask(triKey).size,
              'triangles');
});
/* -------------------------------------------------------------- */

store.deleteSelected(parent.id);
parts.forEach(p => store.addPolygonInstance(p));

  
};







import { buildExportSvg } from '../../utils/export-slices.js';
document.getElementById('downloadSvgBtn').onclick = () => {
  const source = buildExportSvg();
  const blob   = new Blob([source], { type:'image/svg+xml' });
  const url    = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'tri-slices.svg';
  a.click();
  URL.revokeObjectURL(url);
};



import { buildExportSvgWithMesh } from '../../utils/export-slices-mesh.js';

document.getElementById('downloadSvgAndMeshBtn').onclick = () => {
  const source = buildExportSvgWithMesh();
  const blob   = new Blob([source], { type:'image/svg+xml' });
  const url    = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'tri-slices.svg';
  a.click();
  URL.revokeObjectURL(url);
};




const toggleBtn  = sidebar.querySelector('#toggleShapes');
const shapePanel = sidebar.querySelector('#shapePanel');

toggleBtn.onclick = () => {
  shapePanel.classList.toggle('closed');
  toggleBtn.textContent =
    shapePanel.classList.contains('closed')
      ? 'Pre-defined shapes ▾'
      : 'Pre-defined shapes ▴';
};



/* ------------------------------------------------------------------ */
/* layer-toggle helpers                                               */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------ */
/* layer-toggle helpers                                         */
/* ------------------------------------------------------------ */
const tPreview = document.getElementById('tglPreview');




tPreview.onclick = () => {
  document.body.classList.toggle('preview');   // swaps classes
  tPreview.classList.toggle('active');         // darken button
  const g = DOM.previewFrameLayer;
  const vis = g.getAttribute('visibility');
  g.setAttribute('visibility', vis === 'hidden' ? 'visible' : 'hidden');
};






/* ------------------------------------------------------------------ */
/* shape library                                              */
/* ------------------------------------------------------------------ */
import { SHAPE_LIBRARY } from '../../library/shapes.js';
import { drawFullGrid } from '../grid/index.js';



/* build thumbnail list once */
SHAPE_LIBRARY.forEach(item => {
  const div = document.createElement('div');
  div.className = 'shape-thumb';
  div.innerHTML = `<svg viewBox="0 0 24 24">${item.svg}</svg>`;
  div.title = item.name;
  div.onclick = () => {
    const poly = item.create();

    /* drop it in the centre of the current frame            */
    const f      = store.state.frame;
    const density= store.state.density;
    const SIDE   = C.BASE_SIDE / density;
    const rowH   = H(SIDE);

    // frame centre in axial coords (approx)
    poly.pose.q = Math.round((f.x + f.widthMult*SIDE /2) / SIDE
                             - (f.y + f.heightMult*rowH /2) / (2*SIDE));
    poly.pose.r = Math.round((f.y + f.heightMult*rowH /2) / rowH);

    store.addPolygonInstance(poly);   // new helper (see §4)
    store.selectAndHighlight(poly.id);    

    shapePanel.classList.add('closed');
    toggleBtn.textContent = 'Pre-defined shapes ▾';
  };
  shapePanel.appendChild(div);
});



/* ------------------------------------------------------------------
   ONE-CLICK “📋 Export selected shape” button
   – Logs a ready-to-paste library snippet *with* a 24 × 24 preview.
   ------------------------------------------------------------------ */
   sidebar.insertAdjacentHTML(
    'beforeend',
    `<button class="invisible" id="exportShapeBtn" style="margin-top:.5rem">📋 Export selected shape</button>`
  );
  
  const exportBtn = sidebar.querySelector('#exportShapeBtn');
  
  /* Enable/disable with selection ----------------------------------- */
  store.addEventListener('change', () => {
    exportBtn.disabled = (store.state.selectedId == null);
  });
  
  /* ---- little helpers --------------------------------------------- */
  const min = arr => Math.min(...arr);
  const max = arr => Math.max(...arr);
  
  /* ---- main click handler ----------------------------------------- */
  exportBtn.onclick = () => {
    const id = store.state.selectedId;
    if (id == null) return;
    const poly = store.state.polygons.find(p => p.id === id);
    if (!poly)     return;
  
    /* 1 · canonical local vertices */
    const verts = [];
    for (let i = 0; i < poly.verts.length; i += 2)
      verts.push([poly.verts[i], poly.verts[i + 1]]);
  
    /* 2 · auto-generate 24×24 preview ------------------------------- */
    const vertsAxial = [...poly.vertices()].slice(0, -1);   // no dup
    const px   = vertsAxial.map(([q, r]) => [q + r / 2, r * Math.sqrt(3) / 2]);
    const xs   = px.map(v => v[0]), ys = px.map(v => v[1]);
    const w    = max(xs) - min(xs), h = max(ys) - min(ys);
    const scl  = 22 / Math.max(w, h);                       // 1-px margin
    const offX = (24 - w * scl) / 2 - min(xs) * scl;
    const offY = (24 - h * scl) / 2 - min(ys) * scl;
  
    const ptsAttr = px
      .map(([x, y]) => `${(x * scl + offX).toFixed(2)},${(y * scl + offY).toFixed(2)}`)
      .join(' ');
  
    const previewSvg =
      `<svg viewBox="0 0 24 24"><polygon points="${ptsAttr}" /></svg>`;
  
    /* 3 · build ready-to-paste snippet ----------------------------- */
    const snippet = `
  {
    id   : 'myShape',
    name : 'My Shape',
    svg  : \`${previewSvg}\`,
    create(){
      return new Polygon(${JSON.stringify(verts)}, { q:0,r:0,R:0,F:0 }, '${poly.fill}');
    }
  }`;
  

    /* 4 · output ---------------------------------------------------- */
    console.group('📋 Shape export');
    console.log(snippet.trim());
    console.groupEnd();
    console.info('👉 Copy the above object into library/shapes.js');
  };
  

// /* ---------- Log-shape helper ---------------------------------- */
// sidebar.insertAdjacentHTML(
//   'beforeend',
//   `<button id="logShapeBtn" style="margin-top:.5rem">📋 Log selected shape</button>`
// );



// const logBtn = sidebar.querySelector('#logShapeBtn');



// sidebar.insertAdjacentHTML(
//   'beforeend',
//   `<button id="makePreviewBtn" style="margin-top:.25rem">🖼 Preview markup</button>`
// );

// const previewBtn = sidebar.querySelector('#makePreviewBtn');

// /* Enable only when a polygon is selected */
// store.addEventListener('change', () => {
//   const sel = store.state.selectedId;
//   previewBtn.disabled = (sel == null);
// });




// /* Disable when nothing selected */
// store.addEventListener('change', () => {
//   logBtn.disabled = (store.state.selectedId == null);
// });


// logBtn.onclick = () => {
//   const id = store.state.selectedId;
//   if (id == null){
//     console.warn('No polygon selected');
//     return;
//   }
//   const poly = store.state.polygons.find(p => p.id === id);
//   if (!poly) return;

//   /* 1 · verts as [[q,r],…] in canonical local coords ------------- */
//   const verts = [];
//   for (let i = 0; i < poly.verts.length; i += 2)
//     verts.push([poly.verts[i], poly.verts[i+1]]);

//   /* 2 · build a minimal library snippet ------------------------- */
//   const snippet = `
// {
//   id   : 'myShape',
//   name : 'My Shape',
//   svg  : '<!-- add a neat 24×24 preview here -->',
//   create(){
//     return new Polygon(${JSON.stringify(verts)}, { q:0,r:0,R:0,F:0 }, '${poly.fill}');
//   }
// }`;

//   /* 3 · log for copy-paste -------------------------------------- */
//   console.group('Shape snippet');
//   console.log(snippet.trim());
//   console.groupEnd();
//   console.info('👉 Copy the above object into library/shapes.js');
// };



// /* ---- tiny helper: min/max of arrays ------------------------- */
// const min = arr => Math.min(...arr);
// const max = arr => Math.max(...arr);

// previewBtn.onclick = () => {
//   const id   = store.state.selectedId;
//   if (id == null) return;
//   const poly = store.state.polygons.find(p => p.id === id);
//   if (!poly)  return;

//   /* 1 · polygon outline in lattice ----------------------------- */
//   const vertsAxial = [...poly.vertices()].slice(0,-1);      // no dup

//   /* 2 · convert to raw pixel coords (using SIDE = 1) ----------- */
//   // SIDE = 1 → row height = √3/2
//   const pxVerts = vertsAxial.map(([q,r]) => [
//     q + r/2,
//     r * Math.sqrt(3)/2
//   ]);

//   /* 3 · find bbox, scale & centre into 24×24 ------------------- */
//   const xs = pxVerts.map(v=>v[0]), ys = pxVerts.map(v=>v[1]);
//   const w  = max(xs) - min(xs);
//   const h  = max(ys) - min(ys);
//   const scale  = 22 / Math.max(w,h);           // leave 1-px margin
//   const offX   = (24 - w*scale) / 2 - min(xs)*scale;
//   const offY   = (24 - h*scale) / 2 - min(ys)*scale;

//   const ptsAttr = pxVerts
//       .map(([x,y]) => `${(x*scale+offX).toFixed(2)},${(y*scale+offY).toFixed(2)}`)
//       .join(' ');

//   const previewSvg =
// `<svg viewBox="0 0 24 24"><polygon points="${ptsAttr}" /></svg>`;

//   /* 4 · show in console for copy-paste ------------------------- */
//   console.group('SVG preview');
//   console.log(previewSvg);
//   console.groupEnd();
//   console.info('👉 Copy the <svg>…</svg> markup into the "svg" field.');
// };
