# Delivery: getting the demo onto teammates' phones

Goal: Tomas and Ethan open a link on their phone during class and it *just works*. No installs, no dev tools, no Mateo.

## Option A — PWA (recommended)

**How:** Static web app deployed to Vercel / Netlify / GitHub Pages. Uses the browser `DeviceMotionEvent` API for accelerometer + gyroscope. Model runs in-browser via TensorFlow.js or ONNX Runtime Web.

**Friction:** open URL → tap "enable motion" → tap "start." That's it.

**Pros**
- Zero install. No app store. No signing.
- One URL works on iOS (Safari) and Android (Chrome).
- Fully offline after first load (service worker cache) — resilient to classroom Wi-Fi.
- Model inference is client-side → no backend to keep alive on presentation day.
- Cross-device: same link works on Mateo's phone, teammates' phones, the projector laptop.

**Cons / gotchas**
- **iOS Safari requires a user gesture to request motion permission** via `DeviceMotionEvent.requestPermission()`. We need a visible "Enable sensors" button — cannot auto-request.
- **HTTPS required** for sensor access. Any real host gives us this; `localhost` also works for dev.
- Sensor sample rate varies by device (typically 50–100 Hz). We'll resample/window to match UCI HAR's 50 Hz.
- Axis orientation differs between iOS and Android → need a normalization step.

## Option B — Native app (React Native / Flutter / Swift / Kotlin)
- Higher fidelity sensors, background capability.
- **Rejected for demo:** iOS code signing + TestFlight is a nightmare to hand off to non-devs. Android sideloading is doable but still friction. Not worth it for a 10-minute demo.

## Option C — Expo Go
- Teammates install Expo Go, scan QR, load a JS bundle. Medium friction.
- **Rejected:** still requires an install, still requires Mateo's laptop or an Expo cloud build. PWA wins on every axis.

## Option D — Phone-as-sensor + laptop-as-brain
- Phone streams raw sensor data to a laptop via WebSocket; laptop runs the Python model and shows predictions on screen.
- **Rejected:** needs two devices, same network, a server process running. Fragile on a classroom network.

## Decision: Option A (PWA)

## Deployment plan (high-level, no code yet)
1. Train model in Python (offline). Export to TF.js or ONNX.
2. Static site: `index.html` + JS bundle + model files.
3. Host on Vercel (auto-deploy from GitHub). One URL, e.g. `har-demo.vercel.app`.
4. Send teammates the URL. They bookmark it or add it to home screen.
5. Rehearsal: have Tomas and Ethan each run through the demo once over video call a few days before.

## Failure-mode planning for demo day
- **Wi-Fi dies in classroom** → PWA is cached; still works offline.
- **Motion permission denied** → UI shows clear "enable sensors" instructions with screenshot.
- **Phone orientation wrong** → we calibrate on a "hold still" step at the start.
- **Model gives garbage** → ship with a pre-recorded video clip as backup.
- **One teammate's phone refuses** → the other teammate's phone is the backup; projector laptop can also mirror.
