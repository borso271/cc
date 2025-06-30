// utils/tri-centroid.js
export function centroidPixel (q, r, up, SIDE){
    const H   = SIDE * Math.sqrt(3) / 2;   // triangle height
    const x0  = (q + r / 2) * SIDE;        // left corner of the hex cell
    const y0  =  r * H;                    // top corner of the hex cell
  
    /*  DOWN (▼) : centroid y = y0 +  H/3
     *  UP   (▲) : centroid y = y0 + -H/3    */
    const cx  = x0 + SIDE / 2;
    const cy  = y0 + (up ? -H/3 : H/3);
    return [cx, cy];
  }
  