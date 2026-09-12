import { describe, expect, it } from "vitest";
import {
  IMAGENET_MEAN,
  IMAGENET_STD,
  InvalidPixelBufferError,
  resizeAndNormalize,
} from "../src/preprocess";

/** Builds a solid-color RGBA buffer of the given size. */
const solidColor = (
  width: number,
  height: number,
  r: number,
  g: number,
  b: number
): Uint8Array => {
  const buffer = new Uint8Array(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    buffer[i * 4] = r;
    buffer[i * 4 + 1] = g;
    buffer[i * 4 + 2] = b;
    buffer[i * 4 + 3] = 255;
  }
  return buffer;
};

describe("resizeAndNormalize", () => {
  it("normalizes a solid-color image to a constant value per channel", () => {
    const pixels = solidColor(8, 8, 255, 0, 0); // pure red
    const output = resizeAndNormalize(pixels, 8, 8, 4);
    const channelSize = 4 * 4;

    const expectedR = (1 - IMAGENET_MEAN[0]) / IMAGENET_STD[0];
    const expectedG = (0 - IMAGENET_MEAN[1]) / IMAGENET_STD[1];
    const expectedB = (0 - IMAGENET_MEAN[2]) / IMAGENET_STD[2];

    for (let i = 0; i < channelSize; i++) {
      expect(output[i]).toBeCloseTo(expectedR, 4);
      expect(output[channelSize + i]).toBeCloseTo(expectedG, 4);
      expect(output[2 * channelSize + i]).toBeCloseTo(expectedB, 4);
    }
  });

  it("produces output of length 3 * targetSize^2 (CHW layout)", () => {
    const pixels = solidColor(16, 16, 100, 150, 200);
    const output = resizeAndNormalize(pixels, 16, 16, 10);
    expect(output.length).toBe(3 * 10 * 10);
  });

  it("handles downscaling from a larger source image", () => {
    const pixels = solidColor(500, 500, 0, 0, 0);
    const output = resizeAndNormalize(pixels, 500, 500, 224);
    expect(output.length).toBe(3 * 224 * 224);
    // Pure black: (0 - mean) / std for each channel.
    expect(output[0]).toBeCloseTo((0 - IMAGENET_MEAN[0]) / IMAGENET_STD[0], 4);
  });

  it("handles upscaling from a smaller source image", () => {
    const pixels = solidColor(2, 2, 255, 255, 255);
    const output = resizeAndNormalize(pixels, 2, 2, 224);
    expect(output.length).toBe(3 * 224 * 224);
  });

  it("throws InvalidPixelBufferError when the buffer length doesn't match dimensions", () => {
    const pixels = new Uint8Array(10); // too short for any real width*height*4
    expect(() => resizeAndNormalize(pixels, 8, 8, 4)).toThrow(
      InvalidPixelBufferError
    );
  });
});
