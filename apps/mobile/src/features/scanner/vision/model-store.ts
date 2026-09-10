import { CryptoDigestAlgorithm, digest as digestBytes } from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";

/**
 * On-device model acquisition (M09-T01's runtime counterpart to
 * scripts/fetch-model.ts). A large ONNX model is deliberately NOT
 * bundled into the app binary via Metro's static asset pipeline — a
 * bare `require("*.onnx")` would need the file to exist on disk at
 * bundle time, which it structurally can't for a "release-managed, not
 * committed raw" artifact (this file wouldn't even be reachable from a
 * fresh checkout without first running the fetch script). Downloading
 * a large ML model on first use and caching it in the app's own
 * document directory is also the standard real-world pattern for
 * mobile ML apps generally, not just a workaround for this repo's
 * asset-pipeline constraint.
 *
 * Same disclosed gap as scripts/fetch-model.ts: no real
 * DINOV2_MODEL_URL/SHA256 exists in this sandbox or the Blueprint
 * corpus (confirmed by directly reading SPEC-SCANNER-001 and
 * ADR-SCANNER-001 — both name the model, neither a download location
 * or hash) — this module's functions are real and correct, but have
 * never downloaded or verified an actual file.
 */
const MODEL_FILENAME = "dinov2-vits14.onnx";

const modelsDirectory = () => new Directory(Paths.document, "models");

export const getLocalModelFile = (): File =>
  new File(modelsDirectory(), MODEL_FILENAME);

export const isModelDownloaded = (): boolean => getLocalModelFile().exists;

export class ModelChecksumMismatchError extends Error {
  constructor(expected: string, actual: string) {
    super(
      `Downloaded model's SHA-256 (${actual}) doesn't match the expected checksum (${expected}) — deleting it rather than loading an unverified model.`
    );
    this.name = "ModelChecksumMismatchError";
  }
}

/**
 * SHA-256 over the whole downloaded file via expo-crypto's Web-Crypto-
 * style `digest()` (ArrayBuffer in, ArrayBuffer out) — this package
 * has no streaming/chunked digest API, so this reads the whole file
 * into memory to hash it. DINOv2 ViT-S/14 is a small model (tens of
 * MB, not hundreds), so a one-shot in-memory hash is a real, working,
 * honest choice for this foundation milestone — revisit only if a
 * larger future model variant makes that memory cost a real problem.
 */
const sha256OfFile = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await digestBytes(CryptoDigestAlgorithm.SHA256, buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Downloads the model from `url`, verifies it against `expectedSha256`
 * (case-insensitive hex), and returns the verified local File — or
 * deletes the download and throws ModelChecksumMismatchError. Mirrors
 * scripts/fetch-model.ts's own verify-then-install discipline, on
 * device instead of at dev/CI time.
 */
export const downloadAndVerifyModel = async (
  url: string,
  expectedSha256: string
): Promise<File> => {
  const directory = modelsDirectory();
  directory.create({ intermediates: true, idempotent: true });

  const destination = getLocalModelFile();
  if (destination.exists) {
    destination.delete();
  }

  const downloaded = await File.downloadFileAsync(url, directory, {
    idempotent: true,
  });

  const actualSha256 = await sha256OfFile(downloaded);
  if (actualSha256.toLowerCase() !== expectedSha256.toLowerCase()) {
    downloaded.delete();
    throw new ModelChecksumMismatchError(expectedSha256, actualSha256);
  }

  return downloaded;
};
