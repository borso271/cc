// filters/invertColors.js

export default {
    id: 'invertColors',
    name: 'Invert Colors',
    // No specific parameters for this simple filter yet
    // params: [
    //   { id: 'intensity', name: 'Intensity', type: 'range', defaultValue: 1, min: 0, max: 1, step: 0.1 }
    // ],
    apply: (imageData, outputElement, rW, rH, options = {}) => {
        // const intensity = options.intensity !== undefined ? options.intensity : 1; // Example of using a param
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];     // red
            data[i + 1] = 255 - data[i + 1]; // green
            data[i + 2] = 255 - data[i + 2]; // blue
            // Alpha (data[i+3]) is untouched
        }
        return imageData; // Returns ImageData
    }
};