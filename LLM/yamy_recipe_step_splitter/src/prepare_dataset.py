"""Prepare recipe step-splitting JSONL datasets from a CSV file."""

from __future__ import annotations

import json
import random
import sys
from pathlib import Path
from typing import Any

import pandas as pd

try:
    from sklearn.model_selection import train_test_split
except ImportError:
    train_test_split = None

try:
    from datasets import Dataset, DatasetDict
except ImportError:
    Dataset = None
    DatasetDict = None

from config import (
    CSV_PATH,
    DATA_DIR,
    RANDOM_SEED,
    RECIPE_ID_COL,
    STEP_NO_COL,
    STEP_TEXT_COL,
    TEST_JSONL_PATH,
    TEST_RATIO,
    HF_DATASET_DIR,
    TIMER_SECONDS_COL,
    TRAIN_JSONL_PATH,
    TRAIN_RATIO,
    VALID_JSONL_PATH,
    VALID_RATIO,
)
from utils import seconds_to_minutes, set_seed, write_jsonl


def validate_split_ratios() -> None:
    total = TRAIN_RATIO + VALID_RATIO + TEST_RATIO
    if abs(total - 1.0) > 1e-6:
        raise ValueError(f"Split ratios must sum to 1.0, got {total}")


def load_csv(path: Path) -> pd.DataFrame | None:
    if not path.exists():
        print(f"[ERROR] CSV file not found: {path}")
        return None

    try:
        return pd.read_csv(path)
    except Exception as exc:
        print(f"[ERROR] Failed to read CSV: {exc}")
        return None


def validate_columns(df: pd.DataFrame) -> bool:
    required = [RECIPE_ID_COL, STEP_NO_COL, STEP_TEXT_COL]
    missing = [column for column in required if column not in df.columns]
    if not missing:
        return True

    print(f"[ERROR] Missing required CSV columns: {missing}")
    print(f"[INFO] Available columns: {list(df.columns)}")
    print("[INFO] Edit src/config.py to match your CSV column names.")
    return False


def make_input_text(step_texts: list[str]) -> str:
    """Join existing step descriptions into one free-form cooking paragraph."""
    cleaned = [text.strip() for text in step_texts if isinstance(text, str) and text.strip()]
    return " ".join(cleaned)


def choose_timer(row: pd.Series) -> tuple[float | None, dict[str, Any]]:
    """Use only the timer column as the label source.

    We intentionally do not extract timers from free-form text here. If
    TIMER_SECONDS_COL is empty or missing, timer_minutes stays null even when
    the description contains text such as "5분" or "30초".
    """
    csv_minutes = None
    if TIMER_SECONDS_COL in row.index:
        csv_minutes = seconds_to_minutes(row.get(TIMER_SECONDS_COL))

    meta = {
        "csv_timer_minutes": csv_minutes,
        "source": "csv_timer_seconds" if csv_minutes is not None else None,
    }
    return csv_minutes, meta


def build_recipe_record(recipe_id: Any, group: pd.DataFrame) -> dict[str, Any]:
    group = group.copy()
    group[STEP_NO_COL] = pd.to_numeric(group[STEP_NO_COL], errors="coerce")
    group = group.sort_values(STEP_NO_COL, kind="stable")

    step_texts = group[STEP_TEXT_COL].fillna("").astype(str).tolist()
    steps = []
    timer_meta = []

    for output_step_no, (_, row) in enumerate(group.iterrows(), start=1):
        description = str(row.get(STEP_TEXT_COL, "")).strip()
        timer_minutes, meta = choose_timer(row)

        steps.append(
            {
                "step": output_step_no,
                "description": description,
                "timer_minutes": timer_minutes,
            }
        )
        timer_meta.append({"step": output_step_no, **meta})

    return {
        "recipe_id": str(recipe_id),
        "input_text": make_input_text(step_texts),
        "target_json": {"steps": steps},
        "timer_meta": timer_meta,
    }


def split_records(records: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[dict[str, Any]]]:
    """Split by recipe record, not by individual step."""
    if len(records) < 3:
        print("[WARN] Very small dataset. Writing all rows to train and leaving valid/test empty.")
        return records, [], []

    if train_test_split is None:
        print("[WARN] scikit-learn is not installed. Using a simple deterministic split fallback.")
        shuffled = records[:]
        random.Random(RANDOM_SEED).shuffle(shuffled)
        train_end = int(len(shuffled) * TRAIN_RATIO)
        valid_end = train_end + int(len(shuffled) * VALID_RATIO)
        return shuffled[:train_end], shuffled[train_end:valid_end], shuffled[valid_end:]

    train_records, temp_records = train_test_split(
        records,
        test_size=VALID_RATIO + TEST_RATIO,
        random_state=RANDOM_SEED,
        shuffle=True,
    )

    relative_test_ratio = TEST_RATIO / (VALID_RATIO + TEST_RATIO)
    valid_records, test_records = train_test_split(
        temp_records,
        test_size=relative_test_ratio,
        random_state=RANDOM_SEED,
        shuffle=True,
    )
    return train_records, valid_records, test_records


def save_hf_dataset(
    train_records: list[dict[str, Any]],
    valid_records: list[dict[str, Any]],
    test_records: list[dict[str, Any]],
) -> None:
    """Save a Hugging Face DatasetDict when the datasets package is installed."""
    if Dataset is None or DatasetDict is None:
        print("[WARN] datasets is not installed. Skipping Hugging Face DatasetDict save.")
        return

    dataset_dict = DatasetDict(
        {
            "train": Dataset.from_list(train_records),
            "valid": Dataset.from_list(valid_records),
            "test": Dataset.from_list(test_records),
        }
    )
    dataset_dict.save_to_disk(str(HF_DATASET_DIR))
    print(f"[OK] Saved Hugging Face DatasetDict: {HF_DATASET_DIR}")


def main() -> int:
    validate_split_ratios()
    set_seed(RANDOM_SEED)
    DATA_DIR.mkdir(parents=True, exist_ok=True)

    df = load_csv(CSV_PATH)
    if df is None or not validate_columns(df):
        return 1

    records = [
        build_recipe_record(recipe_id, group)
        for recipe_id, group in df.groupby(RECIPE_ID_COL, sort=False)
    ]
    records = [record for record in records if record["input_text"] and record["target_json"]["steps"]]

    train_records, valid_records, test_records = split_records(records)
    write_jsonl(TRAIN_JSONL_PATH, train_records)
    write_jsonl(VALID_JSONL_PATH, valid_records)
    write_jsonl(TEST_JSONL_PATH, test_records)
    save_hf_dataset(train_records, valid_records, test_records)

    print(f"[OK] Recipes: {len(records)}")
    print(f"[OK] Train/valid/test: {len(train_records)}/{len(valid_records)}/{len(test_records)}")
    print(f"[OK] Saved: {TRAIN_JSONL_PATH}")
    print(f"[OK] Saved: {VALID_JSONL_PATH}")
    print(f"[OK] Saved: {TEST_JSONL_PATH}")

    print("\n[Sample records]")
    for sample in records[:3]:
        preview = {
            "recipe_id": sample["recipe_id"],
            "input_text": sample["input_text"][:180] + ("..." if len(sample["input_text"]) > 180 else ""),
            "target_json": sample["target_json"],
            "timer_meta": sample["timer_meta"][:3],
        }
        print(json.dumps(preview, ensure_ascii=False, indent=2))

    return 0


if __name__ == "__main__":
    sys.exit(main())
