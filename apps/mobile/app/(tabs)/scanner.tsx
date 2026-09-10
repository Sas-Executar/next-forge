import { useAuth } from "@clerk/expo";
import { light } from "@repo/design-tokens";
import { INITIAL_LATCH_STATUS, type LatchStatus } from "@repo/scanner";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { Text, View } from "@/components/themed";
import { env } from "@/env";
import {
  fetchRegisteredSymbols,
  postUndo,
  SYMBOL_LABEL_PT,
} from "@/src/features/scanner/commands/visual-symbols";
import {
  downloadAndVerifyModel,
  isModelDownloaded,
} from "@/src/features/scanner/vision/model-store";
import {
  runScanTick,
  type ScanTickResult,
} from "@/src/features/scanner/vision/scanner-pipeline";

const SCAN_INTERVAL_MS = 800;

/**
 * Scanner tab (M09-T03/T04) — the real end-to-end wiring: camera
 * preview → runScanTick() on a fixed interval → live latch/recognition
 * status → dispatch's CommandResult, with Undo for the last Done
 * mutation. See scanner-pipeline.ts's own comment for why this polls
 * rather than streams continuous frames, and dinov2-encoder.ts's for
 * the one piece (session.run against a real model) that has never
 * executed — no physical device or real ONNX artifact exists in the
 * environment this was built in.
 */
export default function ScannerScreen() {
  const { getToken } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isDownloadingModel, setIsDownloadingModel] = useState(false);

  const [symbols, setSymbols] = useState<
    Awaited<ReturnType<typeof fetchRegisteredSymbols>>
  >([]);
  const [symbolsError, setSymbolsError] = useState<string | null>(null);

  const [isScanning, setIsScanning] = useState(false);
  const [lastTick, setLastTick] = useState<ScanTickResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const isTickInFlight = useRef(false);

  useEffect(() => {
    setModelReady(isModelDownloaded());
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount, getToken is stable per Clerk's own contract.
  useEffect(() => {
    getToken()
      .then((token) => {
        if (!token) {
          throw new Error("No active Clerk session token.");
        }
        return fetchRegisteredSymbols(token);
      })
      .then(setSymbols)
      .catch((error: unknown) =>
        setSymbolsError(error instanceof Error ? error.message : String(error))
      );
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: tick() closes over the latest state via refs/functional updates where it matters — adding it would restart the interval every render, since tick is redefined each render.
  useEffect(() => {
    if (!(isScanning && modelReady) || symbols.length === 0) {
      return;
    }
    const interval = setInterval(() => {
      tick();
    }, SCAN_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isScanning, modelReady, symbols]);

  const tick = async () => {
    if (isTickInFlight.current || !cameraRef.current) {
      return;
    }
    isTickInFlight.current = true;
    try {
      const token = await getToken();
      if (!token) {
        throw new Error("No active Clerk session token.");
      }
      const currentLatch: LatchStatus = lastTick?.latch ?? INITIAL_LATCH_STATUS;
      const result = await runScanTick(
        cameraRef.current,
        symbols,
        currentLatch,
        token
      );
      setLastTick(result);
      setScanError(null);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : String(error));
    } finally {
      isTickInFlight.current = false;
    }
  };

  const onDownloadModel = async () => {
    setIsDownloadingModel(true);
    setModelError(null);
    try {
      if (
        !(
          env.EXPO_PUBLIC_DINOV2_MODEL_URL &&
          env.EXPO_PUBLIC_DINOV2_MODEL_SHA256
        )
      ) {
        throw new Error(
          "EXPO_PUBLIC_DINOV2_MODEL_URL/EXPO_PUBLIC_DINOV2_MODEL_SHA256 not configured — no real DINOv2 release exists to download in this environment."
        );
      }
      await downloadAndVerifyModel(
        env.EXPO_PUBLIC_DINOV2_MODEL_URL,
        env.EXPO_PUBLIC_DINOV2_MODEL_SHA256
      );
      setModelReady(true);
    } catch (error) {
      setModelError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsDownloadingModel(false);
    }
  };

  const onUndo = async () => {
    const mutationId =
      lastTick?.commandResult?.status === "OK"
        ? lastTick.commandResult.mutation?.mutationId
        : null;
    if (!mutationId) {
      return;
    }
    const token = await getToken();
    if (!token) {
      return;
    }
    const result = await postUndo(mutationId, token);
    setLastTick((prev) => (prev ? { ...prev, commandResult: result } : prev));
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>
          A câmera é necessária para o Scanner de símbolos visuais.
        </Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Permitir câmera</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (!modelReady) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>
          Modelo DINOv2 não instalado neste dispositivo.
        </Text>
        <TouchableOpacity
          disabled={isDownloadingModel}
          onPress={onDownloadModel}
          style={styles.button}
        >
          {isDownloadingModel ? (
            <ActivityIndicator color={light.color.background} />
          ) : (
            <Text style={styles.buttonText}>Baixar modelo</Text>
          )}
        </TouchableOpacity>
        {modelError && <Text style={styles.error}>{modelError}</Text>}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera}>
        <View style={styles.roiOverlay} />
      </CameraView>
      <View style={styles.statusBar}>
        <Text style={styles.status}>
          {lastTick?.detectedSymbolId
            ? (SYMBOL_LABEL_PT[lastTick.detectedSymbolId] ??
              lastTick.detectedSymbolId)
            : "—"}
          {" · "}
          {lastTick?.latch.state ?? "ABSENT"}
        </Text>
        {symbolsError && <Text style={styles.error}>{symbolsError}</Text>}
        {scanError && <Text style={styles.error}>{scanError}</Text>}
        {lastTick?.commandResult?.status === "OK" &&
          lastTick.commandResult.mutation && (
            <TouchableOpacity onPress={onUndo} style={styles.undoButton}>
              <Text style={styles.buttonText}>Desfazer</Text>
            </TouchableOpacity>
          )}
        <TouchableOpacity
          onPress={() => setIsScanning((current) => !current)}
          style={styles.button}
        >
          <Text style={styles.buttonText}>
            {isScanning ? "Parar" : "Escanear"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  camera: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  roiOverlay: {
    width: "60%",
    aspectRatio: 1,
    borderWidth: 2,
    // Semi-transparent overlay border — alpha applied to the same
    // semantic background token rather than a standalone arbitrary hex.
    borderColor: `${light.color.background}aa`,
    borderRadius: 12,
  },
  statusBar: { padding: 16, gap: 8, alignItems: "center" },
  status: { fontSize: 14, textAlign: "center" },
  button: {
    backgroundColor: light.color.action.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  undoButton: {
    backgroundColor: light.color.status.error,
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  buttonText: { color: light.color.background, fontWeight: "600" },
  error: {
    color: light.color.status.error,
    fontSize: 12,
    textAlign: "center",
  },
});
