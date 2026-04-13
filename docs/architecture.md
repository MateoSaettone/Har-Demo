# Architecture

Two separable pipelines: offline **training** (Python, Mateo's laptop) and online **inference** (in-browser, teammate's phone).

## Offline training pipeline
```
UCI HAR raw   →  preprocessing   →  feature extraction  →  model training  →  export
(accel, gyro)    (window, filter,     (time + freq, or       (RF + CNN)       (TF.js /
                  normalize, split)    raw windows for CNN)                    ONNX Web)
```

Artifacts produced:
- `model.json` + weights (TF.js) or `model.onnx` (ONNX Runtime Web)
- `preprocessing.json` — means, stds, window size, axis mapping (so the phone replicates training preprocessing exactly)
- Evaluation report: accuracy, per-class P/R, confusion matrix

## Runtime pipeline (phone, in-browser)
```
DeviceMotion  →  buffer (sliding window)  →  normalize  →  model.predict  →  UI label + confidence
(50–100 Hz)      (2.56s @ 50 Hz = 128 samples, matching UCI HAR)
```

Key idea: the browser reproduces the *exact* preprocessing used during training, using the constants from `preprocessing.json`. Any drift here destroys accuracy.

## Train/infer parity — the thing most likely to bite us
- **Sample rate:** UCI HAR is 50 Hz. Browser sensors come in at variable rates. We resample.
- **Axis convention:** UCI HAR used a Galaxy S II on the waist. iOS/Android report different axis orientations. We define a canonical frame and rotate into it.
- **Gravity:** UCI HAR separated "total acc" and "body acc." We either replicate that split (high-pass filter) or train on total acc only and skip the split.
- **Units:** confirm m/s² vs g. Some browsers report g.

## Component sketch
- `training/` — Python, Jupyter notebook, scikit-learn, TF/Keras
- `web/` — static PWA (vanilla JS or a minimal framework), TF.js or ORT Web
- `web/model/` — exported model + `preprocessing.json`
- `docs/` — this folder

## What we are explicitly NOT building
- No user accounts.
- No backend / database.
- No activity logging across sessions (unless trivial via localStorage).
- No smartwatch integration (note it as future work).
