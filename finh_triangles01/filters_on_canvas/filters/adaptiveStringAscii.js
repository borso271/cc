// filters/classicAsciiCanvas.js

const ASCII_RAMPS_CLASSIC = {
    standardShort: "@%#*+=-:. ", // Dark to Light
    standardLong: "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ", // Dark to Light
    simpleBlocks: "█▓▒░ ",       // Dark to Light solid blocks
    binaryDigits: "10",         // Simple binary
    shades: "▓▒░ ",           // Medium to light shades
    linesAndDots: "|=+*:. ",    // Mix of lines and dots
    mathSymbols: "∑∫∏√∯∮∝∞∧∨∩∪∈∉⊂⊃⊆⊇⊕⊗∴∵≠≈≤≥≡", // Mathematical symbols (order for brightness mapping might need tweaking)
    boxDrawing: "┌┐└┘─│┬┴┼═║╔╗╚╝╦╩╠╣░▒▓█", // Box drawing characters (order might need tweaking for brightness)
    sparse: "#=-. ",           // A sparser set
    dense: "MWNQBDRHK$@&%0()OCJUYX{}/\\|?1Lcvunxrjftz<>i*!+~'_\"`;,:-. ",
    
};
const DEFAULT_RAMP_ID_CLASSIC = 'standardShort';

