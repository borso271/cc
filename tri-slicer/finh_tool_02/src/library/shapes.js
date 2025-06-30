import { Polygon } from "../classes/polygon.js";
/* Every entry returns a *fresh* Polygon instance */
export const SHAPE_LIBRARY = [
  {
    id   : 'tri',
    name : 'Triangle',
    svg  : '<polygon points="12,2 22,22 2,22" />',   // 24×24 preview
    create() {
      // Simple 1-triangle shape (q,r coords relative)
      // vertices = (0,0) (1,-1) (1,0)
      return new Polygon([[0,0],[1,-1],[1,0]],
                         { q:0,r:0,R:0,F:0 },
                         '#678BFF');
    }
  },
  {
    id   : 'myShape',
    name : 'My Shape',
    svg  : `<svg viewBox="0 0 24 24"><polygon points="4.38,18.60 14.54,1.00 19.62,9.80 17.08,14.20 14.54,9.80 6.92,23.00" /></svg>`,
    create(){
      return new Polygon([[0,0],[4,-4],[4,-2],[3,-1],[3,-2],[0,1]], { q:0,r:0,R:0,F:0 }, '#678BFF');
    }
  }

];

