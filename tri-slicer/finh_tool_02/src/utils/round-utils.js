// utils/round-utils.js
import { calculateInsetPolygon } from "./polygon-offset.js";
import { getRoundedPolygonPath } from "./polygon-to-rounded-path.js";

/**
 * Generate an inset-then-rounded SVG path from a pixel ring.
 * @param {number[][]} ring    [[x,y]…]  (not closed, >=3 verts)
 * @param {number}      padPx  inward offset in pixels  (>=0)
 * @param {number}      radPx  corner radius in pixels  (>=0)
 * @returns {string}    SVG path data or '' if degenerate
 */
export function insetAndRound (ring, padPx, radPx) {
  if (!ring.length || (padPx < 0.01 && radPx < 0.01)) return '';

  /* 1. convert ring → array of {x,y} objects for your offset lib */
  const objPts = ring.map(([x, y]) => ({ x, y }));

  /* 2. inset */
  const inset = padPx > 0.01
    ? calculateInsetPolygon(objPts, padPx)      // returns [{x,y},…]
    : objPts;

  if (inset.length < 3) return '';              // collapsed

  /* 3. rounded path */
  return getRoundedPolygonPath(inset, radPx);   // already closes path
}
