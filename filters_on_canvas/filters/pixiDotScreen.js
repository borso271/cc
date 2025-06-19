// filters/pixiDotScreen.js

// NO MORE MODULE-LEVEL STATE VARIABLES for pixiApp, pixiCanvasElement, etc.

const filterDefinition = {
    id: 'pixiDotScreen',
    name: 'PixiJS Dot Screen',
    params: [
        { id: 'scale', name: 'Scale', type: 'range', defaultValue: 1, min: 0.1, max: 5, step: 0.1 },
        { id: 'angle', name: 'Angle', type: 'range', defaultValue: 5, min: 0, max: 360, step: 1 },
        { id: 'grayscale', name: 'Grayscale', type: 'select', defaultValue: 'true', options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] }
    ],
    init: (outputElement, regionPixelWidth, regionPixelHeight, options = {}) => {
        if (typeof PIXI === 'undefined' || typeof PIXI.filters === 'undefined' || typeof PIXI.filters.DotFilter === 'undefined') {
            console.error("PixiJS or PixiJS DotFilter not loaded!");
            if(outputElement) outputElement.innerHTML = "<pre>Error: PixiJS DotFilter not found.</pre>";
            return null; // Indicate failure
        }

        if (!outputElement) {
            console.error("PixiDotScreen.init: outputElement is missing!");
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
                backgroundColor: 0xffffff,
                autoDensity: true,
            });

            filterInstance = new PIXI.filters.DotFilter();
            // Set initial parameters from options (which should include defaults from params array)
            const scaleParam = filterDefinition.params.find(p => p.id === 'scale');
            filterInstance.scale = (options.scale !== undefined && !isNaN(parseFloat(options.scale)))
                ? parseFloat(options.scale)
                : (scaleParam ? parseFloat(scaleParam.defaultValue) : 1);

            const angleParam = filterDefinition.params.find(p => p.id === 'angle');
            filterInstance.angle = (options.angle !== undefined && !isNaN(parseFloat(options.angle)))
                ? parseFloat(options.angle)
                : (angleParam ? parseFloat(angleParam.defaultValue) : 5);

            const grayscaleParam = filterDefinition.params.find(p => p.id === 'grayscale');
            // options.grayscale from select will be string 'true' or 'false'
            filterInstance.grayscale = (options.grayscale !== undefined)
                ? (options.grayscale === 'true' || options.grayscale === true) // Handle string or boolean
                : (grayscaleParam ? (grayscaleParam.defaultValue === 'true' || grayscaleParam.defaultValue === true) : true);


            return {
                app: appInstance,
                canvasEl: canvasEl,
                sprite: null,
                filter: filterInstance
            };
        } catch (error) {
            console.error("Error initializing PixiJS for DotScreen:", error);
            if(outputElement) outputElement.innerHTML = `<pre>PixiJS Init Error: ${error.message}</pre>`;
            if (appInstance) appInstance.destroy(true, {children:true, texture:true, baseTexture:true});
            return null;
        }
    },
    apply: (imageData, outputElement, regionPixelWidth, regionPixelHeight, options = {}, filterState) => {
        if (!filterState || !filterState.app || !filterState.filter || !filterState.canvasEl) {
            console.error("PixiDotScreen.apply: Filter not properly initialized or filterState is missing.");
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

        // Update filter parameters based on current options
        const scaleParam = filterDefinition.params.find(p => p.id === 'scale');
        filter.scale = (options.scale !== undefined && !isNaN(parseFloat(options.scale)))
            ? parseFloat(options.scale)
            : (scaleParam ? parseFloat(scaleParam.defaultValue) : 1);

        const angleParam = filterDefinition.params.find(p => p.id === 'angle');
        filter.angle = (options.angle !== undefined && !isNaN(parseFloat(options.angle)))
            ? parseFloat(options.angle)
            : (angleParam ? parseFloat(angleParam.defaultValue) : 5);

        const grayscaleParam = filterDefinition.params.find(p => p.id === 'grayscale');
        // options.grayscale from select will be boolean true/false if JS logic is correct
        filter.grayscale = (options.grayscale !== undefined)
            ? (options.grayscale === true) // Explicitly check for boolean true
            : (grayscaleParam ? (grayscaleParam.defaultValue === 'true' || grayscaleParam.defaultValue === true) : true);


        sprite.filters = [filter];
        app.stage.addChild(sprite);
        filterState.sprite = sprite; // Update state

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
// // filters/pixiDotScreen.js

// let pixiApp = null;
// let pixiCanvasElement = null;
// let currentSprite = null;
// let currentDotFilter = null;

// // Define the filter object first
// const filterDefinition = {
//     id: 'pixiDotScreen',
//     name: 'PixiJS Dot Screen',
//     params: [
//         { id: 'scale', name: 'Scale', type: 'range', defaultValue: 1, min: 0.1, max: 5, step: 0.1 },
//         { id: 'angle', name: 'Angle', type: 'range', defaultValue: 5, min: 0, max: 360, step: 1 },
//         { id: 'grayscale', name: 'Grayscale', type: 'select', defaultValue: true, options: [{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }] } // Ensure string values for select
//     ],
//     init: (outputElement, regionPixelWidth, regionPixelHeight, options = {}) => {
//         if (typeof PIXI === 'undefined' || typeof PIXI.filters === 'undefined' || typeof PIXI.filters.DotFilter === 'undefined') {
//             console.error("PixiJS or PixiJS DotFilter not loaded!");
//             outputElement.innerHTML = "<pre>Error: PixiJS DotFilter not found.</pre>";
//             return false;
//         }
//         if (pixiApp) {
//             console.warn("PixiJS app already exists in pixiDotScreen. Destroying old one.");
//             pixiApp.destroy(true, { children: true, texture: true, baseTexture: true });
//             pixiApp = null;
//         }

//         outputElement.innerHTML = '';
//         outputElement.style.backgroundColor = 'transparent';
//         pixiCanvasElement = document.createElement('canvas');
//         outputElement.appendChild(pixiCanvasElement);

//         try {
//             pixiApp = new PIXI.Application({
//                 view: pixiCanvasElement,
//                 width: regionPixelWidth,
//                 height: regionPixelHeight,
//                 backgroundColor: 0xffffff,
//                 autoDensity: true,
//             });
//             currentDotFilter = new PIXI.filters.DotFilter();
//             return true;
//         } catch (error) {
//             console.error("Error initializing PixiJS for DotScreen:", error);
//             outputElement.innerHTML = `<pre>PixiJS Init Error: ${error.message}</pre>`;
//             if (pixiApp) pixiApp.destroy(true);
//             if (pixiCanvasElement && pixiCanvasElement.parentNode) pixiCanvasElement.parentNode.removeChild(pixiCanvasElement);
//             pixiApp = null; pixiCanvasElement = null;
//             return false;
//         }
//     },
//     apply: (imageData, outputElement, regionPixelWidth, regionPixelHeight, options = {}) => {
//         if (!pixiApp || !currentDotFilter) {
//             // Use filterDefinition here for the self-reference
//             if (!filterDefinition.init(outputElement, regionPixelWidth, regionPixelHeight, options)) {
//                 console.error("PixiDotScreen: Cannot apply, PixiApp not initialized and re-init failed.");
//                 return null;
//             }
//         }
//         if (pixiApp.renderer.width !== regionPixelWidth || pixiApp.renderer.height !== regionPixelHeight) {
//             pixiApp.renderer.resize(regionPixelWidth, regionPixelHeight);
//         }

//         if (currentSprite) {
//             pixiApp.stage.removeChild(currentSprite);
//             currentSprite.destroy({ texture: true, baseTexture: true });
//             currentSprite = null;
//         }

//         const tempCanvas = document.createElement('canvas');
//         tempCanvas.width = imageData.width;
//         tempCanvas.height = imageData.height;
//         tempCanvas.getContext('2d').putImageData(imageData, 0, 0);

//         const texture = PIXI.Texture.from(tempCanvas);
//         currentSprite = new PIXI.Sprite(texture);

//         currentDotFilter.scale = (options.scale !== undefined && !isNaN(parseFloat(options.scale))) ? parseFloat(options.scale) : 1;
//         currentDotFilter.angle = (options.angle !== undefined && !isNaN(parseFloat(options.angle))) ? parseFloat(options.angle) : 5;
//         // options.grayscale will be a boolean now if script.js param handling is correct
//         currentDotFilter.grayscale = (options.grayscale === true); // Explicitly check for boolean true

//         currentSprite.filters = [currentDotFilter];
//         pixiApp.stage.addChild(currentSprite);
//         return null;
//     },
//     destroy: () => {
//         if (pixiApp) {
//             pixiApp.destroy(true, { children: true, texture: true, baseTexture: true });
//             pixiApp = null;
//         }
//         if (pixiCanvasElement && pixiCanvasElement.parentNode) {
//             pixiCanvasElement.parentNode.removeChild(pixiCanvasElement);
//         }
//         pixiCanvasElement = null;
//         currentSprite = null;
//         currentDotFilter = null;
//     }
// };

// // Now export the defined object
// export default filterDefinition;