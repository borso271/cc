// polygonDrawer.js – uses the same geometry object ("geo") as the grid
// -----------------------------------------------------------------------------
import { SVG_NS } from './utils.js';
import { state as appState } from './appState.js';
import { getRoundedPolygonPath } from './polygonToRoundedPath.js';

const overlay = document.getElementById('selectionOverlay');
let cachedGeo = null; // last geometry passed in from GridGenerator

// -----------------------------------------------------------------------------
// utilities
// -----------------------------------------------------------------------------
export function cacheGeometry(geo) {
  if (geo && !geo.error) cachedGeo = geo; // store the most recent valid geo
}

export function clearSelectionOverlay() {
  overlay.innerHTML = '';
}

// -----------------------------------------------------------------------------
// finished polygons & live preview
// -----------------------------------------------------------------------------
export function drawFinishedPolygons(polygons) {
  polygons.forEach((poly, idx) => {
    const radius      = appState.currentCornerRadius;
    const color       = poly.color || '#808080';
    const isSelected  = idx === appState.selectedIndex;

    const strokeColSel = 'blue';
    const strokeWidthSel = '3px';
    const fillOpacitySel = '0.7';
    const strokeWidthOuter = '2px';
    const strokeWidthInner = '1px';

    // outer ---------------------------------------------------------------
    if (poly.outer?.length > 2 && (appState.showOuterPolygons || isSelected)) {
      const d = getRoundedPolygonPath(poly.outer, radius);
      if (d) {
        const p = document.createElementNS(SVG_NS, 'path');
        p.setAttribute('d', d);
        p.style.fill = 'none';
        if (isSelected) {
          p.style.stroke = strokeColSel;
          p.style.strokeWidth = strokeWidthSel;
        } else {
          p.style.stroke = color;
          p.style.strokeWidth = strokeWidthOuter;
          p.style.strokeDasharray = '4,4';
        }
        overlay.appendChild(p);
      }
    }

    // inner ---------------------------------------------------------------
    if (poly.inner?.length > 2) {
      const innerR = radius > 0 ? Math.max(1, radius / 1.2) : 0;
      const d = getRoundedPolygonPath(poly.inner, innerR);
      if (d) {
        const p = document.createElementNS(SVG_NS, 'path');
        p.setAttribute('d', d);
        p.style.fill = color;
        // p.style.stroke = isSelected ? strokeColSel : color;
        // p.style.strokeWidth = isSelected ? strokeWidthSel : strokeWidthInner;
        p.style.fillOpacity = isSelected ? fillOpacitySel : '1';
        overlay.appendChild(p);
      }
    }
  });
}

export function drawCurrentPolygon(outerPts, innerPts = []) {
  // vertices
  outerPts.forEach(pt => {
    const c = document.createElementNS(SVG_NS, 'circle');
    c.setAttribute('cx', pt.x);
    c.setAttribute('cy', pt.y);
    c.classList.add('selected-point');
    overlay.appendChild(c);
  });

  // outer segments
  if (outerPts.length > 1) {
    const pl = document.createElementNS(SVG_NS, 'polyline');
    pl.setAttribute('points', outerPts.map(p => `${p.x},${p.y}`).join(' '));
    pl.classList.add('current-polygon-segment');
    overlay.appendChild(pl);
  }

  // inner preview
  if (innerPts.length > 1) {
    const inner = document.createElementNS(SVG_NS, 'polyline');
    inner.setAttribute('points', innerPts.map(p => `${p.x},${p.y}`).join(' '));
    inner.classList.add('current-polygon-segment');
    inner.style.strokeDasharray = '3,3';
    inner.style.stroke = 'darkgray';
    overlay.appendChild(inner);
  }
}

// -----------------------------------------------------------------------------
// snapping boundary (blue dashed rect)
// -----------------------------------------------------------------------------
function drawSnappingBoundary(geo) {
  // if (!overlay || !geo || geo.error || appState.currentPadding <= 0) return;
  if (!overlay || !geo || geo.error || geo.insetLeft === undefined) return;
  const x = geo.insetLeft;
  const y = geo.insetTop;
  const w = geo.insetRight  - geo.insetLeft;
  const h = geo.insetBottom - geo.insetTop;
  if (w <= 0 || h <= 0) return;

  const r = document.createElementNS(SVG_NS, 'rect');
  r.setAttribute('x', x.toFixed(3));
  r.setAttribute('y', y.toFixed(3));
  r.setAttribute('width',  w.toFixed(3));
  r.setAttribute('height', h.toFixed(3));
  r.style.fill = 'none';
  r.style.stroke = '#007bff';
  r.style.strokeWidth = '1px';
  r.style.strokeDasharray = '4,4';
  r.style.pointerEvents = 'none';
  overlay.appendChild(r);
}

// -----------------------------------------------------------------------------
// public – redraw everything
// -----------------------------------------------------------------------------
export function redrawAllSelections(geo = cachedGeo, currentInner = []) {
  clearSelectionOverlay();

  drawSnappingBoundary(geo);
  drawFinishedPolygons(appState.finishedPolygons);
  drawCurrentPolygon(appState.currentPolygonPoints, currentInner);
}
