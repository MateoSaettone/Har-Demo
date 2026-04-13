# One URL, two roles — auto-detected

Simplest possible multi-device story: **one URL**. Whoever taps "Start tracking" becomes the broadcaster. Anyone else who opens that URL just sees live predictions. No codes, no QR, no pairing.

## UX flow

1. Teammate opens `https://har-demo.vercel.app` on their phone.
2. Page shows: **"Start tracking on this device"** button + big idle label.
3. Tap it → grants motion permission → phone runs the model locally → publishes predictions.
4. Presenter laptop (plugged into projector) opens the **same** URL.
5. Laptop detects an active broadcaster → switches to "viewer" view automatically, showing the huge live activity label.
6. Phone goes in pocket. Laptop-on-projector shows the live stream. Audience sees everything.

Anyone in the room can also open the URL on their own phone and watch — the demo is inherently multi-viewer.

## Infrastructure (minimal)

**Firebase Realtime Database.** One Firebase project, free Spark tier, open read/write rules for the demo.

- Phone writes: `/session/latest` ← `{activity, confidence, ts}` every ~0.5 s.
- Viewers subscribe to `/session/latest` and render the latest value.
- If `/session/latest` hasn't been updated in >3 s → UI shows "waiting for a tracker…" and the "Start tracking" button comes back.

Total client code: ~10 lines each side. No backend, no server, no account creation for teammates or audience.

## Why Firebase RTDB (vs. alternatives)
- **Free tier, no credit card.** Enough headroom for many demos.
- **One SDK, two calls** (`set` and `onValue`). Nothing else to learn.
- **WebSocket over 443** — traverses classroom firewalls the same way a normal https site does.
- Alternatives considered and rejected:
  - Supabase Realtime — also fine, slightly more setup.
  - Ably / Pusher — free tiers exist, more SDK overhead.
  - Public MQTT brokers (no account) — unreliable, anyone can snoop the topic.
  - WebRTC peer-to-peer — needs signaling anyway and NAT traversal is flaky.

## One-time setup (Mateo, ~5 min)
1. Create a Firebase project.
2. Enable Realtime Database, pick a region.
3. Set rules to `{"rules": {".read": true, ".write": true}}` for the duration of the demo (open; it's a short-lived anonymous channel).
4. Copy the web config object into the PWA.

That's the entire backend story. The config ships in the JS bundle — no secrets to manage.

## Trade-offs to be aware of
- **Needs internet at demo time.** If the classroom Wi-Fi is locked down, the tracking phone uses LTE instead (viewer stays on Wi-Fi). Both paths hit Firebase.
- **One tracker at a time** (by design — "last writer wins" on the shared path). Fine for a presentation.
- **Open rules are not production-safe** — we'll disable the project after the course. No PII in the payload anyway (just an activity label and a confidence number).

## Fallbacks (in priority order)
1. If classroom Wi-Fi blocks Firebase → tracking phone switches to LTE. Viewers still on Wi-Fi. Works.
2. If internet is totally unavailable → screen-mirror the phone to the projector (AirPlay to a Mac, or USB-C→HDMI on Android). The PWA still runs locally; we just skip the viewer mode.
3. If everything explodes → 60 s pre-recorded video in the slide deck.

## What the viewer displays
- Huge activity label, centered.
- Confidence bar.
- Tiny "(via tracker: phone #1, 180 ms latency)" footer — helps prove it's live.
- A faint rolling 30 s strip of past predictions so transitions (stand → walk → sit) are visible as they happen.

## What the tracker displays
- Same huge label (so it works as a solo demo too, without a viewer).
- "Stop tracking" button.
