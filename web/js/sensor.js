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
    // Running gravity estimate (low-pass filter on total acc). Used to
    // synthesize body_acc when the device doesn't provide it directly.
    // alpha ≈ exp(-2π·0.3/50) matches UCI HAR's 0.3 Hz cutoff at 50 Hz.
    this._gravity = null;
    this._gravityAlpha = 0.96;
    this._bodyAccSource = "unknown"; // "hardware" | "filtered" | "unknown"
    this._lastSample = null;        // latest 9-channel sample for debug
  }

  getBodyAccSource() { return this._bodyAccSource; }
  getLastSample() { return this._lastSample; }

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

    // Emit every ~0.32 s so the display feels live. Window still spans the
    // last 2.56 s (what the CNN was trained on); we just slide it faster.
    // 16 samples @ 50 Hz = 320 ms cadence.
    const hopSamples = Math.max(1, Math.round(this.sampleRateHz * 0.32));
    if (this._buffer.length === this.windowSize &&
        this._samplesSinceLastEmit >= hopSamples) {
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
      this._bodyAccSource = "hardware";
    } else {
      // Low-pass filter to estimate gravity, then subtract from total.
      // Matches UCI HAR's 0.3 Hz Butterworth split between gravity and body.
      if (!this._gravity) this._gravity = { x: tax, y: tay, z: taz };
      const a = this._gravityAlpha;
      this._gravity.x = a * this._gravity.x + (1 - a) * tax;
      this._gravity.y = a * this._gravity.y + (1 - a) * tay;
      this._gravity.z = a * this._gravity.z + (1 - a) * taz;
      bax = tax - this._gravity.x;
      bay = tay - this._gravity.y;
      baz = taz - this._gravity.z;
      this._bodyAccSource = "filtered";
    }

    // DeviceMotionEventRotationRate.alpha/beta/gamma are rotation rates
    // around the Z / X / Y axes respectively (in deg/s). Map to UCI HAR's
    // body_gyro_{x,y,z} accordingly.
    let gx = 0, gy = 0, gz = 0;
    if (gyro) {
      const rx = gyro.beta  ?? gyro.x ?? 0; // rotation around X
      const ry = gyro.gamma ?? gyro.y ?? 0; // rotation around Y
      const rz = gyro.alpha ?? gyro.z ?? 0; // rotation around Z
      gx = rx * DEG_TO_RAD;
      gy = ry * DEG_TO_RAD;
      gz = rz * DEG_TO_RAD;
    }

    // Channel order must match preprocessing.json:
    //   body_acc_{x,y,z}, body_gyro_{x,y,z}, total_acc_{x,y,z}
    const sample = [bax, bay, baz, gx, gy, gz, tax, tay, taz];
    this._lastSample = sample;
    return sample;
  }
}
