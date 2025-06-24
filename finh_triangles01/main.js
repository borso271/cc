// main.js
import * as UIManager from './js/uiManager.js';
import * as FrameCalculator from './js/frameCalculator.js';
import * as GridGenerator from './js/gridGenerator.js';
import * as SelectionManager from './js/selectionManager.js';
import * as PolygonDrawer from './js/polygonDrawer.js';
import * as PolygonOffset from './js/polygonOffset.js'; // Ensure this path is correct
import { state as appState } from './js/appState.js';
import * as ShapeSelection from './js/shapeSelectionAndModification.js'; // <<< 1. IMPORT IT
import { bestGridStroke } from './js/utils.js';
/* ------------------------------------------------------- *
 *  global caches                                          */
let lastCalculatedFrameProps     = null;
let lastCalculatedGridGeoParams  = null;
let lastGridKey                  = '';   // <- remembers last “ratio” settings
/* ------------------------------------------------------- */

function updateAppView(forceSnapPointRecalc = false) {
  const inputs = UIManager.getInputValues();               // UI values

  /* 1. sync state with UI ------------------------------------------- */
  // appState.currentPadding      = inputs.padding;
  appState.currentCornerRadius = inputs.cornerRadius;

  appState.gridStrokeColor = bestGridStroke(appState.frameBgColor);

  /* 1-A. clear finished polygons if the grid ratio changed ---------- */
  const gridKey = [
    inputs.numTrianglesVertical,
    inputs.gridAlignment,
    inputs.ratioString,
    inputs.padding,
    inputs.paddingMode,
  ].join('|');
  
  console.log("gridkey is: ", gridKey)
  console.log("lastgridkey is: ", lastGridKey)
  if (gridKey !== lastGridKey) {
   
    appState.finishedPolygons = [];
    appState.selectedIndex    = -1;
    lastGridKey               = gridKey;


  // wipe any SVG the user is still seeing, even if we bail out later
   PolygonDrawer.clearSelectionOverlay();
   PolygonDrawer.redrawAllSelections(undefined, []); // cached geo or none
  }

  /* 2. validate inputs ---------------------------------------------- */
  if (!UIManager.validateInputs(inputs)) {
    UIManager.clearVisualsForError();
    PolygonDrawer.clearSelectionOverlay();
    appState.allSnapPoints = [];
    lastCalculatedFrameProps    = null;
    lastCalculatedGridGeoParams = null;
    return;
  }

  /* 3. frame -------------------------------------------------------- */
  const frameProps = FrameCalculator.calculateFrameProperties(inputs);
  appState.currentPadding      = frameProps.padding;      // real px

  FrameCalculator.renderFrameDOM(frameProps);
  lastCalculatedFrameProps = frameProps;

  appState.lastFrameWidth  = frameProps.outerWidth;
  appState.lastFrameHeight = frameProps.outerHeight;

  UIManager.updateLastValidFrameDimensions?.(
       frameProps.outerWidth, frameProps.outerHeight);

  SelectionManager.updateFrameSettings(frameProps.padding);

  /* 4. dimension read-out ------------------------------------------ */
  UIManager.updateDimensionsDisplay(
    `Outer: ${frameProps.outerWidth.toFixed(0)}px W × ${frameProps.outerHeight.toFixed(2)}px H | ` +
    `UI Padding: ${frameProps.padding.toFixed(2)}px | ` +
    `Triangles: ${inputs.numTrianglesVertical} | Align: ${inputs.gridAlignment}`
  );

  /* 5. grid (calculate → cache → draw) ------------------------------ */
  GridGenerator.renderGridDOM(null, { svgGridWidth: 0, svgGridHeight: 0 });
  let geo = null;

  if (frameProps.outerWidth > 0 &&
      frameProps.outerHeight > 0 &&
      inputs.numTrianglesVertical > 0) {

    geo = GridGenerator.calculateGridGeometry(inputs, frameProps);



    if (!geo.error && geo.h_triangle > 0.001 && geo.s_triangle > 0.001) {
      lastCalculatedGridGeoParams = geo;
    //   const svg = GridGenerator.createGridSVGElement(geo);


    console.log("framebgcolor is: ", inputs.frameBgColor)
      const svg = GridGenerator.createGridSVGElement(geo, inputs.frameBgColor);

      GridGenerator.renderGridDOM(svg, geo);
      PolygonDrawer.cacheGeometry?.(geo);      // cache for later redraws
    } else {
      lastCalculatedGridGeoParams = null;
      UIManager.appendToDimensionsDisplay(
        ` (${geo.error || 'Triangles too small for grid'})`);
      geo = null;                              // treat as invalid
    }
  }

  appState.frameBgColor = inputs.frameBgColor;


SelectionManager.calculateAllSnapPoints(lastCalculatedFrameProps,
                                      lastCalculatedGridGeoParams);

let lastPadding = inputs.padding;
if (inputs.padding !== lastPadding) {
    SelectionManager.calculateAllSnapPoints(frameProps, geo);
    lastPadding = inputs.padding;
}


  /* 7. live inner preview ------------------------------------------ */
  let liveInnerPreview = [];
  if (appState.currentPolygonPoints.length >= 3) {
    let pts = [...appState.currentPolygonPoints];
    if (PolygonOffset.getPolygonWindingOrder(pts) > 0) pts.reverse();
    const off = SelectionManager.getCurrentInnerPolygonOffset();
    if (off > 0) liveInnerPreview = PolygonOffset.calculateInsetPolygon(pts, off);
  }

  /* 8. redraw polygons & boundary ---------------------------------- */
  PolygonDrawer.redrawAllSelections(geo, liveInnerPreview);

  /* 9. UI buttons --------------------------------------------------- */
  ShapeSelection.updateSelectedShapeActionsUI?.();
  UIManager.updateDrawingActionButtonsVisibility?.();

}















