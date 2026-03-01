import canvasModule from 'canvas';

// MONKEY PATCH for node-canvas compatibility with PDF.js 5.x
// Fixes "Error: node-canvas only supports DeviceRGB color space"
// This must be imported BEFORE anything that uses pdfjs-dist for rendering

const OriginalImageData = canvasModule.ImageData;
if (OriginalImageData) {
    const PatchedImageData = function (data, width, height, settings) {
        if (height === undefined) return new OriginalImageData(data, width);
        // Ignore settings (the 4th argument which contains colorSpace)
        return new OriginalImageData(data, width, height);
    };

    // Copy prototype if needed (unlikely for node-canvas but safe)
    PatchedImageData.prototype = OriginalImageData.prototype;

    canvasModule.ImageData = PatchedImageData;
    global.ImageData = PatchedImageData;

    // Also patch CanvasRenderingContext2D if needed for extra safety
    const ctxProto = canvasModule.CanvasRenderingContext2D.prototype;
    const originalCreateImageData = ctxProto.createImageData;
    ctxProto.createImageData = function (w, h) {
        return originalCreateImageData.call(this, w, h);
    };
}

export default canvasModule;
