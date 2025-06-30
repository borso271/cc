/* utils/export-slices-svg-with-mesh.js
 * -------------------------------------------------------------------
 * Same as buildExportSvg() but ALSO draws the triangular mesh behind
 * the slices.  Mesh colour = light-grey, stroke-width = 0.5 px.
 * ------------------------------------------------------------------- */
import { store }      from '../core/store.js';
import * as C         from '../core/constants.js';
import { getSlices }  from './clip-with-frame.js';

const triH = s => s * Math.sqrt(3) / 2;

/** Export SVG with frame, mesh and interior slices */
export function buildExportSvgWithMesh () {

  /* live store values ----------------------------------------- */
  const { frame, density, padRatio, radiusPx } = store.state;

  const PAD_PX    = 20;
  const EXTRA     = 20;
  const SIDE_UI   = C.BASE_SIDE / density;
  const SIDE_EXP  = PAD_PX / padRatio;               // slice-pad ⇒ 20 px
  const SCALE     = SIDE_EXP / SIDE_UI;

  /* frame size (export px) ------------------------------------ */
  const frameWexp = frame.widthMult  * SIDE_EXP + EXTRA * 2;
  const frameHexp = frame.heightMult * triH(SIDE_EXP) + EXTRA * 2;

  /* mesh geometry in export units ----------------------------- */
  const ROWS = Math.round(C.BASE_ROWS * density);
  const COLS = Math.round(C.BASE_COLS * density);

  /* SVG header ------------------------------------------------ */
  const svg = [];
  svg.push(
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    `     width="${frameWexp}" height="${frameHexp}"`,
    `     viewBox="0 0 ${frameWexp} ${frameHexp}">`,
    `  <rect x="0" y="0" width="${frameWexp}" height="${frameHexp}"`,
    `        fill="none" stroke="black"/>`
  );

  /* translate world→frame local & extra 20 px border ---------- */
  const translate = `translate(${EXTRA - frame.x * SCALE}
                               ${EXTRA - frame.y * SCALE})`;
  svg.push(`  <g transform="${translate}">`);

  /* -------- triangular mesh ---------------------------------- */
  svg.push(`    <g stroke="#bbb" stroke-width="0.5" fill="none">`);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = (c + r / 2) * SIDE_EXP;
      const y =  r * triH(SIDE_EXP);

      /* horizontal edge */
      if (c < COLS - 1) {
        const x2 = ((c + 1) + r / 2) * SIDE_EXP;
        svg.push(`      <line x1="${x}" y1="${y}" x2="${x2}" y2="${y}"/>`);
      }
      /* down-right edge */
      if (r < ROWS - 1) {
        const x2 = (c + (r + 1) / 2) * SIDE_EXP;
        const y2 = (r + 1) * triH(SIDE_EXP);
        svg.push(`      <line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}"/>`);
      }
      /* down-left edge */
      if (r < ROWS - 1 && c > 0) {
        const x2 = ((c - 1) + (r + 1) / 2) * SIDE_EXP;
        const y2 = (r + 1) * triH(SIDE_EXP);
        svg.push(`      <line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}"/>`);
      }
    }
  }
  svg.push('    </g>');   // end mesh group

  /* -------- slices ------------------------------------------- */
  store.state.polygons.forEach(poly => {

    const slices = getSlices(
      poly,
      { ...frame, x: frame.x * SCALE, y: frame.y * SCALE },
      SIDE_EXP,
      triH,
      PAD_PX,
      radiusPx == null ? PAD_PX / 2 : radiusPx * SCALE
    );

    slices.forEach(s => {
      if (!s.path) return;
      svg.push(
        `    <path d="${s.path}" fill="${s.fill}" stroke="none"/>`
      );
    });
  });

  svg.push('  </g>', '</svg>');
  return svg.join('\n');
}
