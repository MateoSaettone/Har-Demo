"""
Train a 1D CNN for Human Activity Recognition on the UCI HAR dataset.

Outputs:
  artifacts/model.keras               (Keras model)
  artifacts/model.onnx                (ONNX model, used by the PWA via onnxruntime-web)
  artifacts/preprocessing.json        (per-channel mean/std + label map)
  artifacts/report.txt                (accuracy, per-class P/R, confusion matrix)

Run:
  python -m venv .venv && source .venv/bin/activate
  pip install -r requirements.txt
  python train.py
"""

from __future__ import annotations

import io
import json
import os
import sys
import zipfile
from pathlib import Path

import numpy as np
import requests
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
)

THIS_DIR = Path(__file__).resolve().parent
DATA_DIR = THIS_DIR / "data"
ARTIFACTS_DIR = THIS_DIR / "artifacts"
WEB_MODEL_DIR = THIS_DIR.parent / "web" / "model"

UCI_URL = (
    "https://archive.ics.uci.edu/ml/machine-learning-databases/"
    "00240/UCI%20HAR%20Dataset.zip"
)

# UCI HAR: 9 inertial signal channels per window (128 samples @ 50 Hz, 2.56 s).
CHANNELS = [
    "body_acc_x", "body_acc_y", "body_acc_z",
    "body_gyro_x", "body_gyro_y", "body_gyro_z",
    "total_acc_x", "total_acc_y", "total_acc_z",
]
WINDOW = 128

LABELS = [
    "WALKING",
    "WALKING_UPSTAIRS",
    "WALKING_DOWNSTAIRS",
    "SITTING",
    "STANDING",
    "LAYING",
]


def download_uci_har() -> Path:
    """Download + extract the UCI HAR Dataset if not already present."""
    target = DATA_DIR / "UCI HAR Dataset"
    if target.exists():
        return target
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Downloading UCI HAR Dataset from {UCI_URL} ...")
    r = requests.get(UCI_URL, timeout=300)
    r.raise_for_status()
    with zipfile.ZipFile(io.BytesIO(r.content)) as zf:
        zf.extractall(DATA_DIR)
    if not target.exists():
        raise RuntimeError(f"UCI HAR extraction did not produce {target}")
    return target


def load_split(root: Path, split: str) -> tuple[np.ndarray, np.ndarray]:
    """Load raw inertial signals for 'train' or 'test'. Returns (X, y).

    X shape: (n_windows, 128, 9)
    y shape: (n_windows,) with labels in [0, 5]
    """
    signals_dir = root / split / "Inertial Signals"
    arrays = []
    for ch in CHANNELS:
        fpath = signals_dir / f"{ch}_{split}.txt"
        arr = np.loadtxt(fpath)
        arrays.append(arr)
    X = np.stack(arrays, axis=-1).astype(np.float32)  # (n, 128, 9)
    y = np.loadtxt(root / split / f"y_{split}.txt").astype(np.int64) - 1
    return X, y


