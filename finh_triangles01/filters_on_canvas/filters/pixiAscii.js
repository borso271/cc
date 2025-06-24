// filters/pixiAscii.js

// NO MORE MODULE-LEVEL STATE VARIABLES for pixiApp, pixiCanvasElement, etc.

const filterDefinition = {
    id: 'pixiAscii',
    name: 'PixiJS ASCII',
    params: [
        { id: 'fontSize', name: 'Font Size', type: 'number', defaultValue: 8, min: 2, max: 20, step: 1 }
    ],
    // init: called when the filter is selected for a specific region
    // It should create and RETURN the state for THIS INSTANCE.
    init: (outputElement, regionPixelWidth, regionPixelHeight, options = {}) => {
        if (typeof PIXI === 'undefined' || typeof PIXI.filters === 'undefined') {
            console.error("PixiJS or PixiJS Filters not loaded!");
            if(outputElement) outputElement.innerHTML = "<pre>Error: PixiJS libraries not found.</pre>";
            return null; // Indicate failure by returning null
        }

        if (!outputElement) {
            console.error("PixiAscii.init: outputElement is missing!");
            return null;
        }
        outputElement.innerHTML = ''; // Clear the container for the new Pixi canvas
        outputElement.style.backgroundColor = 'transparent'; // Should be handled by CSS mostly

        const canvasEl = document.createElement('canvas');
        // Crucial for PixiJS: set pointer events on the canvas it renders to if needed,
        // but generally the outputElement (clipper div) handles interaction.
        // The canvas an filter renders to within the outputElement should not block events
        // on the outputElement if that's where drag/resize is handled.
        // canvasEl.style.pointerEvents = 'none'; // Already done in your main script's logic for outputElement if it's a clipper
        outputElement.appendChild(canvasEl);

        let appInstance = null;
        let filterInstance = null;

        try {
            appInstance = new PIXI.Application({
                view: canvasEl,
                width: regionPixelWidth,
                height: regionPixelHeight,
                // backgroundColor: 0xffffff,
                antialias: true,
                autoDensity: true,
            });

            const fontSizeParam = filterDefinition.params.find(p => p.id === 'fontSize');
            const effectiveFontSize = (options && options.fontSize !== undefined)
                ? parseFloat(options.fontSize) // Ensure it's a number
                : (fontSizeParam ? parseFloat(fontSizeParam.defaultValue) : 8);

            filterInstance = new PIXI.filters.AsciiFilter(effectiveFontSize);

            // Return the state object for this specific filter instance
            return {
                app: appInstance,
                canvasEl: canvasEl, // The canvas element PIXI is using
                sprite: null,       // Will be created in apply
                filter: filterInstance
            };
        } catch (error) {
            console.error("Error initializing PixiJS for ASCII:", error);
            if(outputElement) outputElement.innerHTML = `<pre>PixiJS Init Error: ${error.message}</pre>`;
            if (appInstance) appInstance.destroy(true, {children:true, texture: true, baseTexture: true});
            // No need to remove canvasEl from outputElement if app.destroy(true) handles its view
            return null; // Indicate failure
        }
    },
    // apply: called on mouse move or param change for a specific region
    // It receives its state via the filterState argument.
    apply: (imageData, outputElement, regionPixelWidth, regionPixelHeight, options = {}, filterState) => {
        if (!filterState || !filterState.app || !filterState.filter || !filterState.canvasEl) {
            console.error("PixiAscii.apply: Filter not properly initialized or filterState is missing essential parts. Attempting re-init via main script might be needed if this persists.");
            // It's generally not the filter's job to re-init itself here if state is missing.
            // The main script should ensure init was called and state was stored.
            return; // Do nothing if not initialized
        }

        const { app, filter, canvasEl } = filterState; // Destructure from passed state
        let { sprite } = filterState; // Sprite can change

        // Resize renderer and canvas element if needed
        if (app.renderer.width !== regionPixelWidth || app.renderer.height !== regionPixelHeight) {
            app.renderer.resize(regionPixelWidth, regionPixelHeight);
            canvasEl.width = app.renderer.width;   // Ensure canvas element matches renderer
            canvasEl.height = app.renderer.height;
        }

        // Clear previous sprite from the stage
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
        sprite = new PIXI.Sprite(texture); // Create new sprite

        const fontSizeParam = filterDefinition.params.find(p => p.id === 'fontSize');
        const effectiveFontSize = (options && options.fontSize !== undefined)
            ? parseFloat(options.fontSize)
            : (fontSizeParam ? parseFloat(fontSizeParam.defaultValue) : 8);

        filter.size = effectiveFontSize; // Update filter parameter
        sprite.filters = [filter];

        app.stage.addChild(sprite);
        filterState.sprite = sprite; // Update the sprite in the state object for next time

        // PixiJS v7+ often auto-renders on changes. If not, uncomment:
        // app.render();
        
        return null; // Indicates it handled output, no explicit return needed for main script
    },
    // destroy: called when filter is deselected or region is deleted
    // It receives its state via the filterState argument.
    destroy: (outputElement, filterState) => { // outputElement is the container div
        if (filterState && filterState.app) {
            filterState.app.destroy(true, { children: true, texture: true, baseTexture: true });
            // filterState.app will be null after this.
            // The canvasEl (filterState.canvasEl) inside outputElement should be removed by app.destroy(true)
        }
        // Just in case, ensure the outputElement is cleared of any PIXI canvas
        if (outputElement) {
            outputElement.innerHTML = '';
        }
        // No need to nullify module-level vars as there are none for instance state
    }
};

// Export the defined object as the default export
export default filterDefinition;
// // filters/pixiAscii.js

