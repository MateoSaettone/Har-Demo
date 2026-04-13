# Dataset and models

## UCI HAR — key facts to pin down
- 30 subjects, Samsung Galaxy S II worn on the waist.
- 6 activities: walking, walking upstairs, walking downstairs, sitting, standing, laying.
- Sensors: 3-axis accel + 3-axis gyro at **50 Hz**.
- Windows: **2.56 s, 50% overlap** → 128 samples/window.
- Pre-split into train/test (by subject), which we will respect.
- Comes in two flavors: raw inertial signals *and* a 561-feature engineered table. We'll use both — features for RF, raw windows for CNN.

## Activity set we'll demo
UCI's 6 activities + an "unknown/idle" fallback. "Running" is **not** in UCI HAR — our proposal mentioned it, so we either:
- drop running from the demo (cleanest), or
- augment with a small self-collected running dataset (risky, extra work).

**Proposed decision:** drop running, replace with "laying" (UCI native). Document this in the report.

## Models to compare
1. **Random Forest** on the 561 engineered features. Fast, strong baseline, easy to explain in the report. Target: ~92–95% on UCI test.
2. **1D CNN** on raw windows (128 × 6). Target: ~93–95%. Keras → TF.js export path is smooth.

Optional stretch:
3. **LSTM** or **CNN-LSTM** — only if time allows. Probably skip; diminishing returns for the grade.

## Why these two (for the report)
- Tradeoff framing: classical ML with handcrafted features vs. deep model that learns features. The whole point of comparing is to show the complexity/accuracy tradeoff, which is what the proposal promised.

## Export path
- CNN → TF.js via `tensorflowjs_converter`. Straightforward.
- Random Forest → trickier in-browser. Options: (a) `sklearn-porter` / `m2cgen` to emit JS, (b) ONNX via `skl2onnx` + ORT Web, (c) just don't ship RF to the phone — keep it as a report-only baseline and ship only the CNN in the PWA.

**Proposed decision:** ship **CNN only** in the PWA. Report includes RF as a paper comparison. Saves engineering time, avoids an awkward JS port.

## Evaluation (per proposal commitment)
- Accuracy on UCI test split.
- Per-class precision / recall / F1.
- Confusion matrix (figure in report).
- Plus: a *realism* check — have Mateo record ~30s of each activity on his own phone via the PWA's logging mode and report how well the model holds up off-dataset. This directly addresses the "does it work in the wild" question.
