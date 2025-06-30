// polygonToRoundedPath.js
// Or add these functions to your utils.js

/**
 * Helper function to calculate vector subtraction.
 * @param {{x: number, y: number}} p1
 * @param {{x: number, y: number}} p2
 * @returns {{x: number, y: number}} p1 - p2
 */
function subtractPoints(p1, p2) {
    return { x: p1.x - p2.x, y: p1.y - p2.y };
}

/**
 * Helper function to calculate vector addition.
 * @param {{x: number, y: number}} p1
 * @param {{x: number, y: number}} p2
 * @returns {{x: number, y: number}} p1 + p2
 */
function addPoints(p1, p2) {
    return { x: p1.x + p2.x, y: p1.y + p2.y };
}

/**
 * Helper function to scale a vector.
 * @param {{x: number, y: number}} p
 * @param {number} s
 * @returns {{x: number, y: number}} p * s
 */
function scalePoint(p, s) {
    return { x: p.x * s, y: p.y * s };
}

/**
 * Helper function to calculate the length (magnitude) of a vector.
 * @param {{x: number, y: number}} p
 * @returns {number}
 */
function vectorLength(p) {
    return Math.sqrt(p.x * p.x + p.y * p.y);
}

/**
 * Helper function to normalize a vector (make its length 1).
 * @param {{x: number, y: number}} p
 * @returns {{x: number, y: number}}
 */
function normalizePoint(p) {
    const len = vectorLength(p);
    if (len === 0) return { x: 0, y: 0 };
    return { x: p.x / len, y: p.y / len };
}

/**
 * Converts an array of polygon points into an SVG path string with rounded corners using arcs.
 *
 * @param {Array<{x: number, y: number}>} points - An array of point objects {x, y} representing the polygon vertices in order.
 * @param {number} cornerRadius - The desired radius for the rounded corners.
 * @returns {string} The SVG path data string (for the 'd' attribute).
 */

// polygonToRoundedPath.js (or utils.js)

// ... (helper functions: subtractPoints, addPoints, scalePoint, vectorLength, normalizePoint - keep these as they are) ...


export function getRoundedPolygonPath(points, cornerRadius) {

    console.log("get rounded calld with inputs: ", points, cornerRadius)
    if (!points || points.length < 3) {
        // ... (fallback for too few points) ...
        if (points && points.length > 0) return "M" + points.map(p => `${p.x},${p.y}`).join(" L");
        return "";
    }

    if (cornerRadius <= 0.01) { // Increased threshold slightly for effectively zero radius
        return "M" + points.map(p => `${p.x},${p.y}`).join(" L") + " Z";
    }

    let pathData = "";
    const numPoints = points.length;

    for (let i = 0; i < numPoints; i++) {
        const p0 = points[(i + numPoints - 1) % numPoints]; // Previous
        const p1 = points[i];                             // Current corner
        const p2 = points[(i + 1) % numPoints];           // Next

        const v1 = subtractPoints(p0, p1); // Vector from p1 towards p0
        const v2 = subtractPoints(p2, p1); // Vector from p1 towards p2

        const v1Length = vectorLength(v1);
        const v2Length = vectorLength(v2);

        if (v1Length === 0 || v2Length === 0) { // Degenerate case, coincident points
            if (i === 0) pathData += `M ${p1.x},${p1.y}`;
            else pathData += ` L ${p1.x},${p1.y}`;
            continue;
        }

        const v1n = normalizePoint(v1);
        const v2n = normalizePoint(v2);

        // Angle at the corner p1. acos gives angle in [0, PI].
        const dotProduct = v1n.x * v2n.x + v1n.y * v2n.y;
        // Clamp dotProduct to avoid Math.acos errors from floating point issues
        const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

        if (Math.abs(angle) < 1e-6 || Math.abs(angle - Math.PI) < 1e-6) { // Collinear or nearly collinear
            if (i === 0) pathData += `M ${p1.x},${p1.y}`;
            else pathData += ` L ${p1.x},${p1.y}`;
            continue;
        }

        // Distance from p1 along each edge to the tangent point of the arc
        let tangentDist = cornerRadius / Math.tan(angle / 2);

        // Clamp tangentDist to prevent arcs from overlapping or extending beyond segment midpoints
        tangentDist = Math.min(tangentDist, v1Length / 2, v2Length / 2);
        
        // Ensure tangentDist is positive (it should be if angle is valid for a corner)
        tangentDist = Math.max(0, tangentDist);

        const arcStartPoint = addPoints(p1, scalePoint(v1n, tangentDist));
        const arcEndPoint   = addPoints(p1, scalePoint(v2n, tangentDist));

        // Determine sweep-flag
        // Cross product (v1 x v2) for Y-down screen coordinates:
        // If polygon is CCW:
        //   Convex corner (left turn from p0-p1 to p1-p2) -> crossProductZ > 0
        //   To round OUTWARD, we need the arc to also "turn left" (usually sweep = 1)
        const crossProductZ = v1.x * v2.y - v1.y * v2.x;
        
        // *** TRY FLIPPING THE SWEEP FLAG ***
        const sweepFlag = crossProductZ > 0 ? 0 : 1; // If original was 1:0, try 0:1

        if (i === 0) {
            pathData += `M ${arcStartPoint.x.toFixed(3)},${arcStartPoint.y.toFixed(3)}`;
        } else {
            pathData += ` L ${arcStartPoint.x.toFixed(3)},${arcStartPoint.y.toFixed(3)}`;
        }
        
        // Only draw an arc if the tangentDist allows for a meaningful radius.
        // If tangentDist became 0 due to clamping, just draw a line to the corner.
        if (tangentDist > 0.01) { // Check against tangentDist instead of effectiveRadius directly for simplicity here
            pathData += ` A ${cornerRadius.toFixed(3)},${cornerRadius.toFixed(3)} 0 0,${sweepFlag} ${arcEndPoint.x.toFixed(3)},${arcEndPoint.y.toFixed(3)}`;
        } else { 
            // If rounding is too small for this corner, just draw to the original corner point p1
            // and then to where the next segment's rounding would start (or its endpoint).
            // This ensures connectivity if a corner cannot be rounded.
            pathData += ` L ${p1.x.toFixed(3)},${p1.y.toFixed(3)}`;
         
        }
    }
    pathData += " Z"; // Close the path
    return pathData;
}
