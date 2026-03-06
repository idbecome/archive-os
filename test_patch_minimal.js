import canvasModule from 'canvas';
const OriginalImageData = canvasModule.ImageData;

console.log("Testing with 'display-p3':");
try {
    const data = new Uint8ClampedArray(400);
    new OriginalImageData(data, 10, 10, { colorSpace: 'display-p3' });
    console.log("SUCCESS: display-p3 supported.");
} catch (e) {
    console.log("FAILURE: display-p3 NOT supported: " + e.message);
}

console.log("Testing with 'srgb':");
try {
    const data = new Uint8ClampedArray(400);
    new OriginalImageData(data, 10, 10, { colorSpace: 'srgb' });
    console.log("SUCCESS: srgb supported.");
} catch (e) {
    console.log("FAILURE: srgb NOT supported: " + e.message);
}

process.exit(0);
