# Open questions — decide before any code is written

Tag each with a proposed default so we can just confirm and move on.

## Scope
- **Q1. Which activities?** Proposed: the 6 UCI HAR classes (walking, upstairs, downstairs, sitting, standing, laying) + an "unknown" bucket. Drop "running" from the original proposal. → *Confirm?*
- **Q2. Ship RF in the browser or not?** Proposed: **no** — CNN only in the PWA, RF is report-only. → *Confirm?*
- **Q3. Handle phone position (pocket/hand/waist)?** Proposed: train on UCI (waist) and note pocket/hand as limitation. Don't try to solve it. → *Confirm?*

## Tech picks
- **Q4. TF.js or ONNX Runtime Web?** Proposed: **TF.js** — simpler Keras → browser path, better docs for our case. → *Confirm?*
- **Q5. Framework for the PWA?** Proposed: vanilla HTML/JS, no React. Keeps the static bundle tiny and easy to deploy. → *Confirm?*
- **Q6. Host?** Proposed: **Vercel** (free, auto-deploys from a GitHub push, HTTPS by default). → *Confirm?*
- **Q6b. Realtime relay for phone→viewer predictions?** Proposed: **Firebase Realtime DB** (free tier, open rules for the demo, ~10 lines of JS). One-time 5-min setup by Mateo. → *Confirm?*

## Demo logistics
- **Q6c. Hardware inventory — unblocks the mirroring plan.** What phones do Tomas and Ethan have? Does either own a MacBook on macOS 12+? Does the classroom have HDMI, Apple TV, or Chromecast? → *Answer determines Path A vs B vs C in screen-display.md.*
- **Q7. Who presents which part?** Need to divvy up slides + live demo role between Tomas and Ethan.
- **Q8. Rehearsal date?** Suggest a video call ~5 days before the presentation where both teammates run the PWA end-to-end on their phones while Mateo watches.
- **Q9. Backup plan if live demo fails?** Proposed: pre-recorded 60s video of the PWA running, ready on the slide deck.

## Report deliverables
- **Q10. What goes in the final writeup?** Proposed sections: intro + motivation, related work (brief), dataset, preprocessing, models, evaluation (numbers + confusion matrix), PWA deployment, limitations (phone-carry discussion), future work, conclusion.
- **Q11. Page/length target?** — unknown; check syllabus.

## Data
- **Q12. Do we collect any of our own data?** Proposed: optionally record ~30s of each activity on Mateo's phone via the PWA as a realism check. Not part of training.

## Timeline unknowns
- **Q13. When is the presentation?** Need the exact date to build milestones.md.
- **Q14. When is the report due?** Same.
