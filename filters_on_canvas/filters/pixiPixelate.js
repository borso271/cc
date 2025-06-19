// filters/pixiPixelate.js

// NO MORE MODULE-LEVEL STATE VARIABLES

const filterDefinition = {
    id: 'pixiPixelate',
    name: 'PixiJS Pixelate',
    params: [
        {
            id: 'sizeX',
            name: 'Pixel Size X',
            type: 'number', // Using number input for more control than range here
            defaultValue: 10,
            min: 1,
            max: 100, // Adjust as needed
            step: 1
        },
        {
            id: 'sizeY',
            name: 'Pixel Size Y',
            type: 'number',
            defaultValue: 10,
            min: 1,
            max: 100,
            step: 1
        }
    ],
    init: (outputElement, regionPixelWidth, regionPixelHeight, options = {}) => {
        if (typeof PIXI === 'undefined' || typeof PIXI.filters === 'undefined' || typeof PIXI.filters.PixelateFilter === 'undefined') {
            console.error("PixiJS or PixiJS PixelateFilter not loaded!");
            if(outputElement) outputElement.innerHTML = "<pre>Error: PixiJS PixelateFilter not found.</pre>";
            return null;
        }

        if (!outputElement) {
            console.error("PixiPixelate.init: outputElement is missing!");
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
                backgroundColor: 0x000000, // Black background, or transparent if preferred
                // backgroundAlpha: 0,    // For transparent background
                autoDensity: true,
            });

            // Get initial pixel sizes from options or param defaults
            const sizeXParam = filterDefinition.params.find(p => p.id === 'sizeX');
            const initialSizeX = (options && options.sizeX !== undefined && !isNaN(parseFloat(options.sizeX)))
                ? parseFloat(options.sizeX)
                : (sizeXParam ? parseFloat(sizeXParam.defaultValue) : 10);

            const sizeYParam = filterDefinition.params.find(p => p.id === 'sizeY');
            const initialSizeY = (options && options.sizeY !== undefined && !isNaN(parseFloat(options.sizeY)))
                ? parseFloat(options.sizeY)
                : (sizeYParam ? parseFloat(sizeYParam.defaultValue) : 10);

            // PixelateFilter can take a single number (for square) or an array/Point [x, y]
            filterInstance = new PIXI.filters.PixelateFilter([initialSizeX, initialSizeY]);

            return {
                app: appInstance,
                canvasEl: canvasEl,
                sprite: null,
                filter: filterInstance
            };
        } catch (error) {
            console.error("Error initializing PixiJS for Pixelate:", error);
            if(outputElement) outputElement.innerHTML = `<pre>PixiJS Init Error: ${error.message}</pre>`;
            if (appInstance) appInstance.destroy(true, {children:true, texture:true, baseTexture:true});
            return null;
        }
    },
    apply: (imageData, outputElement, regionPixelWidth, regionPixelHeight, options = {}, filterState) => {
        if (!filterState || !filterState.app || !filterState.filter || !filterState.canvasEl) {
            console.error("PixiPixelate.apply: Filter not properly initialized or filterState is missing.");
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

        // Update filter parameters
        const sizeXParam = filterDefinition.params.find(p => p.id === 'sizeX');
        const effectiveSizeX = (options && options.sizeX !== undefined && !isNaN(parseFloat(options.sizeX)))
            ? parseFloat(options.sizeX)
            : (sizeXParam ? parseFloat(sizeXParam.defaultValue) : 10);

        const sizeYParam = filterDefinition.params.find(p => p.id === 'sizeY');
        const effectiveSizeY = (options && options.sizeY !== undefined && !isNaN(parseFloat(options.sizeY)))
            ? parseFloat(options.sizeY)
            : (sizeYParam ? parseFloat(sizeYParam.defaultValue) : 10);

        // PixelateFilter's 'size' property can be set with an array [x, y] or a PIXI.Point
        // It also has individual sizeX and sizeY properties
        filter.size = [effectiveSizeX, effectiveSizeY];
        // Or, if you prefer:
        // filter.sizeX = effectiveSizeX;
        // filter.sizeY = effectiveSizeY;

        sprite.filters = [filter];
        app.stage.addChild(sprite);
        filterState.sprite = sprite;

        return null;
    },
    destroy: (outputElement, filterState) => {
        if (filterState && filterState.app) {
            filterState.app.destroy(true, { children: true, texture: true, baseTexture: true });
        }
        if (outputElement) {
            outputElement.innerHTML = '';
        }
    }
};

export default filterDefinition;