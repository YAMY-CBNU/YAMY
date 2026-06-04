"""Evaluate JSON validity, step count, timer extraction, and exact matches."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from config import BASELINE_PREDICTIONS_PATH, EVAL_RESULT_PATH, OUTPUT_DIR, TEST_JSONL_PATH
from utils import is_valid_step_schema, normalize_text, parse_model_json, read_jsonl


def get_steps(obj: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not isinstance(obj, dict):
        return []
    steps = obj.get("steps")
    return steps if isinstance(steps, list) else []


def coerce_number(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def timers_equal(pred: Any, gold: Any, tolerance: float = 0.01) -> bool:
    pred_num = coerce_number(pred)
    gold_num = coerce_number(gold)
    if pred_num is None and gold_num is None:
        return True
    if pred_num is None or gold_num is None:
        return False
    return abs(pred_num - gold_num) <= tolerance


def load_prediction_json(row: dict[str, Any]) -> tuple[dict[str, Any] | None, bool]:
    if isinstance(row.get("pred_json"), dict):
        return row["pred_json"], True

    raw = row.get("raw_output") or row.get("extracted_json") or ""
    parsed, _, _ = parse_model_json(raw)
    return parsed, parsed is not None


def evaluate_rows(prediction_rows: list[dict[str, Any]], gold_rows: list[dict[str, Any]]) -> dict[str, Any]:
    gold_by_id = {str(row.get("recipe_id")): row for row in gold_rows}

    parse_success = 0
    valid_schema = 0
    step_count_correct = 0
    step_count_diffs: list[int] = []
    timer_correct = 0
    timer_total = 0
    exact_match = 0
    normalized_match = 0
    compared = 0
    parse_failures: list[dict[str, Any]] = []

    for pred_row in prediction_rows:
        recipe_id = str(pred_row.get("recipe_id"))
        gold_row = pred_row if pred_row.get("gold_json") else gold_by_id.get(recipe_id)
        gold_json = gold_row.get("gold_json") or gold_row.get("target_json") if gold_row else None
        pred_json, parsed_ok = load_prediction_json(pred_row)

        compared += 1
        if parsed_ok:
            parse_success += 1
        else:
            parse_failures.append({"recipe_id": recipe_id, "raw_output": str(pred_row.get("raw_output", ""))[:500]})

        if is_valid_step_schema(pred_json):
            valid_schema += 1

        pred_steps = get_steps(pred_json)
        gold_steps = get_steps(gold_json)
        if len(pred_steps) == len(gold_steps):
            step_count_correct += 1
        step_count_diffs.append(abs(len(pred_steps) - len(gold_steps)))

        for pred_step, gold_step in zip(pred_steps, gold_steps):
            timer_total += 1
            if timers_equal(pred_step.get("timer_minutes"), gold_step.get("timer_minutes")):
                timer_correct += 1

            pred_desc = pred_step.get("description")
            gold_desc = gold_step.get("description")
            if pred_desc == gold_desc:
                exact_match += 1
            if normalize_text(pred_desc) == normalize_text(gold_desc):
                normalized_match += 1

    avg_step_count_diff = sum(step_count_diffs) / len(step_count_diffs) if step_count_diffs else 0.0
    return {
        "num_predictions": compared,
        "json_parse_success_rate": parse_success / compared if compared else 0.0,
        "valid_schema_rate": valid_schema / compared if compared else 0.0,
        "step_count_accuracy": step_count_correct / compared if compared else 0.0,
        "average_step_count_diff": avg_step_count_diff,
        "timer_minutes_accuracy": timer_correct / timer_total if timer_total else 0.0,
        "description_exact_match_rate": exact_match / timer_total if timer_total else 0.0,
        "description_normalized_match_rate": normalized_match / timer_total if timer_total else 0.0,
        "timer_comparison_count": timer_total,
        "parse_failures_sample": parse_failures[:5],
    }


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if not BASELINE_PREDICTIONS_PATH.exists():
        print(f"[WARN] Predictions file not found: {BASELINE_PREDICTIONS_PATH}")
        print("[INFO] Run baseline inference first: python src/infer_baseline.py")
        return 0

    prediction_rows = read_jsonl(BASELINE_PREDICTIONS_PATH)
    gold_rows = read_jsonl(TEST_JSONL_PATH)
    if not prediction_rows:
        print("[WARN] No predictions to evaluate.")
        return 0

    result = evaluate_rows(prediction_rows, gold_rows)
    print(json.dumps(result, ensure_ascii=False, indent=2))

    EVAL_RESULT_PATH.parent.mkdir(parents=True, exist_ok=True)
    EVAL_RESULT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[OK] Saved evaluation result: {EVAL_RESULT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
