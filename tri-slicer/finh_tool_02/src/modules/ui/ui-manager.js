/* ui.js */
import { store } from '../../core/store.js';
import * as C from '../../core/constants.js';

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
