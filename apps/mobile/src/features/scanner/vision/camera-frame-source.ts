import type { CameraView } from "expo-camera";

export interface CapturedFrame {
  readonly base64: string;
  readonly capturedAt: number;
  readonly height: number;
  readonly width: number;
}

export class FrameCaptureFailedError extends Error {
  constructor(cause: unknown) {
    super(
      `Camera frame capture failed: ${cause instanceof Error ? cause.message : String(cause)}`
    );
    this.name = "FrameCaptureFailedError";
  }
}

/**
 * FrameSource (SPEC-SCANNER-001's pipeline stage). Real expo-camera
 * API — `takePictureAsync` — not a live per-frame processor: expo-
 * camera's CameraView doesn't expose a raw frame-processor callback
 * the way react-native-vision-camera does, so this captures a still
 * JPEG on a fixed interval instead (scanner-pipeline.ts drives the
 * interval). A disclosed, real trade-off: this repo already depends
 * on expo-camera (D5's Expo-first mobile stack), and adding
 * react-native-vision-camera + its own worklets runtime just for
 * continuous frame streaming is a materially bigger dependency than
 * this foundation milestone's scope — revisit if polling latency
 * proves too high once real on-device measurements exist (M09-T05).
 *
 * `skipProcessing: true` skips orientation/EXIF correction for lower
 * capture latency — the trade-off SPEC-SCANNER-001's own performance
 * goal (scan-to-command p95 <= 500ms, still unverified) calls for; the
 * ROI is defined in the un-rotated frame's own coordinate space
 * (roi.ts operates on whatever width/height this returns), so a
 * device-rotation edge case could misalign the ROI overlay — untested,
 * disclosed.
 */
export const captureFrame = async (
  cameraRef: CameraView
): Promise<CapturedFrame> => {
  try {
    const picture = await cameraRef.takePictureAsync({
      base64: true,
      quality: 0.5,
      skipProcessing: true,
    });
    if (!picture.base64) {
      throw new Error("takePictureAsync returned no base64 data.");
    }
    return {
      base64: picture.base64,
      width: picture.width,
      height: picture.height,
      capturedAt: Date.now(),
    };
  } catch (error) {
    throw new FrameCaptureFailedError(error);
  }
};
