import {
  computeCenteredSquareRoi,
  cropRgba,
  DEFAULT_INPUT_SIZE,
  resizeAndNormalize,
} from "@repo/scanner";
import { AlphaType, ColorType, Skia } from "@shopify/react-native-skia";
import { InferenceSession, Tensor } from "onnxruntime-react-native";
import { getLocalModelFile, isModelDownloaded } from "./model-store";

export class ModelNotDownloadedError extends Error {
  constructor() {
    super(
      "The DINOv2 model hasn't been downloaded to this device yet — call downloadAndVerifyModel() first (model-store.ts)."
    );
    this.name = "ModelNotDownloadedError";
  }
}

export class ImageDecodeFailedError extends Error {
  constructor() {
    super("Skia could not decode the captured frame's JPEG bytes.");
    this.name = "ImageDecodeFailedError";
  }
}

export class PixelReadFailedError extends Error {
  constructor() {
    super("Skia decoded the image but readPixels() returned null.");
    this.name = "PixelReadFailedError";
  }
}

let cachedSession: InferenceSession | null = null;

/**
 * onnxruntime-react-native's real InferenceSession.create(uri) — cached
 * across calls (loading a model is expensive; the pipeline calls this
 * once per scanning session, not once per frame).
 */
const getSession = async (): Promise<InferenceSession> => {
  if (cachedSession) {
    return cachedSession;
  }
  if (!isModelDownloaded()) {
    throw new ModelNotDownloadedError();
  }
  cachedSession = await InferenceSession.create(getLocalModelFile().uri);
  return cachedSession;
};

/**
 * Decodes a captured JPEG's base64 bytes into a raw RGBA pixel buffer.
 * Real Skia API (Skia.Data.fromBase64 -> Skia.Image.MakeImageFromEncoded
 * -> image.readPixels with an explicit RGBA_8888/Unpremul ImageInfo) —
 * this package's disclosed choice for the one genuinely hard step in
 * the whole pipeline: RN has no built-in "give me raw pixels from a
 * JPEG" primitive, and onnxruntime-react-native (unlike onnxruntime-web)
 * has no Tensor.fromImage() convenience either. @shopify/react-native-skia
 * is a real, actively-maintained, Expo-config-plugin-free dependency
 * whose `readPixels()` is exactly this primitive — chosen over
 * `expo-gl` (which would need a mounted GL context + texture + full-
 * screen-quad render just to read pixels back) as the simpler, more
 * direct real option.
 */
const decodeJpegToRgba = (
  base64: string
): { pixels: Uint8Array; width: number; height: number } => {
  const data = Skia.Data.fromBase64(base64);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    throw new ImageDecodeFailedError();
  }
  const width = image.width();
  const height = image.height();
  const pixels = image.readPixels(0, 0, {
    width,
    height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });
  if (!pixels) {
    throw new PixelReadFailedError();
  }
  return { pixels: Uint8Array.from(pixels), width, height };
};

/**
 * VisualEncoder (SPEC-SCANNER-001's pipeline stage). The one function
 * in this whole feature that has never run against a real model file —
 * everything upstream of `session.run()` (decode, crop, resize,
 * normalize) is written against confirmed real APIs and reuses
 * packages/scanner's already-tested pure math; `session.run()` itself
 * needs the actual DINOv2 ONNX artifact this sandbox doesn't have
 * (M09-T01's disclosed gap) to ever execute.
 *
 * Output tensor name/shape is read from the model's own declared
 * outputs (`session.outputNames`) rather than a hardcoded string —
 * the concrete DINOv2 ONNX export's output naming isn't verified
 * against anything in this sandbox, so guessing a literal name (e.g.
 * "last_hidden_state") would be exactly the kind of unverified
 * assumption this codebase's own conventions avoid.
 */
export const encodeFrame = async (
  base64Jpeg: string,
  inputSize: number = DEFAULT_INPUT_SIZE
): Promise<Float32Array> => {
  const session = await getSession();
  const { pixels, width, height } = decodeJpegToRgba(base64Jpeg);

  const roi = computeCenteredSquareRoi(width, height);
  const cropped = cropRgba(pixels, width, roi);
  const inputTensorData = resizeAndNormalize(
    cropped,
    roi.width,
    roi.height,
    inputSize
  );

  const inputTensor = new Tensor("float32", inputTensorData, [
    1,
    3,
    inputSize,
    inputSize,
  ]);
  const inputName = session.inputNames[0];
  if (!inputName) {
    throw new Error("The loaded model declares no input names.");
  }
  const results = await session.run({ [inputName]: inputTensor });

  const outputName = session.outputNames[0];
  if (!outputName) {
    throw new Error("The loaded model declares no output names.");
  }
  const output = results[outputName];
  if (!(output && output.data instanceof Float32Array)) {
    throw new Error(
      `Expected a float32 output tensor named "${outputName}", got something else.`
    );
  }
  return output.data;
};
