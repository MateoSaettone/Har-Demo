# HAR Demo — CIS4930

Smartphone-based Human Activity Recognition. Train a 1D CNN on the UCI HAR dataset, ship a single-page PWA that runs inference in the browser, and share predictions live between devices via Supabase Realtime Broadcast.

See [`docs/`](docs/) for the design docs.

## Repo layout

```
training/   Python pipeline (download UCI HAR, train CNN + RF, export to TF.js)
web/        Static PWA (HTML/CSS/ES modules, TF.js from CDN, Supabase from CDN)
docs/       Design + brainstorming notes
vercel.json Static hosting config
```

## Quick start

### 1. One-time Supabase setup (~2 minutes)

1. Create a Supabase project (free tier). https://supabase.com/dashboard
2. No schema, no tables — we use Realtime Broadcast only.
3. Copy the **Project URL** and **anon public key** from Project Settings → API.
4. Copy the config template and fill in your values:
   ```bash
   cp web/js/config.example.js web/js/config.js
   ```
   Edit `web/js/config.js` and paste your URL + anon key.

### 2. (Optional) Train the model

The PWA ships with a heuristic fallback (STATIONARY/MOVING) so it works end-to-end *before* the CNN is trained. To get the real 6-class model (requires Python 3.11 — TF 2.15 + tfjs 4.10 don't ship 3.12 wheels):

```bash
cd training
/opt/homebrew/bin/python3.11 -m venv .venv && source .venv/bin/activate  # brew install python@3.11 if needed
pip install -r requirements.txt
python train.py
```

This downloads UCI HAR, trains the CNN + RF baseline, and writes the TF.js model into `web/model/`. Next time you load the PWA it auto-detects the model and uses the CNN instead of the heuristic.

### 3. Run locally

Any static file server works. Sensor APIs require HTTPS *except* on `localhost`:

```bash
cd web
python3 -m http.server 8000
# open http://localhost:8000 on your laptop for testing
```

For phone testing you need HTTPS. Easiest: deploy to Vercel (below) and open the preview URL on your phone.

### 4. Deploy to Vercel

```bash
npm i -g vercel
cd web
vercel           # first time: link/create project
vercel --prod    # deploy
```

Vercel auto-detects the static site. `vercel.json` at the repo root sets the `Permissions-Policy` header for motion sensors.

## How the demo works

- **One URL.** All devices opening it join the same Supabase Broadcast channel.
- **Tracker role.** Any device that taps *Start tracking* grants motion permission, runs the CNN on-device (no data leaves the phone), and broadcasts `{label, confidence, ts}` at ~2 Hz.
- **Viewer role.** Any other device on the URL auto-shows the latest prediction in a huge readable label. That's the projector/laptop view while the phone is in a pocket.
- **Fallbacks.** If Supabase is unreachable, local tracking still works. If motion permission fails, the UI explains what to do. If the CNN isn't deployed yet, the heuristic classifier runs.

## Presentation day checklist

- [ ] Supabase config filled in, deployed to Vercel.
- [ ] Visit URL on presenter laptop (plugged into projector) — should show "WAITING".
- [ ] Teammate visits URL on phone, taps *Start tracking*, grants motion permission, pockets phone.
- [ ] Laptop should switch from "WAITING" to a live label.
- [ ] Backup: 60 s screen recording of a good run, embedded in slide deck.

## Permissions + quirks

- **iOS Safari** requires a user gesture to request `DeviceMotionEvent.requestPermission()` — we call it from the *Start tracking* button.
- **Wake Lock** is requested while tracking so the screen doesn't sleep in a pocket.
- **HTTPS required** for sensor access. `localhost` is exempt for dev.

## License / scope

Course project for CIS4930, Spring 2026. Not production software. Supabase anon key is public-safe (Broadcast only, no tables, no RLS) for the duration of the course.