const filterDefinition = {
    id: 'classicAsciiCanvas',
    name: 'Classic ASCII (Canvas)',
    params: [
        {
            id: 'charRamp',
            name: 'Character Set',
            type: 'select',
            defaultValue: DEFAULT_RAMP_ID_CLASSIC,
            options: Object.keys(ASCII_RAMPS_CLASSIC).map(key => ({ value: key, label: key.replace(/([A-Z])/g, ' $1').trim() }))
        },
        {
            id: 'fontSize', // User directly controls the font size in pixels
            name: 'Font Size (px)',
            type: 'number',
            defaultValue: 10,
            min: 4,
            max: 30, // Keep reasonably small for performance if many regions
            step: 1
        },
        {
            id: 'fontFamily',
            name: 'Font Family',
            type: 'text',
            defaultValue: 'Consolas, "Courier New", monospace' // Specify fallbacks
        },
        {
            id: 'lineHeightFactor', // Multiplier for font size to get line height
            name: 'Line Height Factor',
            type: 'range',
            defaultValue: 0.9, // e.g., 90% of font size for tighter packing
            min: 0.7,
            max: 1.5,
            step: 0.05
        },
        {
            id: 'invertMap', // Determines how brightness maps to ramp for text color
            name: 'Dark Text',
            type: 'select',
            defaultValue: 'false',
            options: [{value: 'true', label: 'Yes'}, {value: 'false', label: 'No (Light Text)'}]
        },
        {
            id: 'useAverageColor', // Use average color of cell for character, or just region color
            name: 'Use Cell Color for Text',
            type: 'select',
            defaultValue: 'false', // Default to using region's color for text for brutalist style
            options: [{value: 'true', label: 'Yes'}, {value: 'false', label: 'No (Use Region Color)'}]
        }
    ],
    init: (outputElement, regionPixelWidth, regionPixelHeight, options = {}) => {
        if (!outputElement) {
            console.error("classicAsciiCanvas.init: outputElement is missing!");
            return null;
        }
        outputElement.innerHTML = ''; // Clear for the new canvas

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, regionPixelWidth);
        canvas.height = Math.max(1, regionPixelHeight);
        outputElement.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            console.error("Failed to get 2D context for Classic ASCII canvas");
            outputElement.innerHTML = "<pre>Canvas Context Error</pre>";
            return null;
        }
        return { canvas: canvas, ctx: ctx, charMetrics: { width: 0, height: 0 } }; // charMetrics will be updated
    },
    apply: (imageData, outputElement, regionPixelWidth, regionPixelHeight, options = {}, filterState) => {
        if (!filterState || !filterState.canvas || !filterState.ctx) {
            console.error("classicAsciiCanvas.apply: Filter not properly initialized.");
            return;
        }

        const { canvas, ctx, charMetrics } = filterState;
        const sourceImgWidth = imageData.width;
        const sourceImgHeight = imageData.height;

        if (canvas.width !== regionPixelWidth || canvas.height !== regionPixelHeight) {
            canvas.width = Math.max(1, regionPixelWidth);
            canvas.height = Math.max(1, regionPixelHeight);
        }

        const getOption = (paramId, parseFn = val => val, type) => {
            const paramDef = filterDefinition.params.find(p => p.id === paramId);
            const defaultValue = paramDef ? paramDef.defaultValue : undefined;
            let value = options[paramId] !== undefined ? options[paramId] : defaultValue;
            if (type === 'number') return isNaN(parseFloat(value)) ? parseFloat(defaultValue) : parseFloat(value);
            if (type === 'booleanSelect') return String(value) === 'true';
            return parseFn(value);
        };

        const rampId = getOption('charRamp') || DEFAULT_RAMP_ID_CLASSIC;
        const selectedRamp = ASCII_RAMPS_CLASSIC[rampId] || ASCII_RAMPS_CLASSIC[DEFAULT_RAMP_ID_CLASSIC];
        const fontSize = getOption('fontSize', parseInt, 'number');
        const fontFamily = getOption('fontFamily') || 'monospace';
        const lineHeightFactor = getOption('lineHeightFactor', parseFloat, 'number');
        const wantsDarkText = getOption('invertMap', undefined, 'booleanSelect');
        const useCellColor = getOption('useAverageColor', undefined, 'booleanSelect');

        // Determine actual character cell dimensions based on font
        ctx.font = `${fontSize}px ${fontFamily}`;
        // For monospace, width of 'W' or 'M' is usually a good representative.
        // Height is roughly font size, but line height is more practical for stepping.
        const measuredChar = ctx.measureText('W'); // Measure a wide character
        charMetrics.width = measuredChar.width > 0 ? measuredChar.width : fontSize * 0.6; // Fallback if measure is 0
        charMetrics.height = fontSize * lineHeightFactor; // This is our stepY

        if (charMetrics.width <= 0 || charMetrics.height <= 0) {
            console.error("Invalid char metrics:", charMetrics);
            return; // Cannot proceed
        }
        
        // Set canvas background based on inversion choice
        ctx.fillStyle = wantsDarkText ? 'white' : 'black';
        if (wantsDarkText && outputElement.closest('.filter-region-wrapper')) {
            const wrapperColor = getComputedStyle(outputElement.closest('.filter-region-wrapper'))
                                .getPropertyValue('--region-visual-color').trim();
            if (wrapperColor && wrapperColor !== 'transparent' && wrapperColor.toLowerCase() !== 'black') {
                ctx.fillStyle = wrapperColor;
            }
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);


        const data = imageData.data;
        ctx.textAlign = 'left';   // Draw characters from their top-left
        ctx.textBaseline = 'top'; // Align to top of the drawing cell

        for (let y = 0; y < sourceImgHeight; y += charMetrics.height) {
            for (let x = 0; x < sourceImgWidth; x += charMetrics.width) {
                // Get average color/brightness of the source image block
                // corresponding to this character cell.
                let rSum = 0, gSum = 0, bSum = 0, pixelCount = 0;
                const blockWidth = Math.min(charMetrics.width, sourceImgWidth - x);
                const blockHeight = Math.min(charMetrics.height, sourceImgHeight - y);

                for (let sy = 0; sy < blockHeight; sy++) {
                    for (let sx = 0; sx < blockWidth; sx++) {
                        const imgX = Math.floor(x + sx);
                        const imgY = Math.floor(y + sy);
                        if (imgX < sourceImgWidth && imgY < sourceImgHeight) {
                            const idx = (imgX + imgY * sourceImgWidth) * 4;
                            rSum += data[idx];
                            gSum += data[idx + 1];
                            bSum += data[idx + 2];
                            pixelCount++;
                        }
                    }
                }

                if (pixelCount === 0) continue;

                const avgR = rSum / pixelCount;
                const avgG = gSum / pixelCount;
                const avgB = bSum / pixelCount;
                const avgBrightness = (avgR + avgG + avgB) / 3;

                let charIndex;
                const maxRampIndex = selectedRamp.length - 1;
                if (wantsDarkText) { // Dark text (low ramp index for dark chars) for dark image parts
                    charIndex = Math.round((avgBrightness / 255) * maxRampIndex);
                } else { // Light text (high ramp index for dark chars) for dark image parts
                    charIndex = Math.round(((255 - avgBrightness) / 255) * maxRampIndex);
                }
                charIndex = Math.max(0, Math.min(charIndex, maxRampIndex));
                const charToDraw = selectedRamp[charIndex];

                // Determine text color
                let currentTextColor;
                if (useCellColor) {
                    currentTextColor = `rgb(${Math.floor(avgR)}, ${Math.floor(avgG)}, ${Math.floor(avgB)})`;
                } else { // Use fixed color based on wantsDarkText and region color
                    currentTextColor = wantsDarkText ? 'black' : 'white';
                     if (!wantsDarkText && outputElement.closest('.filter-region-wrapper')) {
                         const wrapperColor = getComputedStyle(outputElement.closest('.filter-region-wrapper'))
                                            .getPropertyValue('--region-visual-color').trim();
                        if(wrapperColor && wrapperColor !== 'transparent' && wrapperColor.toLowerCase() !== 'black') {
                            currentTextColor = wrapperColor;
                        }
                    }
                }
                ctx.fillStyle = currentTextColor;

                // Calculate drawing position on the output canvas
                // This maps the source image block (x,y) to the output canvas (0,0) being top-left of region
                // We need to scale this mapping if source imageData dims != regionPixelWidth/Height
                const drawX = (x / sourceImgWidth) * regionPixelWidth;
                const drawY = (y / sourceImgHeight) * regionPixelHeight;

                ctx.fillText(charToDraw, drawX, drawY);
            }
        }
        return null; // Manages its own output via canvas
    },
    destroy: (outputElement, filterState) => {
        if (filterState && filterState.canvas && filterState.canvas.parentNode) {
            filterState.canvas.parentNode.removeChild(filterState.canvas);
        }
        if (outputElement) {
            outputElement.innerHTML = '';
        }
    }
};

export default filterDefinition;