// let pixiApp = null;
// let pixiCanvasElement = null;
// let currentSprite = null;
// let currentAsciiFilter = null;

// // 1. Define the filter object using a const
// const filterDefinition = {
//     id: 'pixiAscii',
//     name: 'PixiJS ASCII',
//     params: [
//         { id: 'fontSize', name: 'Font Size', type: 'number', defaultValue: 8, min: 2, max: 20, step: 1 }
//     ],
//     // init: called when the filter is selected
//     init: (outputElement, regionPixelWidth, regionPixelHeight, options = {}) => {
//         if (typeof PIXI === 'undefined' || typeof PIXI.filters === 'undefined') {
//             console.error("PixiJS or PixiJS Filters not loaded!");
//             outputElement.innerHTML = "<pre>Error: PixiJS libraries not found.</pre>";
//             return false; // Indicate failure
//         }
//         if (pixiApp) {
//             console.warn("PixiJS app already exists in pixiAscii. Destroying old one.");
//             // Ensure full cleanup if re-initializing
//             if (typeof filterDefinition.destroy === 'function') { // Use filterDefinition here
//                 filterDefinition.destroy();
//             } else { // Fallback if destroy isn't on the definition somehow
//                 pixiApp.destroy(true, { children: true, texture: true, baseTexture: true });
//                 pixiApp = null;
//                 if (pixiCanvasElement && pixiCanvasElement.parentNode) {
//                     pixiCanvasElement.parentNode.removeChild(pixiCanvasElement);
//                 }
//                 pixiCanvasElement = null;
//                 currentSprite = null;
//                 currentAsciiFilter = null;
//             }
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
//                 antialias: true,
//                 autoDensity: true,
//             });
//             // Ensure options.fontSize is valid, otherwise use param default
//             const fontSizeParam = filterDefinition.params.find(p => p.id === 'fontSize');
//             const effectiveFontSize = (options && options.fontSize !== undefined) ? options.fontSize : (fontSizeParam ? fontSizeParam.defaultValue : 8);
//             currentAsciiFilter = new PIXI.filters.AsciiFilter(effectiveFontSize);
//             return true;
//         } catch (error) {
//             console.error("Error initializing PixiJS for ASCII:", error);
//             outputElement.innerHTML = `<pre>PixiJS Init Error: ${error.message}</pre>`;
//             if (pixiApp) pixiApp.destroy(true);
//             if (pixiCanvasElement && pixiCanvasElement.parentNode) pixiCanvasElement.parentNode.removeChild(pixiCanvasElement);
//             pixiApp = null;
//             pixiCanvasElement = null;
//             return false;
//         }
//     },
//     // apply: called on mouse move or param change
//     apply: (imageData, outputElement, regionPixelWidth, regionPixelHeight, options = {}) => {
//         if (!pixiApp || !currentAsciiFilter) {
//             // Fallback: Attempt to re-initialize. Use the filterDefinition constant.
//             // The main script should ideally handle init, making this a safety net.
//             console.warn("PixiAscii: PixiApp not initialized in apply. Attempting re-init.");
//             if (!filterDefinition.init(outputElement, regionPixelWidth, regionPixelHeight, options)) { // Use filterDefinition
//                  console.error("PixiAscii: Cannot apply, PixiApp not initialized and re-init failed.");
//                  return null;
//             }
//         }

//         // Resize renderer if needed
//         if (pixiApp.renderer.width !== regionPixelWidth || pixiApp.renderer.height !== regionPixelHeight) {
//             pixiApp.renderer.resize(regionPixelWidth, regionPixelHeight);
//         }

//         // Clear previous sprite
//         if (currentSprite) {
//             pixiApp.stage.removeChild(currentSprite);
//             currentSprite.destroy({ texture: true, baseTexture: true, children: true }); // Ensure full sprite cleanup
//             currentSprite = null;
//         }

//         const tempCanvas = document.createElement('canvas');
//         tempCanvas.width = imageData.width;
//         tempCanvas.height = imageData.height;
//         tempCanvas.getContext('2d').putImageData(imageData, 0, 0);

//         const texture = PIXI.Texture.from(tempCanvas);
//         currentSprite = new PIXI.Sprite(texture);

//         // Ensure options.fontSize is valid, otherwise use param default
//         const fontSizeParam = filterDefinition.params.find(p => p.id === 'fontSize');
//         const effectiveFontSize = (options && options.fontSize !== undefined) ? options.fontSize : (fontSizeParam ? fontSizeParam.defaultValue : 8);
//         currentAsciiFilter.size = effectiveFontSize;
//         currentSprite.filters = [currentAsciiFilter];

//         pixiApp.stage.addChild(currentSprite);
        
//         return null;
//     },
//     // destroy: called when filter is deselected or mouse leaves
//     destroy: () => {
//         if (pixiApp) {
//             // Ensure all children are removed before destroying app, can help prevent leaks
//             if(pixiApp.stage && pixiApp.stage.children.length > 0) {
//                  pixiApp.stage.removeChildren(0, pixiApp.stage.children.length).forEach(child => child.destroy({children: true, texture: true, baseTexture: true}));
//             }
//             pixiApp.destroy(true, { children: true, texture: true, baseTexture: true }); // Destroy view, children, textures
//             pixiApp = null;
//         }
//         // The view (pixiCanvasElement) should be removed by pixiApp.destroy(true)
//         // If it's still somehow attached, this is a fallback:
//         if (pixiCanvasElement && pixiCanvasElement.parentNode) {
//             pixiCanvasElement.parentNode.removeChild(pixiCanvasElement);
//         }
//         pixiCanvasElement = null;
//         currentSprite = null;
//         currentAsciiFilter = null;
//     }
// };

// // 2. Export the defined object as the default export
// export default filterDefinition;

