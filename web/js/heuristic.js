// Zero-dependency fallback classifier. Used when the trained TF.js model
// isn't available yet (e.g. before training has been run). Distinguishes
// STATIONARY vs MOVING from accelerometer variance, so the rest of the
// pipeline (sensors, Supabase relay, UI) can be validated end-to-end.

export const HEURISTIC_LABELS = ["STATIONARY", "MOVING"];

export function classifyHeuristic(window) {
  // window is an array of samples, each a 9-element array.
  // Channels 6,7,8 are total_acc_{x,y,z} in g (includes gravity).
  const n = window.length;
  if (!n) return { label: "STATIONARY", confidence: 0, probs: [1, 0] };

  let sumMag = 0;
  const mags = new Array(n);
  for (let i = 0; i < n; i++) {
    const s = window[i];
    const tx = s[6], ty = s[7], tz = s[8];
    const m = Math.hypot(tx, ty, tz);
    mags[i] = m;
    sumMag += m;
  }
  const meanMag = sumMag / n;
  let varAcc = 0;
  for (let i = 0; i < n; i++) {
    const d = mags[i] - meanMag;
    varAcc += d * d;
  }
  const std = Math.sqrt(varAcc / n);

  // Empirical thresholds for g-units magnitude. Very coarse.
  const movingScore = Math.min(1, Math.max(0, (std - 0.05) / 0.45));
  const label = movingScore > 0.35 ? "MOVING" : "STATIONARY";
  const confidence = label === "MOVING" ? movingScore : 1 - movingScore;
  return {
    label,
    confidence,
    probs: label === "MOVING" ? [1 - movingScore, movingScore]
                              : [1 - movingScore, movingScore],
  };
}
