"""Create human-readable examples comparing gold steps and model predictions."""

from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

from config import (
    BASELINE_PREDICTIONS_PATH,
    EXAMPLE_COMPARISON_PATH,
    EXAMPLE_SAMPLE_SIZE,
    LORA_PREDICTIONS_PATH,
    OUTPUT_DIR,
    TEST_JSONL_PATH,
)
from utils import read_jsonl


def get_steps(obj: dict[str, Any] | None) -> list[dict[str, Any]]:
    if not isinstance(obj, dict):
        return []
    steps = obj.get("steps")
    return steps if isinstance(steps, list) else []


def select_predictions_path() -> Path | None:
    if LORA_PREDICTIONS_PATH.exists():
        return LORA_PREDICTIONS_PATH
    if BASELINE_PREDICTIONS_PATH.exists():
        return BASELINE_PREDICTIONS_PATH
    return None


def format_step_line(step: dict[str, Any]) -> str:
    timer = step.get("timer_minutes")
    timer_text = "null" if timer is None else str(timer)
    return f"{step.get('step')}. {step.get('description', '')}  `[timer_minutes={timer_text}]`"


def build_markdown(prediction_rows: list[dict[str, Any]], gold_rows: list[dict[str, Any]], predictions_path: Path) -> str:
    gold_by_id = {str(row.get("recipe_id")): row for row in gold_rows}
    lines: list[str] = []
    lines.append("# Recipe Step Splitter Examples")
    lines.append("")
    lines.append(f"- Predictions: `{predictions_path}`")
    lines.append(f"- Samples shown: `{min(EXAMPLE_SAMPLE_SIZE, len(prediction_rows))}`")
    lines.append("")

    for index, pred_row in enumerate(prediction_rows[:EXAMPLE_SAMPLE_SIZE], start=1):
        recipe_id = str(pred_row.get("recipe_id"))
        gold_row = gold_by_id.get(recipe_id) or pred_row
        gold_json = gold_row.get("target_json") or pred_row.get("gold_json")
        pred_json = pred_row.get("pred_json")
        gold_steps = get_steps(gold_json)
        pred_steps = get_steps(pred_json)
        input_text = gold_row.get("input_text") or pred_row.get("input_text") or ""

        lines.append(f"## Example {index}: recipe_id={recipe_id}")
        lines.append("")
        lines.append("### 1. Original Step Labels")
        lines.append("")
        for step in gold_steps:
            lines.append(f"- {format_step_line(step)}")
        lines.append("")
        lines.append("### 2. Joined Input Text")
        lines.append("")
        lines.append(input_text)
        lines.append("")
        lines.append("### 3. Model Split Output")
        lines.append("")
        if pred_steps:
            for step in pred_steps:
                lines.append(f"- {format_step_line(step)}")
        else:
            lines.append("- JSON parse failed or no steps were produced.")
        lines.append("")
        lines.append("### 4. Quick Comparison")
        lines.append("")
        lines.append(f"- Gold step count: `{len(gold_steps)}`")
        lines.append(f"- Pred step count: `{len(pred_steps)}`")
        lines.append(f"- Step count diff: `{abs(len(gold_steps) - len(pred_steps))}`")
        lines.append("")

    return "\n".join(lines)


def main() -> int:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    predictions_path = select_predictions_path()
    if predictions_path is None:
        print("[ERROR] No prediction file found.")
        print("[INFO] Run python src/infer_lora.py or python src/infer_baseline.py first.")
        return 1

    prediction_rows = read_jsonl(predictions_path)
    gold_rows = read_jsonl(TEST_JSONL_PATH)
    if not prediction_rows:
        print(f"[ERROR] Prediction file is empty: {predictions_path}")
        return 1

    markdown = build_markdown(prediction_rows, gold_rows, predictions_path)
    EXAMPLE_COMPARISON_PATH.write_text(markdown, encoding="utf-8")

    print(f"[OK] Saved example comparison: {EXAMPLE_COMPARISON_PATH}")
    print("\n".join(markdown.splitlines()[:80]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
