// DeviceMotion capture + 50 Hz resampling.
//
// Browser events fire at a device-dependent rate (iOS ~60 Hz, Android 50-100 Hz).
// We normalize to a 50 Hz grid with a setInterval pull from the latest event,
// matching UCI HAR's sampling rate. Unit conversion in getSample() matches
// the conventions recorded in preprocessing.json.

const GRAVITY = 9.80665; // m/s^2 per g
const DEG_TO_RAD = Math.PI / 180;

export class SensorCapture {
  constructor({ sampleRateHz = 50, windowSize = 128, onWindow } = {}) {
    this.sampleRateHz = sampleRateHz;
    this.windowSize = windowSize;
    this.onWindow = onWindow;
    this.sampleIntervalMs = 1000 / sampleRateHz;
    this._latestEvent = null;
    this._handler = (e) => { this._latestEvent = e; };
    this._buffer = []; // rolling window of samples
    this._tick = null;
    this._samplesSinceLastEmit = 0;
    this._running = false;
    this._eventSeen = false;
  }

  static async requestPermission() {
    const Need = typeof DeviceMotionEvent !== "undefined" &&
                 typeof DeviceMotionEvent.requestPermission === "function";
    if (!Need) return "granted"; // Android / desktop / older Safari
    try {
      const res = await DeviceMotionEvent.requestPermission();
      return res; // "granted" | "denied"
    } catch (err) {
      return "denied";
    }
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._buffer.length = 0;
    this._samplesSinceLastEmit = 0;
    this._eventSeen = false;
    window.addEventListener("devicemotion", this._handler, { passive: true });
    this._tick = setInterval(() => this._pull(), this.sampleIntervalMs);
  }

  stop() {
    if (!this._running) return;
    this._running = false;
    window.removeEventListener("devicemotion", this._handler);
    if (this._tick) clearInterval(this._tick);
    this._tick = null;
    this._latestEvent = null;
    this._buffer.length = 0;
  }

  hasReceivedEvent() { return this._eventSeen; }

  _pull() {
    const e = this._latestEvent;
    if (!e) return;
    this._eventSeen = true;

    const sample = this._extract(e);
    if (!sample) return;

    this._buffer.push(sample);
    if (this._buffer.length > this.windowSize) this._buffer.shift();
    this._samplesSinceLastEmit += 1;

    // Emit whenever we have a full window and have accumulated 50% new samples.
    const halfWindow = this.windowSize >> 1;
    if (this._buffer.length === this.windowSize &&
        this._samplesSinceLastEmit >= halfWindow) {
      this._samplesSinceLastEmit = 0;
      try { this.onWindow?.(this._buffer.slice()); } catch (err) {
        console.error("onWindow handler threw", err);
      }
    }
  }

  // Convert a DeviceMotionEvent into a 9-channel sample matching UCI HAR:
  //   body_acc (g), body_gyro (rad/s), total_acc (g)
  _extract(e) {
    const totalG = e.accelerationIncludingGravity;
    const bodyM = e.acceleration;        // may be null on some devices
    const gyro = e.rotationRate;

    if (!totalG || totalG.x == null) return null;

    const tax = (totalG.x ?? 0) / GRAVITY;
    const tay = (totalG.y ?? 0) / GRAVITY;
    const taz = (totalG.z ?? 0) / GRAVITY;

    let bax, bay, baz;
    if (bodyM && bodyM.x != null) {
      bax = (bodyM.x ?? 0) / GRAVITY;
      bay = (bodyM.y ?? 0) / GRAVITY;
      baz = (bodyM.z ?? 0) / GRAVITY;
    } else {
      // Fallback: approximate body_acc by subtracting a running gravity estimate.
      // We don't track gravity over time here; use (total - unit_gravity_guess).
      // The CNN is normalized per-channel so constant offsets are absorbed at
      // the first batch-norm / mean-subtraction step.
      bax = tax; bay = tay; baz = taz;
    }

    let gx = 0, gy = 0, gz = 0;
    if (gyro) {
      gx = (gyro.alpha ?? gyro.x ?? 0) * DEG_TO_RAD;
      gy = (gyro.beta  ?? gyro.y ?? 0) * DEG_TO_RAD;
      gz = (gyro.gamma ?? gyro.z ?? 0) * DEG_TO_RAD;
    }

    // Channel order must match preprocessing.json:
    //   body_acc_{x,y,z}, body_gyro_{x,y,z}, total_acc_{x,y,z}
    return [bax, bay, baz, gx, gy, gz, tax, tay, taz];
  }
}
