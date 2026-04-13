# HAR Project — Docs Index

Brainstorming space for the CIS4930 HAR project. No code yet — planning and alignment first.

## Project at a glance
Smartphone-based Human Activity Recognition (HAR) using accelerometer + gyroscope. Train on UCI HAR dataset. Classify: walking, running, sitting, standing, stairs up/down (and idle/unknown).

## Hard constraints shaping every decision
1. **Mateo will not be at the presentation.** Teammates (Tomas, Ethan) must be able to run a live demo from their own phones with near-zero setup friction.
2. **No extra hardware** — phone only.
3. **Feedback from Yili Ren:** must justify the "user always carries phone" assumption in the report/presentation.

## Docs
- [delivery.md](delivery.md) — how teammates run the demo without friction (PWA vs native vs Expo)
- [screen-display.md](screen-display.md) — showing predictions on the projector while the phone is in a pocket
- [architecture.md](architecture.md) — training pipeline, model export, runtime
- [dataset-and-models.md](dataset-and-models.md) — UCI HAR details, preprocessing, model choices
- [phone-carry-justification.md](phone-carry-justification.md) — response to the feedback critique
- [open-questions.md](open-questions.md) — decisions still to make
- [milestones.md](milestones.md) — rough timeline to presentation

## Working assumption (to challenge or confirm)
**Single URL, two auto-detected roles.** Teammate opens the URL on their phone and taps "Start tracking" — that device becomes the broadcaster, runs the model locally, and publishes predictions. The presenter laptop (on the projector) opens the same URL and auto-joins as a viewer, showing a huge live activity label to the audience. Phone goes in pocket.

Infra: one Firebase Realtime DB project (one-time 5-min setup by Mateo, free tier). ~10 lines of JS glue. No backend code, no accounts, no pairing codes.

## Principle: turnkey over clever
Every piece of infra we add is something that can fail on somebody else's phone in front of a classroom. When in doubt, cut it.
