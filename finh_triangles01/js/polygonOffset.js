// polygonOffset.js

// --- Vector Math Helpers ---
function V(x, y) { return { x, y }; }
function sub(v1, v2) { return V(v1.x - v2.x, v1.y - v2.y); }
function add(v1, v2) { return V(v1.x + v2.x, v1.y + v2.y); }
function scale(v, s) { return V(v.x * s, v.y * s); }
function normalize(v) {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    return len === 0 ? V(0, 0) : V(v.x / len, v.y / len);
}
// For an edge vector of a CCW polygon (Y-down screen coords),
// this calculates the INWARD normal.
function calculateInwardNormal(edge_dir_vector) {
    return V(-edge_dir_vector.y, edge_dir_vector.x);
}
function dot(v1, v2) { return v1.x * v2.x + v1.y * v2.y; }

// Calculates intersection of line (p1,p2) and line (p3,p4)
function lineIntersection(p1, p2, p3, p4) {
    const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
    if (Math.abs(d) < 1e-9) { // Lines are parallel or coincident
        return null;
    }
    const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
    return V(p1.x + t * (p2.x - p1.x), p1.y + t * (p2.y - p1.y));
}

export function calculateInsetPolygon(polygonPoints, offsetDistance) {
    if (!polygonPoints || polygonPoints.length < 3 || offsetDistance === 0) {
        return [];
    }

    let workingPoints = [...polygonPoints];
    // Ensure CCW for Y-down screen coordinates (negative shoelace sum).
    // If sum is positive (CW), reverse.
    if (getPolygonWindingOrder(workingPoints) > 0) {
        workingPoints.reverse();
    }
    // Now workingPoints is CCW.

    const insetPoints = [];
    const n = workingPoints.length;

    for (let i = 0; i < n; i++) {
        const p_prev = workingPoints[(i + n - 1) % n];
        const p_curr = workingPoints[i];
        const p_next = workingPoints[(i + 1) % n];

        // Edge directions
        const edge1_dir = normalize(sub(p_curr, p_prev)); // Direction p_prev -> p_curr
        const edge2_dir = normalize(sub(p_next, p_curr)); // Direction p_curr -> p_next

        // Calculate INWARD normals for the two edges meeting at p_curr
        const inward_normal1 = calculateInwardNormal(edge1_dir);
        const inward_normal2 = calculateInwardNormal(edge2_dir);

        // Define the two inner parallel lines:
        // Line 1 is parallel to edge (p_prev, p_curr), shifted inward.
        // Points on this line are P_original + inward_normal1 * offsetDistance.
        const p1_for_line1 = add(p_prev, scale(inward_normal1, offsetDistance));
        const p2_for_line1 = add(p_curr, scale(inward_normal1, offsetDistance));

        // Line 2 is parallel to edge (p_curr, p_next), shifted inward.
        const p1_for_line2 = add(p_curr, scale(inward_normal2, offsetDistance));
        const p2_for_line2 = add(p_next, scale(inward_normal2, offsetDistance));
        
        const intersection = lineIntersection(p1_for_line1, p2_for_line1, p1_for_line2, p2_for_line2);

        if (intersection) {
            insetPoints.push(intersection);
        } else {
            // Fallback for parallel lines (original segment was straight, or offset caused issues)
            console.warn("Parallel offset lines at vertex", i, "- p_curr:", p_curr, ". Applying fallback.");
            // Shift p_curr inward along the normal of the first segment (or an average)
            insetPoints.push(add(p_curr, scale(inward_normal1, offsetDistance)));
        }
    }

    // Optional: Final winding check on the result
    if (insetPoints.length === n) {
        const finalWindingSum = getPolygonWindingOrder(insetPoints);
        const originalWindingSum = getPolygonWindingOrder(workingPoints); // Should be negative for CCW

        // If original was CCW (negative sum), inset should also be CCW (negative sum).
        // If signs are different (originalWindingSum * finalWindingSum < 0)
        // and final area isn't negligible, it indicates a problem (e.g., polygon flipped).
        if (originalWindingSum * finalWindingSum < 0 && Math.abs(finalWindingSum) > 1e-3) {
             console.warn("Inset polygon winding order flipped. Offset might be too large or polygon complex.",
                          "Original winding sum:", originalWindingSum, "Inset winding sum:", finalWindingSum);
        }
    }
    return insetPoints;
}

// Calculates twice the signed area. For Y-down screen coordinates:
// Negative sum indicates Counter-Clockwise (CCW).
// Positive sum indicates Clockwise (CW).
export function getPolygonWindingOrder(polygonPoints) {
    if (!polygonPoints || polygonPoints.length < 3) return 0;
    let sum = 0;
    for (let i = 0; i < polygonPoints.length; i++) {
        const p1 = polygonPoints[i];
        const p2 = polygonPoints[(i + 1) % polygonPoints.length];
        sum += (p2.x - p1.x) * (p2.y + p1.y);
    }
    return sum;
}
