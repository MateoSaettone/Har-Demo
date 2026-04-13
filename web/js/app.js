// Entry point: wires the UI to the sensor, the model, and the Supabase bus.
//
// Single URL, two auto-detected roles:
//   * Any device that taps "Start tracking" becomes a broadcaster.
//   * All other devices on the same URL just watch.
// No pairing, no QR, no session codes.

import { SensorCapture } from "./sensor.js";
import { initModel, predict, getMode, getLabels, getWindowSize } from "./model.js";
import { createBus, DEVICE_ID } from "./bus.js";

const els = {
  label: document.getElementById("label"),
  bar: document.getElementById("confidence-bar"),
  confText: document.getElementById("confidence-text"),
  source: document.getElementById("source"),
  statusPill: document.getElementById("status-pill"),
  btnTrack: document.getElementById("btn-track"),
  btnStop: document.getElementById("btn-stop"),
  msg: document.getElementById("msg"),
  meta: document.getElementById("meta"),
  dbg: {
    bodySrc: document.getElementById("dbg-bodysrc"),
    rate: document.getElementById("dbg-rate"),
    bacc: document.getElementById("dbg-bacc"),
    tacc: document.getElementById("dbg-tacc"),
    gyro: document.getElementById("dbg-gyro"),
    probs: document.getElementById("dbg-probs"),
  },
};

let eventCount = 0;
let lastRateStamp = performance.now();
function bumpEventRate() {
  eventCount++;
  const now = performance.now();
  if (now - lastRateStamp >= 1000) {
    const rate = eventCount * 1000 / (now - lastRateStamp);
    if (els.dbg.rate) els.dbg.rate.textContent = rate.toFixed(1) + " Hz";
    eventCount = 0;
    lastRateStamp = now;
  }
}
function fmtTriplet(a, b, c) {
  return `${a.toFixed(2)} ${b.toFixed(2)} ${c.toFixed(2)}`;
}
function renderDebug(sensor, pred) {
  if (!els.dbg.bodySrc) return;
  els.dbg.bodySrc.textContent = sensor?.getBodyAccSource() ?? "—";
  const s = sensor?.getLastSample();
  if (s) {
    els.dbg.bacc.textContent = fmtTriplet(s[0], s[1], s[2]);
    els.dbg.gyro.textContent = fmtTriplet(s[3], s[4], s[5]);
    els.dbg.tacc.textContent = fmtTriplet(s[6], s[7], s[8]);
  }
  if (pred?.probs && els.dbg.probs) {
    const labels = getLabels();
    const rows = pred.probs.map((p, i) =>
      `<div>${labels[i]}</div><div>${(p * 100).toFixed(1)}%</div>`
    );
    els.dbg.probs.innerHTML = rows.join("");
  }
}

const STALE_MS = 3000;
let lastRemoteTs = 0;
let lastDisplayedSource = null;
let isTracking = false;
let wakeLock = null;
let bus = null;
let sensor = null;
let modelInfo = null;

function setStatus(kind, text) {
  els.statusPill.className = `pill pill--${kind}`;
  els.statusPill.textContent = text;
}
function setMsg(kind, text) {
  els.msg.className = `msg ${kind ? "msg--" + kind : ""}`;
  els.msg.textContent = text || "";
}
function setLabel(text) {
  els.label.textContent = text;
  const cls = "label--" + text.toLowerCase();
  els.label.className = `label ${cls}`;
}
function setConfidence(p) {
  const pct = Math.round(Math.max(0, Math.min(1, p)) * 100);
  els.bar.style.setProperty("--w", pct + "%");
  els.confText.textContent = `confidence ${pct}%`;
}
function setSource(text) {
  els.source.textContent = text;
}

function render(pred, { fromSelf }) {
  setLabel(pred.label);
  setConfidence(pred.confidence ?? 0);
  const latency = pred.ts ? Math.max(0, Date.now() - pred.ts) : 0;
  const who = fromSelf ? "this device" : `device ${pred.device ?? "?"}`;
  setSource(`tracker: ${who} · ${latency} ms`);
  lastDisplayedSource = fromSelf ? "self" : "remote";
  if (!fromSelf) lastRemoteTs = Date.now();
}

