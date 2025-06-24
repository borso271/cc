
// appState.js
export const state = {
isSelectionModeActive: true,
    // --- Core Inputs (can be part of appState for easier access & reactivity) ---
    currentPadding: 20, 
    currentCornerRadius: 10,
    currentPolygonPoints: [],
    allSnapPoints: [],
    snapTolerance: 15,
    
    frameBgColor: 'ffffff',   // ← NEW

    // --- Polygon Data & Styling ---
    finishedPolygons: [],
    availableColors: ['#212647', '#678BFF', '#F9FAFC'],
    activeColor: '#212647',
    
    // --- Shape Management ---
    selectedIndex: -1,
    nextPolygonId: 0,
    showOuterPolygons: true,

    // --- UI Interaction State ---
    isCornerRadiusManuallySet: false, // New flag to track if user touched the radius slider

    lastFrameWidth: 0,
    lastFrameHeight: 0,

    gridStrokeColor   : '#000000',          // ← NEW  (synced automatically)
};