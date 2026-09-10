#!/usr/bin/env bun
/**
 * M09-T01: fetches the DINOv2 ViT-S/14 ONNX artifact from a GitHub
 * Release asset (per the plan's own D-decision — not Hugging Face,
 * whose CDN the corpus flags as blocked) and verifies it against a
 * known SHA-256 before it's ever placed where onnxruntime-react-native
 * would load it. The model binary is release-managed, not committed
 * raw to this repo (per the plan's own T01 wording) — this script is
 * how a developer/CI machine obtains it locally.
 *
 * Neither the Blueprint corpus nor this sandbox names an actual
 * release URL or SHA-256 for this artifact (confirmed by directly
 * reading SPEC-SCANNER-001 and ADR-SCANNER-001: both name the model
 * choice — "DINOv2 ViT-S/14" — but neither gives a download location
 * or a hash; there is no `visao.md` file anywhere in the Blueprint
 * repo, despite the plan citing specific line numbers in one). No
 * genuine GitHub Release with a trustworthy checksum exists to point
 * this at from inside this sandbox — DINOV2_MODEL_URL/
 * DINOV2_MODEL_SHA256 are required env vars precisely so this script
 * never has to guess or fabricate them. Set them (from your org's real
 * release) to actually run this; until then it fails loudly, on
 * purpose, rather than silently no-op'ing or writing an unverified
 * file.
 */
import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdir, rename, rm } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

const MODEL_URL = process.env.DINOV2_MODEL_URL;
const EXPECTED_SHA256 = process.env.DINOV2_MODEL_SHA256;
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEST_DIR = path.join(SCRIPT_DIR, "..", "assets", "models");
const DEST_PATH = path.join(DEST_DIR, "dinov2-vits14.onnx");
const TEMP_PATH = `${DEST_PATH}.download`;

class MissingConfigError extends Error {
  constructor(missing: readonly string[]) {
    super(
      `Cannot fetch the DINOv2 model: ${missing.join(" and ")} not set. ` +
        "No real GitHub Release URL/SHA-256 for this artifact exists in " +
        "this sandbox or the Blueprint corpus (see this script's own " +
        "header comment) — set both from your org's actual release " +
        "before running this."
    );
    this.name = "MissingConfigError";
  }
}

class ChecksumMismatchError extends Error {
  constructor(expected: string, actual: string) {
    super(
      `Downloaded file's SHA-256 (${actual}) does not match the expected ` +
        `checksum (${expected}) — refusing to install a model binary ` +
        "that doesn't match what was asked for. The partial download has " +
        "been deleted."
    );
    this.name = "ChecksumMismatchError";
  }
}

const downloadAndHash = async (
  url: string,
  destination: string
): Promise<string> => {
  const response = await fetch(url);
  if (!(response.ok && response.body)) {
    throw new Error(`Download failed: HTTP ${response.status} for ${url}`);
  }

  const hash = createHash("sha256");
  const fileStream = createWriteStream(destination);

  // ReadableStream (fetch's response.body) -> Node Readable, hashing
  // every chunk as it streams to disk rather than buffering the whole
  // (multi-hundred-MB) file in memory to hash it afterward.
  const nodeStream = Readable.fromWeb(
    response.body as Parameters<typeof Readable.fromWeb>[0]
  );
  nodeStream.on("data", (chunk: Buffer) => hash.update(chunk));
  await pipeline(nodeStream, fileStream);

  return hash.digest("hex");
};

const main = async () => {
  const missing = [
    !MODEL_URL && "DINOV2_MODEL_URL",
    !EXPECTED_SHA256 && "DINOV2_MODEL_SHA256",
  ].filter((v): v is string => Boolean(v));
  if (missing.length > 0) {
    throw new MissingConfigError(missing);
  }

  await mkdir(DEST_DIR, { recursive: true });

  console.log(`Downloading ${MODEL_URL as string} ...`);
  const actualSha256 = await downloadAndHash(MODEL_URL as string, TEMP_PATH);

  if (actualSha256 !== (EXPECTED_SHA256 as string).toLowerCase()) {
    await rm(TEMP_PATH, { force: true });
    throw new ChecksumMismatchError(EXPECTED_SHA256 as string, actualSha256);
  }

  await rename(TEMP_PATH, DEST_PATH);
  console.log(`Verified and installed ${DEST_PATH} (sha256:${actualSha256}).`);
};

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
