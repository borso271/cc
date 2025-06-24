// // utils.js

export const SVG_NS = "http://www.w3.org/2000/svg";
export const SQRT3 = Math.sqrt(3);
export const GRID_STROKE_WIDTH = 1;
export const HALF_GRID_STROKE = GRID_STROKE_WIDTH / 2;

export function svgToFrame(p, geo) {
    return { x: geo.gridContainerLeftOffset + p.x,
             y: geo.gridContainerTopOffset  + p.y };
}



// colourHelpers -------------------------------------------------------------

/**
 * Hex → relative luminance (0 = black, 1 = white)
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */
export function luminance(hex) {
    const n = v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    const r = n(parseInt(hex.slice(1, 3), 16));
    const g = n(parseInt(hex.slice(3, 5), 16));
    const b = n(parseInt(hex.slice(5, 7), 16));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  
  /**
   * Given a background colour, return a grid stroke that will be readable.
   * Very light bg ⇒ dark grid (#000); dark bg ⇒ light grid (#f5f5f5).
   */
  export function bestGridStroke(bgHex) {
    return luminance(bgHex) > 0.5 ? '#000000' : '#f5f5f5';
  }