def compute_normalization(X: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Per-channel mean/std computed over train windows."""
    mean = X.reshape(-1, X.shape[-1]).mean(axis=0)
    std = X.reshape(-1, X.shape[-1]).std(axis=0)
    std = np.where(std < 1e-8, 1.0, std)
    return mean.astype(np.float32), std.astype(np.float32)


def build_cnn(input_shape: tuple[int, int], n_classes: int):
    """Small 1D CNN. ~120k params; fits easily in a browser."""
    import tensorflow as tf
    from tensorflow.keras import layers, models

    inp = layers.Input(shape=input_shape)
    x = layers.Conv1D(64, 5, padding="same", activation="relu")(inp)
    x = layers.MaxPooling1D(2)(x)
    x = layers.Conv1D(64, 5, padding="same", activation="relu")(x)
    x = layers.MaxPooling1D(2)(x)
    x = layers.Conv1D(64, 3, padding="same", activation="relu")(x)
    x = layers.GlobalAveragePooling1D()(x)
    x = layers.Dense(100, activation="relu")(x)
    x = layers.Dropout(0.3)(x)
    out = layers.Dense(n_classes, activation="softmax")(x)
    model = models.Model(inp, out)
    model.compile(
        optimizer=tf.keras.optimizers.Adam(1e-3),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def export_onnx(keras_model_path: Path, out_path: Path) -> None:
    """Convert the Keras model to ONNX. Uses tf2onnx's function converter."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    import tensorflow as tf
    import tf2onnx

    model = tf.keras.models.load_model(keras_model_path)
    input_signature = [
        tf.TensorSpec(model.inputs[0].shape, tf.float32, name="input")
    ]
    onnx_model, _ = tf2onnx.convert.from_keras(
        model, input_signature=input_signature, opset=17
    )
    out_path.write_bytes(onnx_model.SerializeToString())


def format_report(
    y_true: np.ndarray, y_pred: np.ndarray, labels: list[str]
) -> str:
    acc = accuracy_score(y_true, y_pred)
    cls = classification_report(
        y_true, y_pred, target_names=labels, digits=4
    )
    cm = confusion_matrix(y_true, y_pred)
    lines = [
        f"Accuracy: {acc:.4f}",
        "",
        "Per-class metrics:",
        cls,
        "Confusion matrix (rows=true, cols=pred):",
        "labels: " + ", ".join(labels),
        str(cm),
    ]
    return "\n".join(lines)


def main() -> int:
    ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    WEB_MODEL_DIR.mkdir(parents=True, exist_ok=True)

    root = download_uci_har()
    print(f"Dataset at: {root}")

    X_train, y_train = load_split(root, "train")
    X_test, y_test = load_split(root, "test")
    print(f"Train: {X_train.shape}  Test: {X_test.shape}")

    mean, std = compute_normalization(X_train)
    X_train_n = (X_train - mean) / std
    X_test_n = (X_test - mean) / std

    import tensorflow as tf

    tf.random.set_seed(42)
    np.random.seed(42)

    model = build_cnn((WINDOW, len(CHANNELS)), len(LABELS))
    model.summary()

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy", patience=5, restore_best_weights=True
        )
    ]
    model.fit(
        X_train_n, y_train,
        validation_split=0.1,
        epochs=30,
        batch_size=64,
        callbacks=callbacks,
        verbose=2,
    )

    y_pred_cnn = np.argmax(model.predict(X_test_n, verbose=0), axis=1)
    cnn_report = format_report(y_test, y_pred_cnn, LABELS)
    print("\n=== CNN ===")
    print(cnn_report)

    # RF baseline on flattened windows (simple + strong for report comparison).
    rf = RandomForestClassifier(
        n_estimators=200, random_state=42, n_jobs=-1
    )
    rf.fit(X_train_n.reshape(len(X_train_n), -1), y_train)
    y_pred_rf = rf.predict(X_test_n.reshape(len(X_test_n), -1))
    rf_report = format_report(y_test, y_pred_rf, LABELS)
    print("\n=== Random Forest (baseline) ===")
    print(rf_report)

    keras_path = ARTIFACTS_DIR / "model.keras"
    model.save(keras_path)
    print(f"Saved Keras model: {keras_path}")

    onnx_path = ARTIFACTS_DIR / "model.onnx"
    export_onnx(keras_path, onnx_path)
    print(f"Exported ONNX model: {onnx_path}")

    # Copy ONNX model into web/model/ so it's served by the static site.
    (WEB_MODEL_DIR / "model.onnx").write_bytes(onnx_path.read_bytes())
    print(f"Copied ONNX model to: {WEB_MODEL_DIR / 'model.onnx'}")

    preprocessing = {
        "window": WINDOW,
        "sample_rate_hz": 50,
        "channels": CHANNELS,
        "labels": LABELS,
        "mean": mean.tolist(),
        "std": std.tolist(),
        "input_conventions": {
            "acc_units": "g (divide m/s^2 by 9.80665)",
            "gyro_units": "rad/s (multiply deg/s by pi/180)",
            "channel_order": CHANNELS,
        },
    }
    (ARTIFACTS_DIR / "preprocessing.json").write_text(
        json.dumps(preprocessing, indent=2)
    )
    (WEB_MODEL_DIR / "preprocessing.json").write_text(
        json.dumps(preprocessing, indent=2)
    )
    print("Saved preprocessing.json")

    (ARTIFACTS_DIR / "report.txt").write_text(
        "=== CNN ===\n" + cnn_report + "\n\n=== Random Forest ===\n" + rf_report
    )
    print(f"Saved report: {ARTIFACTS_DIR / 'report.txt'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
