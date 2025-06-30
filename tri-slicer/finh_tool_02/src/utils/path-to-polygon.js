/**
 * Convert an array of vertex indices (clicked path) into
 *   { verts : [[q,r], …] , pose : {q,r,R,F} }  ready for store.addPolygon
 * Assumes every vertex object has integer lattice coords v.q, v.r.
 */
export function pathToPolygon(currentPath, vertices) {
    if (currentPath.length < 3) return null;              // not a polygon
  
    // absolute lattice coordinates along the path
    const abs = currentPath.map(i => {
      const v = vertices[i];
      return [v.q, v.r];
    });
  
    // use first vertex as the translation component of the pose
    const [Q0, R0] = abs[0];
  
    // verts are stored *relative* to that origin
    const rel = abs.map(([q, r]) => [q - Q0, r - R0]);
  
    return {
      verts : rel,                   // array of [q,r] pairs, any length/angle
      pose  : { q: Q0, r: R0, R: 0, F: 0 }
    };
  }
  