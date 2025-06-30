/* utils/export-slices-svg.js
 * -------------------------------------------------------------------
 * Create an SVG that contains
 *   • an outer rectangle 40 px larger than the slice field (20 px
 *     gap all round, so slice↔slice gap = slice↔frame gap = 40 px)
 *   • every interior slice, padded 20 px, rounded corners preserved
 * ------------------------------------------------------------------- */
import { store }      from '../core/store.js';
import * as C         from '../core/constants.js';
import { getSlices }  from './clip-with-frame.js';

const triH = s => s * Math.sqrt(3) / 2;   // lattice helper

export function buildExportSvg () {

  /* ------ live values from the store ------------------------- */
  const { frame, density, padRatio, radiusPx } = store.state;

  const SIDE_UI   = C.BASE_SIDE / density;        // preview side length
  const PAD_PX    = 20;                           // fixed slice-padding
  const EXTRA     = 20;                           // extra frame gap
  const SIDE_EXP  = PAD_PX / padRatio;            // side so pad ⇒ 20 px
  const SCALE     = SIDE_EXP / SIDE_UI;           // preview→export scale

  /* frame size in export units -------------------------------- */
  const frameWexp = frame.widthMult  * SIDE_EXP + EXTRA * 2;
  const frameHexp = frame.heightMult * triH(SIDE_EXP) + EXTRA * 2;

  /* svg header ------------------------------------------------ */
  const svg = [];
  svg.push(
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    `     width="${frameWexp}" height="${frameHexp}"`,
    `     viewBox="0 0 ${frameWexp} ${frameHexp}">`,
    `  <rect x="0" y="0" width="${frameWexp}" height="${frameHexp}"`,
    `        fill="none" stroke="black"/>`
  );

  /* translate world→frame-local & add 20 px border ------------ */
  svg.push(
    `  <g transform="translate(${EXTRA - frame.x * SCALE}`,
    `                         ${EXTRA - frame.y * SCALE})">`
  );

  /* each polygon’s slices ------------------------------------- */
  store.state.polygons.forEach(poly => {

    const slices = getSlices(
      poly,
      { ...frame, x: frame.x * SCALE, y: frame.y * SCALE }, // frame in px
      SIDE_EXP,
      triH,
      PAD_PX,                                  // padding = 20 px
      radiusPx == null ? PAD_PX / 2            // auto ⇒ ½ pad
                       : radiusPx * SCALE      // user-typed radius
    );

    slices.forEach(s => {
      if (!s.path) return;                     // slice outside frame
      svg.push(
        `    <path d="${s.path}" fill="${s.fill}" stroke="none"/>`
      );
    });
  });

  svg.push('  </g>', '</svg>');
  return svg.join('\n');
}

// import { store }      from '../core/store.js';
// import * as C         from '../core/constants.js';
// import { getSlices }  from './clip-with-frame.js';

// const triH = s => s * Math.sqrt(3) / 2;

// export function buildExportSvg () {

//   /* live values ------------------------------------------------ */
//   const { frame, density, padRatio, radiusPx } = store.state;

//   const SIDE_UI  = C.BASE_SIDE / density;          // side in preview
//   const SIDE_EXP = 20 / padRatio;                  // side so pad = 20 px
//   const SCALE    = SIDE_EXP / SIDE_UI;             // we’ll need it for radius

//   const frameWexp = frame.widthMult  * SIDE_EXP;
//   const frameHexp = frame.heightMult * triH(SIDE_EXP);

//   /* svg header ------------------------------------------------- */
//   const svg = [];
//   svg.push(
//     `<svg xmlns="http://www.w3.org/2000/svg"`,
//     `     width="${frameWexp}" height="${frameHexp}"`,
//     `     viewBox="0 0 ${frameWexp} ${frameHexp}">`,
//     `  <rect x="0" y="0" width="${frameWexp}" height="${frameHexp}"`,
//     `        fill="none" stroke="black"/>`
//   );

//   /* one translation only: move world → frame local ------------- */
//   svg.push(
//     `  <g transform="translate(${-frame.x * SCALE} ${-frame.y * SCALE})">`
//   );

//   /* slices ----------------------------------------------------- */
//   store.state.polygons.forEach(poly => {

//     const slices = getSlices(
//       poly,
//       { ...frame, x: frame.x * SCALE, y: frame.y * SCALE },  // frame in exp px
//       SIDE_EXP,
//       triH,
//       20,                                    // pad = 20 px
//     //   radiusPx == null ? null : radiusPx * SCALE
//       radiusPx == null ? 10 : radiusPx * SCALE
//     );

//     slices.forEach(s => {
//       if (!s.path) return;
//       svg.push(
//         `    <path d="${s.path}" fill="${s.fill}" stroke="none"/>`
//       );
//     });
//   });

//   svg.push('  </g>', '</svg>');
//   return svg.join('\n');
// }
