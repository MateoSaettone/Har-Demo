// ONNX Runtime Web model loader with a graceful fallback to the heuristic
// classifier. If /model/model.onnx + /model/preprocessing.json exist, we run
// the CNN. Otherwise we use the STATIONARY/MOVING heuristic so the rest of
// the demo works end-to-end.

import { HEURISTIC_LABELS, classifyHeuristic } from "./heuristic.js";

const ORT_CDN = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/ort.min.js";
const ORT_WASM_BASE = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/";

let ort = null;                 // loaded onnxruntime-web namespace
let session = null;             // ort.InferenceSession or null
let labels = HEURISTIC_LABELS;
let mean = null;                // Float32Array, length = channels
let std = null;                 // Float32Array, length = channels
let channels = 9;
let windowSize = 128;
let inputName = "input";
let mode = "heuristic";         // "onnx" | "heuristic"

async function loadOrt() {
  if (ort) return ort;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = ORT_CDN;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load onnxruntime-web"));
    document.head.appendChild(s);
  });
  // eslint-disable-next-line no-undef
  ort = window.ort;
  // Point ORT at its WASM files on the CDN so nothing needs to be self-hosted.
  if (ort?.env?.wasm) {
    ort.env.wasm.wasmPaths = ORT_WASM_BASE;
    ort.env.wasm.numThreads = 1;
  }
  return ort;
}

export async function initModel({ modelBase = "model" } = {}) {
  try {
    const ppRes = await fetch(`${modelBase}/preprocessing.json`);
    if (!ppRes.ok) throw new Error("no preprocessing.json");
    const pp = await ppRes.json();

    const onnxRes = await fetch(`${modelBase}/model.onnx`, { method: "HEAD" });
    if (!onnxRes.ok) throw new Error("no model.onnx");

    await loadOrt();
    session = await ort.InferenceSession.create(`${modelBase}/model.onnx`, {
      executionProviders: ["wasm"],
    });
    inputName = session.inputNames[0];

    labels = pp.labels;
    mean = new Float32Array(pp.mean);
    std = new Float32Array(pp.std);
    channels = pp.channels.length;
    windowSize = pp.window;
    mode = "onnx";
    return { mode, labels };
  } catch (err) {
    console.warn("ONNX model not available, using heuristic fallback:", err.message);
    mode = "heuristic";
    labels = HEURISTIC_LABELS;
    return { mode, labels };
  }
}

export function getMode() { return mode; }
export function getLabels() { return labels; }
export function getWindowSize() { return windowSize; }

function softmax(arr) {
  let max = -Infinity;
  for (let i = 0; i < arr.length; i++) if (arr[i] > max) max = arr[i];
  let sum = 0;
  const out = new Array(arr.length);
  for (let i = 0; i < arr.length; i++) {
    out[i] = Math.exp(arr[i] - max);
    sum += out[i];
  }
  for (let i = 0; i < arr.length; i++) out[i] /= sum;
  return out;
}

// Run inference on a window (array of samples, each a Float[channels]).
// Returns { label, confidence, probs: Float[], elapsedMs }.
export async function predict(window) {
  const started = performance.now();

  if (mode === "heuristic") {
    const r = classifyHeuristic(window);
    return { ...r, elapsedMs: performance.now() - started };
  }

  // Build input tensor [1, windowSize, channels], normalized.
  const flat = new Float32Array(windowSize * channels);
  for (let i = 0; i < window.length; i++) {
    const s = window[i];
    for (let c = 0; c < channels; c++) {
      flat[i * channels + c] = (s[c] - mean[c]) / std[c];
    }
  }
  const tensor = new ort.Tensor("float32", flat, [1, windowSize, channels]);
  const feeds = { [inputName]: tensor };
  const result = await session.run(feeds);
  const outName = session.outputNames[0];
  const raw = result[outName].data;

  // Model already outputs softmax probabilities (final Dense(softmax)), but
  // cheap to re-normalize in case of numerical drift.
  const probs = softmax(Array.from(raw));
  let bestIdx = 0, bestP = -Infinity;
  for (let i = 0; i < probs.length; i++) {
    if (probs[i] > bestP) { bestP = probs[i]; bestIdx = i; }
  }
  return {
    label: labels[bestIdx],
    confidence: bestP,
    probs,
    elapsedMs: performance.now() - started,
  };
}
