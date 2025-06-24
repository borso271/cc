// filters/pixiOldFilm.js

const filterDefinition = {
    id: 'pixiOldFilm',
    name: 'PixiJS Old Film',
    params: [
        { id: 'sepia', name: 'Sepia Amount', type: 'range', defaultValue: 0.3, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'noise', name: 'Noise Amount', type: 'range', defaultValue: 0.3, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'scratchDensity', name: 'Scratch Density', type: 'range', defaultValue: 0.3, min: 0.0, max: 1.0, step: 0.01 },
        { id: 'vignetting', name: 'Vignette Radius', type: 'range', defaultValue: 0.3, min: 0.0, max: 1.0, step: 0.01 }
        // Other potential params: noiseSize, scratch, scratchWidth, vignettingAlpha, vignettingBlur
    ],
    init: (outputElement, regionPixelWidth, regionPixelHeight, options = {}) => {
        if (typeof PIXI === 'undefined' || typeof PIXI.filters === 'undefined' || typeof PIXI.filters.OldFilmFilter === 'undefined') {
            console.error("PixiJS or PixiJS OldFilmFilter not loaded!");
            if(outputElement) outputElement.innerHTML = "<pre>Error: PixiJS OldFilmFilter not found.</pre>";
            return null;
        }

        if (!outputElement) {
            console.error("PixiOldFilm.init: outputElement is missing!");
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
                backgroundColor: 0x000000, // Black background can work well
                autoDensity: true,
            });

            // OldFilmFilter constructor can take an options object or individual params.
            // Let's build an options object for clarity.
            const filterOptions = {};
            filterDefinition.params.forEach(param => {
                let value = (options && options[param.id] !== undefined)
                    ? options[param.id]
                    : param.defaultValue;
                // All our current params are numbers
                filterOptions[param.id] = parseFloat(value);
            });
            // Add any other non-UI defaults if needed, e.g., filterOptions.seed = Math.random();

            filterInstance = new PIXI.filters.OldFilmFilter(filterOptions);

            // Some filters with animation (like OldFilmFilter often has internal time/seed updates)
            // might benefit from being on the main PIXI ticker if they don't update themselves.
            // For OldFilmFilter, it often updates its 'seed' or an internal timer.
            // If it doesn't animate by default, we might need to add it to the app ticker.
            // For now, let's assume it handles its own basic animation if any.
            // If flicker/scratch animation is desired and not automatic, add to ticker:
            // const tickerCallback = () => { filterInstance.seed = Math.random(); };
            // appInstance.ticker.add(tickerCallback);

            return {
                app: appInstance,
                canvasEl: canvasEl,
                sprite: null,
                filter: filterInstance
                // tickerCallback: tickerCallback // Store if added to ticker
            };
        } catch (error) {
            console.error("Error initializing PixiJS for OldFilm:", error);
            if(outputElement) outputElement.innerHTML = `<pre>PixiJS Init Error: ${error.message}</pre>`;
            if (appInstance) appInstance.destroy(true, {children:true, texture:true, baseTexture:true});
            return null;
        }
    },
    apply: (imageData, outputElement, regionPixelWidth, regionPixelHeight, options = {}, filterState) => {
        if (!filterState || !filterState.app || !filterState.filter || !filterState.canvasEl) {
            console.error("PixiOldFilm.apply: Filter not properly initialized or filterState is missing.");
            return;
        }

        const { app, filter, canvasEl } = filterState;
        let { sprite } = filterState;

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
                : param.defaultValue;
            filter[param.id] = parseFloat(value); // All current params are numbers
        });
        // filter.seed = Math.random(); // If you want seed to change on every frame for more flicker

        sprite.filters = [filter];
        app.stage.addChild(sprite);
        filterState.sprite = sprite;

        return null;
    },
    destroy: (outputElement, filterState) => {
        if (filterState) {
            // if (filterState.tickerCallback && filterState.app) {
            //     filterState.app.ticker.remove(filterState.tickerCallback);
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