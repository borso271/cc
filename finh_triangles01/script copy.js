const aspectRatioSelect = document.getElementById('aspectRatio');
const frameWidthInput = document.getElementById('frameWidth');
const paddingInput = document.getElementById('padding');
const numTrianglesInput = document.getElementById('numTriangles');
const gridAlignmentSelect = document.getElementById('gridAlignment');

const frameContainer = document.getElementById('frameContainer');
const triangularGridContainer = document.getElementById('triangularGridContainer');
const innerFrame = document.getElementById('innerFrame');
const dimensionsInfo = document.getElementById('dimensionsInfo');

const SVG_NS = "http://www.w3.org/2000/svg";
const SQRT3 = Math.sqrt(3);

function updateFrame() {
    const ratioString = aspectRatioSelect.value;
    const outerWidth = parseInt(frameWidthInput.value, 10);
    const padding = parseFloat(paddingInput.value) || 0;
    const numTrianglesVertical = Math.max(1, parseInt(numTrianglesInput.value, 10) || 1);
    const gridAlignment = gridAlignmentSelect.value;

    if (isNaN(outerWidth) || outerWidth <= 0 || padding < 0) {
        dimensionsInfo.textContent = "Please enter valid positive numbers for width and non-negative for padding.";
        frameContainer.style.width = '0px'; frameContainer.style.height = '0px';
        innerFrame.style.width = '0px'; innerFrame.style.height = '0px';
        triangularGridContainer.innerHTML = '';
        return;
    }

    const [ratioW, ratioH] = ratioString.split(':').map(Number);
    if (isNaN(ratioW) || isNaN(ratioH) || ratioW <= 0 || ratioH <= 0) {
        dimensionsInfo.textContent = "Invalid aspect ratio selected.";
        triangularGridContainer.innerHTML = '';
        return;
    }

    const outerHeight = (outerWidth / ratioW) * ratioH;
    frameContainer.style.width = `${outerWidth}px`;
    frameContainer.style.height = `${outerHeight}px`;

    const innerWidth = Math.max(0, outerWidth - (padding * 2));
    const innerHeight = Math.max(0, outerHeight - (padding * 2));

    innerFrame.style.top = `${padding}px`;
    innerFrame.style.left = `${padding}px`;
    innerFrame.style.width = `${innerWidth}px`;
    innerFrame.style.height = `${innerHeight}px`;

    dimensionsInfo.textContent =
        `Outer: ${outerWidth.toFixed(0)}px W x ${outerHeight.toFixed(2)}px H | ` +
        `Inner: ${innerWidth.toFixed(2)}px W x ${innerHeight.toFixed(2)}px H | ` +
        `Padding: ${padding.toFixed(2)}px | Triangles: ${numTrianglesVertical} | Align: ${gridAlignment}`;

    triangularGridContainer.innerHTML = '';

    if (innerWidth <= 0 || innerHeight <= 0) {
        innerFrame.style.display = 'none';
        dimensionsInfo.textContent += " (Inner frame too small)";
        return;
    } else {
        innerFrame.style.display = 'block';
    }

    if (numTrianglesVertical <= 0) return;

    // --- Grid Geometry Calculations ---
    const gridStrokeWidth = 1; // From CSS: #triangularGridContainer svg path { stroke-width: 1; }
    const halfGridStroke = gridStrokeWidth / 2;

    // The geometric height of one triangle (vertex to base)
    // needs to account for the stroke width at the top and bottom of the entire grid.
    const availableGeometricHeightForTriangles = innerHeight - gridStrokeWidth;
    if (availableGeometricHeightForTriangles <= 0 && numTrianglesVertical > 0) {
        dimensionsInfo.textContent += " (Grid too thin for strokes)";
        return;
    }
    const h_triangle = availableGeometricHeightForTriangles / numTrianglesVertical;

    if (h_triangle < 0.5 && innerHeight > 0) { // Check h_triangle only if there's some innerHeight
        dimensionsInfo.textContent += " (Triangle height too small)";
        return;
    }
    const s_triangle = (2 * h_triangle) / SQRT3;
    if (s_triangle < 0.5 && innerWidth > 0 && h_triangle > 0) {
         dimensionsInfo.textContent += " (Triangle base too small)";
        return;
    }


    // --- SVG Container Setup ---
    const svgGridWidth = Math.max(outerWidth * 1.5, outerWidth + 6 * s_triangle);
    const svgGridHeight = outerHeight;

    triangularGridContainer.style.width = `${svgGridWidth}px`;
    triangularGridContainer.style.height = `${svgGridHeight}px`;
    
    const gridContainerLeftOffset = (outerWidth - svgGridWidth) / 2;
    triangularGridContainer.style.left = `${gridContainerLeftOffset}px`;
    triangularGridContainer.style.top = '0px';

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('width', svgGridWidth);
    svg.setAttribute('height', svgGridHeight);
    svg.setAttribute('xmlns', SVG_NS);


    // --- Pattern Alignment & Start Calculations ---
    let targetX_inFrame;
    switch (gridAlignment) {
        case 'left':
            targetX_inFrame = padding + halfGridStroke;
            break;
        case 'right':
            targetX_inFrame = (padding + innerWidth) - halfGridStroke;
            break;
        case 'center':
        default:
            targetX_inFrame = padding + innerWidth / 2;
            break;
    }

    const targetX_inSvg = targetX_inFrame - gridContainerLeftOffset;
    const s_half = s_triangle / 2;
    let patternStartX_svg = targetX_inSvg - (Math.floor(targetX_inSvg / s_half) * s_half);

    // y_pattern_origin_visual_top: Y-coordinate for the visual top edge of the grid pattern
    // This aligns with the inner frame's top padding line.
    const y_pattern_origin_visual_top = padding;


    // --- Drawing Loop Setup ---
    // Loop boundaries ensure the entire SVG canvas area is covered.
    // j_start/end are calculated based on the geometric h_triangle and y_pattern_origin_visual_top
    const j_start = Math.floor(-y_pattern_origin_visual_top / h_triangle) - 2;
    const j_end = Math.ceil((svgGridHeight - y_pattern_origin_visual_top) / h_triangle) + 2;
    
    const i_start = Math.floor(-patternStartX_svg / s_triangle) - 2;
    const i_end = Math.ceil((svgGridWidth - patternStartX_svg) / s_triangle) + 2;


    for (let j = j_start; j < j_end; j++) {
        // y_tip_abs/y_base_abs are the Y-coordinates for the *centers* of the horizontal strokes
        const y_tip_abs = y_pattern_origin_visual_top + (j * h_triangle) + halfGridStroke;
        const y_base_abs = y_pattern_origin_visual_top + ((j + 1) * h_triangle) + halfGridStroke;

        let x_row_offset = (j % 2 !== 0) ? s_triangle / 2 : 0;

        for (let i = i_start; i < i_end; i++) {
            const x_current_col_start_abs = patternStartX_svg + i * s_triangle + x_row_offset;

            const up_path_d = `M ${x_current_col_start_abs} ${y_base_abs} ` +
                              `L ${x_current_col_start_abs + s_triangle / 2} ${y_tip_abs} ` +
                              `L ${x_current_col_start_abs + s_triangle} ${y_base_abs} Z`;
            const pathUp = document.createElementNS(SVG_NS, 'path');
            pathUp.setAttribute('d', up_path_d);
            svg.appendChild(pathUp);

            const down_path_d = `M ${x_current_col_start_abs + s_triangle / 2} ${y_tip_abs} ` +
                                `L ${x_current_col_start_abs + s_triangle} ${y_base_abs} ` +
                                `L ${x_current_col_start_abs + s_triangle * 1.5} ${y_tip_abs} Z`;
            const pathDown = document.createElementNS(SVG_NS, 'path');
            pathDown.setAttribute('d', down_path_d);
            svg.appendChild(pathDown);
        }
    }
    triangularGridContainer.appendChild(svg);
}

aspectRatioSelect.addEventListener('change', updateFrame);
frameWidthInput.addEventListener('input', updateFrame);
paddingInput.addEventListener('input', updateFrame);
numTrianglesInput.addEventListener('input', updateFrame);
gridAlignmentSelect.addEventListener('change', updateFrame);

window.addEventListener('load', updateFrame);