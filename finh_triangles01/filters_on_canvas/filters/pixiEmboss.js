// filters/pixiEmboss.js

// NO MORE MODULE-LEVEL STATE VARIABLES for pixiApp, pixiCanvasElement, etc.

const filterDefinition = {
    id: 'pixiEmboss',
    name: 'PixiJS Emboss',
    params: [
        {
            id: 'strength',
            name: 'Strength',
            type: 'range',
            defaultValue: 5,
            min: 0.1,
            max: 15,
            step: 0.1
        }
    ],
    init: (outputElement, regionPixelWidth, regionPixelHeight, options = {}) => {
        if (typeof PIXI === 'undefined' || typeof PIXI.filters === 'undefined' || typeof PIXI.filters.EmbossFilter === 'undefined') {
            console.error("PixiJS or PixiJS EmbossFilter not loaded!");
            if(outputElement) outputElement.innerHTML = "<pre>Error: PixiJS EmbossFilter not found.</pre>";
            return null; // Indicate failure
        }

        if (!outputElement) {
            console.error("PixiEmboss.init: outputElement is missing!");
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
                backgroundColor: 0x808080, // Neutral gray might be good for emboss
                autoDensity: true,
            });

            const strengthParam = filterDefinition.params.find(p => p.id === 'strength');
            const initialStrength = (options && options.strength !== undefined && !isNaN(parseFloat(options.strength)))
                ? parseFloat(options.strength)
                : (strengthParam ? parseFloat(strengthParam.defaultValue) : 5);

            filterInstance = new PIXI.filters.EmbossFilter(initialStrength);

            return {
                app: appInstance,
                canvasEl: canvasEl,
                sprite: null,
                filter: filterInstance
            };
        } catch (error) {
            console.error("Error initializing PixiJS for Emboss:", error);
            if(outputElement) outputElement.innerHTML = `<pre>PixiJS Init Error: ${error.message}</pre>`;
            if (appInstance) appInstance.destroy(true, {children:true, texture:true, baseTexture:true});
            return null;
        }
    },
    apply: (imageData, outputElement, regionPixelWidth, regionPixelHeight, options = {}, filterState) => {
        if (!filterState || !filterState.app || !filterState.filter || !filterState.canvasEl) {
            console.error("PixiEmboss.apply: Filter not properly initialized or filterState is missing.");
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

        const strengthParam = filterDefinition.params.find(p => p.id === 'strength');
        const effectiveStrength = (options && options.strength !== undefined && !isNaN(parseFloat(options.strength)))
            ? parseFloat(options.strength)
            : (strengthParam ? parseFloat(strengthParam.defaultValue) : 5);

        filter.strength = effectiveStrength; // Update the existing filter instance's strength
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
// // filters/pixiEmboss.js

// let pixiApp = null;
// let pixiCanvasElement = null;
// let currentSprite = null;
// let currentEmbossFilter = null;

// const filterDefinition = {
//     id: 'pixiEmboss',
//     name: 'PixiJS Emboss',
//     params: [
//         {
//             id: 'strength',
//             name: 'Strength',
//             type: 'range', // Or 'number'
//             defaultValue: 5, // Default from PixiJS documentation
//             min: 0.1,
//             max: 15, // You can adjust this max based on visual preference
//             step: 0.1
//         }
//     ],
//     init: (outputElement, regionPixelWidth, regionPixelHeight, options = {}) => {
//         if (typeof PIXI === 'undefined' || typeof PIXI.filters === 'undefined' || typeof PIXI.filters.EmbossFilter === 'undefined') {
//             console.error("PixiJS or PixiJS EmbossFilter not loaded!");
//             outputElement.innerHTML = "<pre>Error: PixiJS EmbossFilter not found.</pre>";
//             return false;
//         }
//         if (pixiApp) {
//             console.warn("PixiJS app already exists in pixiEmboss. Destroying old one.");
//             filterDefinition.destroy(); // Call self-destroy
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
//                 backgroundColor: 0x808080, // Neutral gray might be good for emboss, or transparent
//                 // backgroundAlpha: 0, // if you want it transparent
//                 autoDensity: true,
//             });

//             // Get initial strength from options or param default
//             const strengthParam = filterDefinition.params.find(p => p.id === 'strength');
//             const initialStrength = (options && options.strength !== undefined)
//                 ? parseFloat(options.strength)
//                 : (strengthParam ? parseFloat(strengthParam.defaultValue) : 5);

//             currentEmbossFilter = new PIXI.filters.EmbossFilter(initialStrength);
//             return true;
//         } catch (error) {
//             console.error("Error initializing PixiJS for Emboss:", error);
//             outputElement.innerHTML = `<pre>PixiJS Init Error: ${error.message}</pre>`;
//             if (pixiApp) pixiApp.destroy(true);
//             if (pixiCanvasElement && pixiCanvasElement.parentNode) pixiCanvasElement.parentNode.removeChild(pixiCanvasElement);
//             pixiApp = null; pixiCanvasElement = null;
//             return false;
//         }
//     },
//     apply: (imageData, outputElement, regionPixelWidth, regionPixelHeight, options = {}) => {
//         if (!pixiApp || !currentEmbossFilter) {
//             console.warn("PixiEmboss: PixiApp not initialized in apply. Attempting re-init.");
//             if (!filterDefinition.init(outputElement, regionPixelWidth, regionPixelHeight, options)) {
//                 console.error("PixiEmboss: Cannot apply, PixiApp not initialized and re-init failed.");
//                 return null;
//             }
//         }

//         if (pixiApp.renderer.width !== regionPixelWidth || pixiApp.renderer.height !== regionPixelHeight) {
//             pixiApp.renderer.resize(regionPixelWidth, regionPixelHeight);
//         }

//         if (currentSprite) {
//             pixiApp.stage.removeChild(currentSprite);
//             currentSprite.destroy({ texture: true, baseTexture: true, children: true });
//             currentSprite = null;
//         }

//         const tempCanvas = document.createElement('canvas');
//         tempCanvas.width = imageData.width;
//         tempCanvas.height = imageData.height;
//         tempCanvas.getContext('2d').putImageData(imageData, 0, 0);

//         const texture = PIXI.Texture.from(tempCanvas);
//         currentSprite = new PIXI.Sprite(texture);

//         // Get strength from options or param default for apply
//         const strengthParam = filterDefinition.params.find(p => p.id === 'strength');
//         const effectiveStrength = (options && options.strength !== undefined)
//             ? parseFloat(options.strength)
//             : (strengthParam ? parseFloat(strengthParam.defaultValue) : 5);

//         currentEmbossFilter.strength = effectiveStrength;
//         currentSprite.filters = [currentEmbossFilter];

//         pixiApp.stage.addChild(currentSprite);
//         return null;
//     },
//     destroy: () => {
//         if (pixiApp) {
//             if(pixiApp.stage && pixiApp.stage.children.length > 0) {
//                  pixiApp.stage.removeChildren(0, pixiApp.stage.children.length).forEach(child => child.destroy({children: true, texture: true, baseTexture: true}));
//             }
//             pixiApp.destroy(true, { children: true, texture: true, baseTexture: true });
//             pixiApp = null;
//         }
//         if (pixiCanvasElement && pixiCanvasElement.parentNode) {
//             pixiCanvasElement.parentNode.removeChild(pixiCanvasElement);
//         }
//         pixiCanvasElement = null;
//         currentSprite = null;
//         currentEmbossFilter = null;
//     }
// };

// export default filterDefinition;