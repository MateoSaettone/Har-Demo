# Milestones

*Dates TBD — fill in once presentation / report deadlines are confirmed (see open-questions Q13, Q14).*

Work backwards from the presentation date. Call that day **D**.

## Phase 0 — decisions (this week)
- Confirm open-questions.md defaults.
- Lock the activity set, the model (CNN), and the host (Vercel).

## Phase 1 — training pipeline (D-21 → D-14)
- Load UCI HAR, verify split.
- Preprocessing: windowing, normalization, axis convention doc.
- Train RF baseline → log accuracy + confusion matrix.
- Train 1D CNN → log same metrics.
- Export CNN to TF.js. Save `preprocessing.json`.

## Phase 2 — PWA (D-14 → D-7)
- Static scaffold: index.html, permission flow, sensor capture, live chart.
- Wire up TF.js model + preprocessing parity.
- Deploy to Vercel, get the URL.
- Send URL to Tomas and Ethan; they load it on their phones.

## Phase 3 — rehearsal + report (D-7 → D-1)
- Full rehearsal over video call — both teammates run demo end-to-end.
- Record the 60s backup video.
- Write report: evaluation, limitations, phone-carry justification.
- Slides.

## Day-of checklist
- Phones charged.
- PWA opens offline (verify on airplane mode).
- Backup video on slide.
- Each teammate knows which activity they'll demo.