function checkStale() {
  // If we haven't heard from a remote tracker in a while and we're not tracking
  // ourselves, show the idle prompt again.
  if (isTracking) return;
  const stale = Date.now() - lastRemoteTs > STALE_MS;
  if (stale && lastDisplayedSource !== "idle") {
    setLabel("WAITING");
    setConfidence(0);
    setSource("no tracker active");
    setStatus("idle", "idle");
    lastDisplayedSource = "idle";
  }
}
setInterval(checkStale, 500);

async function acquireWakeLock() {
  try {
    if ("wakeLock" in navigator) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener?.("release", () => { wakeLock = null; });
    }
  } catch (err) {
    console.warn("wakeLock request failed:", err);
  }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && isTracking) acquireWakeLock();
});

async function startTracking() {
  setMsg(null, "");
  els.btnTrack.disabled = true;

  const perm = await SensorCapture.requestPermission();
  if (perm !== "granted") {
    els.btnTrack.disabled = false;
    setStatus("error", "no motion");
    setMsg("err", "Motion permission denied. Enable it in browser settings and retry.");
    return;
  }

  sensor = new SensorCapture({
    sampleRateHz: 50,
    windowSize: getWindowSize(),
    onWindow: async (win) => {
      try {
        const pred = await predict(win);
        const payload = {
          label: pred.label,
          confidence: pred.confidence,
          ts: Date.now(),
          mode: getMode(),
          elapsedMs: Math.round(pred.elapsedMs),
          device: DEVICE_ID,
        };
        render(payload, { fromSelf: true });
        renderDebug(sensor, pred);
        bus?.publish(payload).catch((err) => console.warn("publish failed:", err));
      } catch (err) {
        console.error("inference error:", err);
      }
    },
  });
  // Count raw events so the debug panel shows actual sensor rate.
  const origHandler = window.addEventListener;
  window.addEventListener("devicemotion", bumpEventRate, { passive: true });
  sensor.start();
  isTracking = true;
  setStatus("tracking", "tracking");
  els.btnTrack.classList.add("hidden");
  els.btnStop.classList.remove("hidden");
  setMsg("ok", `tracking with ${getMode()} model`);
  await acquireWakeLock();

  // Quick sanity check: warn if we don't get any motion events within 1.5 s.
  setTimeout(() => {
    if (isTracking && !sensor?.hasReceivedEvent()) {
      setMsg("warn", "No motion events yet — try moving the phone, or check browser settings.");
    }
  }, 1500);
}

function stopTracking() {
  sensor?.stop();
  sensor = null;
  isTracking = false;
  window.removeEventListener("devicemotion", bumpEventRate);
  if (wakeLock?.release) { wakeLock.release().catch(() => {}); wakeLock = null; }
  els.btnTrack.classList.remove("hidden");
  els.btnStop.classList.add("hidden");
  els.btnTrack.disabled = false;
  setStatus("viewing", "viewing");
  setMsg(null, "");
}

els.btnTrack.addEventListener("click", startTracking);
els.btnStop.addEventListener("click", stopTracking);

async function boot() {
  setStatus("viewing", "viewing");
  setLabel("WAITING");
  setConfidence(0);
  setSource("no tracker active");
  setMsg(null, "connecting…");

  modelInfo = await initModel();
  els.meta.textContent =
    `model: ${modelInfo.mode} · classes: ${getLabels().length} · device: ${DEVICE_ID}`;

  try {
    bus = createBus({
      onPrediction: (payload) => {
        if (!payload || payload.device === DEVICE_ID) return;
        render(payload, { fromSelf: false });
        setStatus(isTracking ? "tracking" : "viewing", isTracking ? "tracking" : "viewing");
      },
    });
    await bus.ready;
    setMsg(null, "");
  } catch (err) {
    console.warn("bus init failed:", err);
    setMsg("warn", "Realtime channel unavailable — tracking still works locally.");
  }
}

boot().catch((err) => {
  console.error("boot failed:", err);
  setMsg("err", "App failed to start. Check console.");
});
