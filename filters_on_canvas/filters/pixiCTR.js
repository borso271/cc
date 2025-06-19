// filters/pixiCRT.js

const filterDefinition = {
    id: 'pixiCRT',
    name: 'PixiJS CRT Screen',
    params: [
        { id: 'lineWidth', name: 'Line Width', type: 'range', defaultValue: 1.0, min: 0.5, max: 5.0, step: 0.1 },
        { id: 'lineContrast', name: 'Line Contrast', type: 'range', defaultValue: 0.25, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'noise', name: 'Noise Amount', type: 'range', defaultValue: 0.3, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'curvature', name: 'Curvature', type: 'range', defaultValue: 1.0, min: 0.0, max: 10.0, step: 0.1 },
        { id: 'vignetting', name: 'Vignette Radius', type: 'range', defaultValue: 0.3, min: 0.0, max: 1.0, step: 0.01 },
        {
            id: 'verticalLine',
            name: 'Vertical Lines',
            type: 'select',
            defaultValue: 'false', // PIXI default is false (horizontal)
            options: [
                { value: 'false', label: 'Horizontal' },
                { value: 'true', label: 'Vertical' }
            ]
        }
        // Example for adding time later for animation:
        // { id: 'time', name: 'Time (for noise anim)', type: 'number', defaultValue: 0, min:0, max: 1000, step: 0.1}
    ],
    init: (outputElement, regionPixelWidth, regionPixelHeight, options = {}) => {
        if (typeof PIXI === 'undefined' || typeof PIXI.filters === 'undefined' || typeof PIXI.filters.CRTFilter === 'undefined') {
            console.error("PixiJS or PixiJS CRTFilter not loaded!");
            if(outputElement) outputElement.innerHTML = "<pre>Error: PixiJS CRTFilter not found.</pre>";
            return null;
        }

        if (!outputElement) {
            console.error("PixiCRT.init: outputElement is missing!");
            return null;
        }
        outputElement.innerHTML = '';
        outputElement.style.backgroundColor = 'transparent';

        const canvasEl = document.createElement('canvas');
        outputElement.appendChild(canvasEl);

        let appInstance = null;
        let filterInstance = null;

        try {
            appInstance = new PIXI.Application({
                view: canvasEl,
                width: regionPixelWidth,
                height: regionPixelHeight,
                backgroundColor: 0x000000, // Black background often suits CRT
                autoDensity: true,
            });

            // Create filter instance with default options initially, then set from options
            filterInstance = new PIXI.filters.CRTFilter();

            // Apply initial parameters from options (merged with defaults)
            filterDefinition.params.forEach(param => {
                let value = (options && options[param.id] !== undefined)
                    ? options[param.id]
                    : param.defaultValue;

                if (param.type === 'range' || param.type === 'number') {
                    value = parseFloat(value);
                } else if (param.id === 'verticalLine') { // Handle boolean from select string
                    value = (value === 'true' || value === true);
                }
                filterInstance[param.id] = value;
            });
            // The CRTFilter also has seed, noiseSize, time, vignettingAlpha, vignettingBlur
            // which could be set here if they were in params.

            return {
                app: appInstance,
                canvasEl: canvasEl,
                sprite: null,
                filter: filterInstance
                // ticker: null // Will add if we do time-based animation
            };
        } catch (error) {
            console.error("Error initializing PixiJS for CRT:", error);
            if(outputElement) outputElement.innerHTML = `<pre>PixiJS Init Error: ${error.message}</pre>`;
            if (appInstance) appInstance.destroy(true, {children:true, texture:true, baseTexture:true});
            return null;
        }
    },
    apply: (imageData, outputElement, regionPixelWidth, regionPixelHeight, options = {}, filterState) => {
        if (!filterState || !filterState.app || !filterState.filter || !filterState.canvasEl) {
            console.error("PixiCRT.apply: Filter not properly initialized or filterState is missing.");
            return;
        }

        const { app, filter, canvasEl } = filterState;
        let { sprite /*, ticker */ } = filterState;

        if (app.renderer.width !== regionPixelWidth || app.renderer.height !== regionPixelHeight) {
            app.renderer.resize(regionPixelWidth, regionPixelHeight);
            canvasEl.width = app.renderer.width;
            canvasEl.height = app.renderer.height;
        }

        if (sprite) {
            app.stage.removeChild(sprite);
            sprite.destroy({ texture: true, baseTexture: true, children: true });
            sprite = null;
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imageData.width;
        tempCanvas.height = imageData.height;
        tempCanvas.getContext('2d').putImageData(imageData, 0, 0);

        const texture = PIXI.Texture.from(tempCanvas);
        sprite = new PIXI.Sprite(texture);

        // Update filter parameters from current options
        filterDefinition.params.forEach(param => {
            let value = (options && options[param.id] !== undefined)
                ? options[param.id]
                : param.defaultValue; // Fallback to param definition's default

            // Ensure correct type for PixiJS filter properties
            if (param.type === 'range' || param.type === 'number') {
                value = parseFloat(value);
            } else if (param.id === 'verticalLine') {
                value = (value === true || value === 'true'); // Handle boolean from stored param or select string
            }
            filter[param.id] = value;
        });
        // If you add 'time' for animation, you'd update it here, perhaps based on a ticker
        // if (options.time !== undefined) filter.time = parseFloat(options.time);
        // else filter.time += 0.1; // Example simple animation - requires ticker

        sprite.filters = [filter];
        app.stage.addChild(sprite);
        filterState.sprite = sprite;

        // For time-based animation (if 'time' param is actively animated):
        // if (!ticker) {
        //     filterState.ticker = app.ticker.add(() => {
        //         filter.time += app.ticker.elapsedMS / 1000; // Or some other update logic
        //     });
        // }
        return null;
    },
    destroy: (outputElement, filterState) => {
        if (filterState) {
            // if (filterState.ticker) {
            //     filterState.app.ticker.remove(filterState.ticker);
            //     filterState.ticker = null;
            // }
            if (filterState.app) {
                filterState.app.destroy(true, { children: true, texture: true, baseTexture: true });
            }
        }
        if (outputElement) {
            outputElement.innerHTML = '';
        }
    }
};

export default filterDefinition;