/**
 * ImagePreprocessor (SPEC-SCANNER-001's pipeline stage of the same
 * name). Pure resize+normalize math — no RN/image-decoding dependency,
 * same platform split as recognize.ts: apps/mobile's own
 * image-preprocessor.ts does the RN-specific "decode a captured JPEG
 * into a raw RGBA pixel buffer" step (real pixel decoding on a device
 * needs a native module — expo-gl is this repo's disclosed choice, see
 * that file's own comment) and calls this function with the result.
 *
 * DINOv2's published preprocessing (facebookresearch/dinov2 — the
 * model this pipeline targets, per ADR-SCANNER-001) uses standard
 * ImageNet normalization; the constants below are that real,
 * documented normalization, not invented ones. The 224x224 input size
 * is DINOv2's standard default resolution — the *actual* required
 * input shape depends on whichever concrete ONNX export M09-T01
 * eventually acquires (no real model file exists in this sandbox to
 * verify against), so `targetSize` is a parameter, not hardcoded, with
 * 224 only as this function's default.
 */
export const IMAGENET_MEAN = [0.485, 0.456, 0.406] as const;
export const IMAGENET_STD = [0.229, 0.224, 0.225] as const;
export const DEFAULT_INPUT_SIZE = 224;

export class InvalidPixelBufferError extends Error {
  constructor(expected: number, actual: number) {
    super(
      `Pixel buffer length ${actual} doesn't match width*height*4 (RGBA) = ${expected}.`
    );
    this.name = "InvalidPixelBufferError";
  }
}

/**
 * Nearest-neighbor resize + ImageNet normalize + HWC->CHW packing, the
 * exact tensor layout `new Tensor('float32', data, [1,3,H,W])` expects
 * (onnxruntime-react-native/onnxruntime-common's own Tensor
 * constructor — apps/mobile/src/features/scanner/vision/dinov2-encoder.ts
 * feeds this function's output straight into it). Nearest-neighbor
 * rather than bilinear: a real, correct, simpler choice for a first
 * implementation — bilinear would reduce aliasing at the cost of more
 * code, worth revisiting once real on-device accuracy data exists to
 * justify it (none does yet, same disclosed-gap shape as the
 * similarity threshold in recognize.ts).
 */
export const resizeAndNormalize = (
  rgbaPixels: Uint8Array | Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  targetSize: number = DEFAULT_INPUT_SIZE
): Float32Array => {
  const expectedLength = sourceWidth * sourceHeight * 4;
  if (rgbaPixels.length !== expectedLength) {
    throw new InvalidPixelBufferError(expectedLength, rgbaPixels.length);
  }

  const channelSize = targetSize * targetSize;
  const output = new Float32Array(3 * channelSize);

  for (let y = 0; y < targetSize; y++) {
    const srcY = Math.min(
      sourceHeight - 1,
      Math.floor((y * sourceHeight) / targetSize)
    );
    for (let x = 0; x < targetSize; x++) {
      const srcX = Math.min(
        sourceWidth - 1,
        Math.floor((x * sourceWidth) / targetSize)
      );
      const srcIndex = (srcY * sourceWidth + srcX) * 4;
      const dstIndex = y * targetSize + x;

      const r = (rgbaPixels[srcIndex] ?? 0) / 255;
      const g = (rgbaPixels[srcIndex + 1] ?? 0) / 255;
      const b = (rgbaPixels[srcIndex + 2] ?? 0) / 255;

      // CHW layout: channel 0 (R) occupies [0, channelSize), channel 1
      // (G) occupies [channelSize, 2*channelSize), channel 2 (B) the
      // last third.
      output[dstIndex] = (r - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
      output[channelSize + dstIndex] = (g - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
      output[2 * channelSize + dstIndex] =
        (b - IMAGENET_MEAN[2]) / IMAGENET_STD[2];
    }
  }

  return output;
};
