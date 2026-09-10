import { describe, expect, it } from "vitest";
import {
  computeCenteredSquareRoi,
  cropRgba,
  InvalidFrameDimensionsError,
} from "../src/roi";

describe("computeCenteredSquareRoi", () => {
  it("centers a square covering the given fraction of the shorter side", () => {
    const roi = computeCenteredSquareRoi(400, 300, 0.5);
    expect(roi.width).toBe(150);
    expect(roi.height).toBe(150);
    expect(roi.x).toBe((400 - 150) / 2);
    expect(roi.y).toBe((300 - 150) / 2);
  });

  it("handles a square frame", () => {
    const roi = computeCenteredSquareRoi(200, 200, 1);
    expect(roi.width).toBe(200);
    expect(roi.x).toBe(0);
  });

  it("throws InvalidFrameDimensionsError for non-positive dimensions", () => {
    expect(() => computeCenteredSquareRoi(0, 100)).toThrow(
      InvalidFrameDimensionsError
    );
    expect(() => computeCenteredSquareRoi(100, -1)).toThrow(
      InvalidFrameDimensionsError
    );
  });
});

describe("cropRgba", () => {
  it("extracts exactly the requested sub-region", () => {
    // 4x4 source, each pixel's R channel = its column index (0-3).
    const width = 4;
    const height = 4;
    const source = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        source[(y * width + x) * 4] = x;
      }
    }

    const cropped = cropRgba(source, width, {
      x: 1,
      y: 1,
      width: 2,
      height: 2,
    });
    expect(cropped.length).toBe(2 * 2 * 4);
    // Row 0 of the crop = source row 1, columns 1-2 -> R values 1, 2.
    expect(cropped[0]).toBe(1);
    expect(cropped[4]).toBe(2);
  });
});
