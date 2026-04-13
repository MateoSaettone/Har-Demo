# Training

Trains a 1D CNN (and an RF baseline for the report) on the UCI HAR dataset.

## Run

Requires **Python 3.11** (TF 2.15 + tensorflowjs 4.10 do not have wheels for 3.12+). On macOS: `brew install python@3.11`.

```bash
cd training
/opt/homebrew/bin/python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python train.py
```

Takes a few minutes on CPU. Downloads the UCI HAR zip the first time.

## Outputs

- `artifacts/model.keras` — Keras model
- `artifacts/tfjs_model/` — TF.js model (auto-copied into `../web/model/`)
- `artifacts/preprocessing.json` — per-channel mean/std + label map (auto-copied into `../web/model/`)
- `artifacts/report.txt` — CNN + RF accuracy, per-class P/R, confusion matrix (use this for the report)

## What the script does

1. Downloads UCI HAR, loads the 9-channel raw inertial signals (128 samples @ 50 Hz).
2. Computes per-channel mean/std from the train split.
3. Trains a small 1D CNN (Conv → Pool → Conv → Pool → Conv → GAP → Dense → Softmax).
4. Evaluates on the held-out test subjects.
5. Trains a Random Forest on flattened windows for report comparison.
6. Exports the CNN to TF.js and writes `preprocessing.json` so the PWA can replicate preprocessing exactly.
