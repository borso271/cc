// filters/customGridAsciiSVG.js

const ASCII_RAMPS_SVG = { // Can be same as canvas version
    standardShort: "@%#*+=-:. ",
    simpleBlocks: "█▓▒░ ",
};
const DEFAULT_RAMP_ID_SVG = 'standardShort';
const SVG_NS = "http://www.w3.org/2000/svg";

const filterDefinitionSVG = {
    id: 'customGridAsciiSVG',
    name: 'Grid ASCII (SVG)',
    params: [
        {
            id: 'charRamp',
            name: 'Character Set',
            type: 'select',
            defaultValue: DEFAULT_RAMP_ID_SVG,
            options: Object.keys(ASCII_RAMPS_SVG).map(key => ({ value: key, label: key.replace(/([A-Z])/g, ' $1').trim() }))
        },
        {
            id: 'cellSizeSVG', // Parameter for target cell size in SVG units (can be abstract)
            name: 'Cell Detail', // Higher = more cells (finer detail)
            type: 'range',
            defaultValue: 10, // Corresponds to how many pixels a cell might map to
            min: 4,
            max: 50,
            step: 1
        },
        {
            id: 'invertBrightnessSVG',
            name: 'Dark Text',
            type: 'select',
            defaultValue: 'true',
            options: [ { value: 'true', label: 'Yes' }, { value: 'false', label: 'No (Light Text)' } ]
        },
        {
            id: 'fontFamilySVG',
            name: 'Font Family',
            type: 'text',
            defaultValue: 'monospace'
        }
    ],
    init: (outputElement, regionPixelWidth, regionPixelHeight, options = {}) => {
        if (!outputElement) return null;
        outputElement.innerHTML = ''; // Clear for the new SVG

        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('width', '100%'); // Fill container
        svg.setAttribute('height', '100%');
        // Preserve aspect ratio of characters, let them scale within viewBox cells
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        outputElement.appendChild(svg);

        return { svgElement: svg }; // Return the SVG element
    },
    apply: (imageData, outputElement, regionPixelWidth, regionPixelHeight, options = {}, filterState) => {
        if (!filterState || !filterState.svgElement) return;

        const svg = filterState.svgElement;
        const sourceImgWidth = imageData.width;
        const sourceImgHeight = imageData.height;

        // Clear previous SVG content
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }

        // Ensure SVG has dimensions for viewBox calculation
        if (regionPixelWidth <=0 || regionPixelHeight <=0) return;

        const rampId = options.charRampSVG || DEFAULT_RAMP_ID_SVG;
        const selectedRamp = ASCII_RAMPS_SVG[rampId] || ASCII_RAMPS_SVG[DEFAULT_RAMP_ID_SVG];
        const wantsDarkText = (options.invertBrightnessSVG === 'true' || options.invertBrightnessSVG === true);
        const fontFamily = options.fontFamilySVG || 'monospace';
        const targetCellSize = Math.max(2, parseInt(options.cellSizeSVG) || 10);


        // Determine number of cells based on targetCellSize and REGION's pixel dimensions
        const numCellsX = Math.max(1, Math.floor(regionPixelWidth / targetCellSize));
        const numCellsY = Math.max(1, Math.floor(regionPixelHeight / targetCellSize));

        // Set viewBox on SVG to establish a coordinate system based on cells
        // This makes each cell roughly 1x1 unit in SVG space.
        svg.setAttribute('viewBox', `0 0 ${numCellsX} ${numCellsY}`);

        // Background rectangle for SVG (if needed)
        const bgRect = document.createElementNS(SVG_NS, 'rect');
        bgRect.setAttribute('width', numCellsX); // SVG units
        bgRect.setAttribute('height', numCellsY); // SVG units
        let bgColor = wantsDarkText ? 'white' : 'black';
        if (outputElement.closest('.filter-region-wrapper')) {
            const wrapperColor = getComputedStyle(outputElement.closest('.filter-region-wrapper'))
                                .getPropertyValue('--region-visual-color').trim();
            if (wrapperColor && wantsDarkText) bgColor = wrapperColor;
        }
        bgRect.setAttribute('fill', bgColor);
        svg.appendChild(bgRect);


        const sourceStepX = sourceImgWidth / numCellsX;
        const sourceStepY = sourceImgHeight / numCellsY;
        const data = imageData.data;

        for (let cy = 0; cy < numCellsY; cy++) {
            for (let cx = 0; cx < numCellsX; cx++) {
                const sourceRectX = Math.floor(cx * sourceStepX);
                const sourceRectY = Math.floor(cy * sourceStepY);
                const sourceRectW = Math.ceil(sourceStepX);
                const sourceRectH = Math.ceil(sourceStepY);
                let totalBrightness = 0; let pixelCount = 0;

                for (let sy = 0; sy < sourceRectH; sy++) {
                    for (let sx = 0; sx < sourceRectW; sx++) {
                        const cPX = sourceRectX + sx; const cPY = sourceRectY + sy;
                        if (cPX < sourceImgWidth && cPY < sourceImgHeight) {
                            const i = (cPY * sourceImgWidth + cPX) * 4;
                            totalBrightness += (0.2126 * data[i] + 0.07152 * data[i+1] + 0.0722 * data[i+2]);
                            pixelCount++;
                        }
                    }
                }
                const avgBrightness = pixelCount > 0 ? totalBrightness / pixelCount : 0;
                const normalizedBrightness = avgBrightness / 255;
                let charIndex;
                const maxRampIndex = selectedRamp.length - 1;

                if (wantsDarkText) {
                    charIndex = Math.round(normalizedBrightness * maxRampIndex);
                } else {
                    charIndex = Math.round((1 - normalizedBrightness) * maxRampIndex);
                }
                charIndex = Math.max(0, Math.min(charIndex, maxRampIndex));
                const charToDraw = selectedRamp[charIndex];

                // Create SVG <text> element
                const textEl = document.createElementNS(SVG_NS, 'text');
                textEl.setAttribute('x', cx + 0.5); // Center in cell (SVG units)
                textEl.setAttribute('y', cy + 0.5); // Center in cell (SVG units)
                textEl.setAttribute('font-family', fontFamily);
                
                // Font size in SVG units - aim for it to fill roughly one cell unit vertically
                textEl.setAttribute('font-size', "0.8"); // e.g., 0.8 of cell height (1 unit)
                textEl.setAttribute('text-anchor', 'middle');
                textEl.setAttribute('dominant-baseline', 'middle');
                // textEl.setAttribute('lengthAdjust', 'spacingAndGlyphs'); // Stretches char
                // textEl.setAttribute('textLength', "1"); // Try to make it 1 cell unit wide

                let textColor = wantsDarkText ? 'black' : 'white';
                if (!wantsDarkText && outputElement.closest('.filter-region-wrapper')) {
                     const wrapperColor = getComputedStyle(outputElement.closest('.filter-region-wrapper'))
                                        .getPropertyValue('--region-visual-color').trim();
                    if(wrapperColor) textColor = wrapperColor;
                }
                textEl.setAttribute('fill', textColor);
                textEl.textContent = charToDraw;
                svg.appendChild(textEl);
            }
        }
        return null;
    },
    destroy: (outputElement, filterState) => {
        if (filterState && filterState.svgElement && filterState.svgElement.parentNode) {
            filterState.svgElement.parentNode.removeChild(filterState.svgElement);
        }
        if (outputElement) {
            outputElement.innerHTML = '';
        }
    }
};

export default filterDefinitionSVG; // Note the changed export name