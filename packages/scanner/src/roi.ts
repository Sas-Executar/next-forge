/**
 * ROIExtractor (SPEC-SCANNER-001's pipeline stage). Pure crop-bounds
 * math — "ROI perceptível ao usuário" (REQ-SCAN-001) means a fixed,
 * on-screen-visible region the user aims the symbol at (an overlay
 * apps/mobile draws over the camera preview), not a detector that
 * finds the symbol anywhere in frame. A centered square is this
 * package's own disclosed choice of ROI shape/position — nothing in
 * the corpus specifies one.
 */
export interface RoiBounds {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
}

export class InvalidFrameDimensionsError extends Error {
  constructor(width: number, height: number) {
    super(`Frame dimensions must be positive: ${width}x${height}.`);
    this.name = "InvalidFrameDimensionsError";
  }
}

/**
 * A centered square covering `fraction` of the frame's shorter side.
 */
export const computeCenteredSquareRoi = (
  frameWidth: number,
  frameHeight: number,
  fraction = 0.6
): RoiBounds => {
  if (frameWidth <= 0 || frameHeight <= 0) {
    throw new InvalidFrameDimensionsError(frameWidth, frameHeight);
  }
  const side = Math.floor(Math.min(frameWidth, frameHeight) * fraction);
  return {
    x: Math.floor((frameWidth - side) / 2),
    y: Math.floor((frameHeight - side) / 2),
    width: side,
    height: side,
  };
};

/**
 * Crops an RGBA pixel buffer to the given bounds — real pixel-copy
 * logic, independent of how the buffer was decoded (apps/mobile's
 * camera-frame-source.ts / image-preprocessor.ts supply the source
 * buffer; this function doesn't care where it came from).
 */
export const cropRgba = (
  sourcePixels: Uint8Array | Uint8ClampedArray,
  sourceWidth: number,
  bounds: RoiBounds
): Uint8Array => {
  const cropped = new Uint8Array(bounds.width * bounds.height * 4);
  for (let row = 0; row < bounds.height; row++) {
    const srcRowStart = ((bounds.y + row) * sourceWidth + bounds.x) * 4;
    const dstRowStart = row * bounds.width * 4;
    cropped.set(
      sourcePixels.subarray(srcRowStart, srcRowStart + bounds.width * 4),
      dstRowStart
    );
  }
  return cropped;
};