// function updateAppView(forceSnapPointRecalc = false) {
//     const inputs = UIManager.getInputValues(); // padding, cornerRadius, etc.
  
//     /* ------------------------------------------------------------------
//      * 1. Sync state with UI ------------------------------------------- */
//     appState.currentPadding      = inputs.padding;
//     appState.currentCornerRadius = inputs.cornerRadius;



//   /* 1-A. clear finished polygons if the grid ratio changed ---------- */
//   const gridKey = `${inputs.numTrianglesVertical}|${inputs.gridAlignment}`;
//   if (gridKey !== lastGridKey) {
//     appState.finishedPolygons = [];
//     appState.selectedIndex    = -1;
//     lastGridKey               = gridKey;
//   }
//     /* ------------------------------------------------------------------
//      * 2. Validate inputs ---------------------------------------------- */
//     if (!UIManager.validateInputs(inputs)) {
//       UIManager.clearVisualsForError();
//       PolygonDrawer.clearSelectionOverlay();
//       appState.allSnapPoints = [];
//       lastCalculatedFrameProps     = null;
//       lastCalculatedGridGeoParams  = null;
//       return;
//     }
  
//     /* ------------------------------------------------------------------
//      * 3. Frame --------------------------------------------------------- */
//     const frameProps = FrameCalculator.calculateFrameProperties(inputs);
//     FrameCalculator.renderFrameDOM(frameProps);
//     lastCalculatedFrameProps = frameProps;
  
//     appState.lastFrameWidth  = frameProps.outerWidth;
//     appState.lastFrameHeight = frameProps.outerHeight;
  
//     // keep UIManager informed of valid dimensions
//     UIManager.updateLastValidFrameDimensions?.(frameProps.outerWidth,
//                                               frameProps.outerHeight);
  
//     // tell SelectionManager the padding (for inner‑offset maths)
//     SelectionManager.updateFrameSettings(frameProps.padding);
  
//     /* ------------------------------------------------------------------
//      * 4. Dimension read‑out ------------------------------------------- */
//     const baseInfo = `Outer: ${frameProps.outerWidth.toFixed(0)}px W × ${frameProps.outerHeight.toFixed(2)}px H | ` +
//                      `UI Padding: ${frameProps.padding.toFixed(2)}px | Triangles: ${inputs.numTrianglesVertical} | Align: ${inputs.gridAlignment}`;
//     UIManager.updateDimensionsDisplay(baseInfo);
  
//     /* ------------------------------------------------------------------
//      * 5. Grid (calculate → cache → draw) ------------------------------ */
//     GridGenerator.renderGridDOM(null, { svgGridWidth: 0, svgGridHeight: 0 }); // clear previous SVG
//     let geo = null;
  
//     if (frameProps.outerWidth > 0 && frameProps.outerHeight > 0 && inputs.numTrianglesVertical > 0) {
//       geo = GridGenerator.calculateGridGeometry(inputs, frameProps);
  
//       if (!geo.error && geo.h_triangle > 0.001 && geo.s_triangle > 0.001) {
//         lastCalculatedGridGeoParams = geo;
//         const svg = GridGenerator.createGridSVGElement(geo);
//         GridGenerator.renderGridDOM(svg, geo);
//         PolygonDrawer.cacheGeometry?.(geo);               // << cache once per render
//       } else {
//         lastCalculatedGridGeoParams = null;
//         if (geo.error) {
//           UIManager.appendToDimensionsDisplay(` (${geo.error})`);
//         } else {
//           UIManager.appendToDimensionsDisplay(" (Triangles too small for grid)");
//         }
//         geo = null; // treat as invalid for later calls
//       }
//     }
  
//     /* ------------------------------------------------------------------
//      * 6. Snap points --------------------------------------------------- */
//     if (forceSnapPointRecalc || appState.allSnapPoints.length === 0) {
//       SelectionManager.calculateAllSnapPoints(lastCalculatedFrameProps,
//                                              lastCalculatedGridGeoParams);
//     }
  
//     /* ------------------------------------------------------------------
//      * 7. Live inner preview ------------------------------------------- */
//     let liveInnerPreview = [];
//     if (appState.currentPolygonPoints.length >= 3) {
//       let pts = [...appState.currentPolygonPoints];
//       if (PolygonOffset.getPolygonWindingOrder(pts) > 0) pts.reverse();
  
//       const offset = SelectionManager.getCurrentInnerPolygonOffset();
//       if (offset > 0) {
//         liveInnerPreview = PolygonOffset.calculateInsetPolygon(pts, offset);
//       }
//     }
  
//     /* ------------------------------------------------------------------
//      * 8. Redraw polygons & snapping boundary -------------------------- */
//     PolygonDrawer.redrawAllSelections(geo, liveInnerPreview);
  
//     /* ------------------------------------------------------------------
//      * 9. UI / buttons -------------------------------------------------- */
//     ShapeSelection.updateSelectedShapeActionsUI?.();
//     UIManager.updateDrawingActionButtonsVisibility?.();
//   }
  

// Initialize
UIManager.setupEventListeners(updateAppView);
SelectionManager.initializeSelectionHandling();

ShapeSelection.initializeShapeSelection();       

