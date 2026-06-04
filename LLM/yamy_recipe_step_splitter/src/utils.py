"""Shared helpers for dataset prep, inference, evaluation, and training."""

from __future__ import annotations

import json
import math
import random
import re
from pathlib import Path
from typing import Any, Iterable


def set_seed(seed: int) -> None:
    """Fix common random seeds for reproducible experiments."""
    random.seed(seed)
    try:
        import numpy as np

        np.random.seed(seed)
    except ImportError:
        pass

    try:
        import torch

        torch.manual_seed(seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(seed)
    except ImportError:
        pass


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    """Read a JSONL file. Missing files return an empty list with a message."""
    if not path.exists():
        print(f"[WARN] JSONL file not found: {path}")
        return []

    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as file:
        for line_no, line in enumerate(file, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                print(f"[WARN] Skipping invalid JSONL line {line_no} in {path}: {exc}")
    return rows


def write_jsonl(path: Path, rows: Iterable[dict[str, Any]]) -> None:
    """Write dictionaries as UTF-8 JSONL."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        for row in rows:
            file.write(json.dumps(make_json_safe(row), ensure_ascii=False, allow_nan=False) + "\n")


def make_json_safe(value: Any) -> Any:
    """Convert NaN/Infinity values to None so outputs remain strict JSON."""
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if isinstance(value, dict):
        return {key: make_json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [make_json_safe(item) for item in value]
    return value


def normalize_text(text: Any) -> str:
    """Simple normalization for loose Korean description comparison."""
    if text is None:
        return ""
    text = str(text).strip().lower()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"[\"'`“”‘’.,!?~…·ㆍ:;()\[\]{}]", "", text)
    return text


def _to_float(value: str) -> float | None:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _clean_number(value: str) -> str:
    return value.replace(",", "").strip()


def extract_timer_from_text(text: str) -> dict[str, Any]:
    """Extract the first timer expression from Korean cooking text.

    The model schema keeps only timer_minutes, so seconds are converted to
    fractional minutes. For example, "30초" becomes 0.5. For ranges such as
    "3~5분", the larger value is used because it is safer for cooking timers.
    """
    if not isinstance(text, str) or not text.strip():
        return {"timer_minutes": None, "raw_text": None, "unit": None}

    number = r"(\d+(?:\.\d+)?)"
    range_sep = r"\s*(?:~|-|–|—|에서|부터)\s*"
    prefix = r"(?:약|대략|총|최소|최대)?\s*"

    minute_pattern = re.compile(
        prefix + number + r"(?:" + range_sep + number + r")?\s*(?:분|분간|분\s*정도)",
        re.IGNORECASE,
    )
    second_pattern = re.compile(
        prefix + number + r"(?:" + range_sep + number + r")?\s*(?:초|초간|초\s*정도)",
        re.IGNORECASE,
    )

    minute_match = minute_pattern.search(text)
    second_match = second_pattern.search(text)

    matches: list[tuple[int, str, re.Match[str]]] = []
    if minute_match:
        matches.append((minute_match.start(), "minute", minute_match))
    if second_match:
        matches.append((second_match.start(), "second", second_match))

    if not matches:
        return {"timer_minutes": None, "raw_text": None, "unit": None}

    _, unit, match = sorted(matches, key=lambda item: item[0])[0]
    first = _to_float(_clean_number(match.group(1)))
    second = _to_float(_clean_number(match.group(2))) if match.lastindex and match.group(2) else None
    value = second if second is not None else first

    if value is None:
        return {"timer_minutes": None, "raw_text": match.group(0), "unit": unit}

    timer_minutes = value if unit == "minute" else value / 60.0
    return {
        "timer_minutes": round(timer_minutes, 3),
        "raw_text": match.group(0).strip(),
        "unit": unit,
    }


def seconds_to_minutes(value: Any) -> float | None:
    """Convert CSV timer_seconds values to minutes."""
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    text = str(value).strip()
    if not text or text.lower() == "nan":
        return None
    try:
        seconds = float(text)
        if math.isnan(seconds):
            return None
        return round(seconds / 60.0, 3)
    except ValueError:
        return None


def extract_json_text(text: str) -> str | None:
    """Extract the first balanced JSON object from noisy model output."""
    if not isinstance(text, str):
        return None

    start = text.find("{")
    if start == -1:
        return None

    depth = 0
    in_string = False
    escape = False
    for index in range(start, len(text)):
        char = text[index]
        if in_string:
            if escape:
                escape = False
            elif char == "\\":
                escape = True
            elif char == '"':
                in_string = False
            continue

        if char == '"':
            in_string = True
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return text[start : index + 1]
    return None


def parse_model_json(text: str) -> tuple[dict[str, Any] | None, str | None, str | None]:
    """Return parsed JSON, extracted JSON text, and parse error."""
    json_text = extract_json_text(text)
    if not json_text:
        return None, None, "No JSON object found"

    try:
        parsed = json.loads(json_text)
    except json.JSONDecodeError as exc:
        return None, json_text, str(exc)

    if not isinstance(parsed, dict):
        return None, json_text, "Parsed JSON is not an object"
    return parsed, json_text, None


def is_valid_step_schema(parsed: dict[str, Any] | None) -> bool:
    """Check the expected minimal schema: steps list with required fields."""
    if not isinstance(parsed, dict) or not isinstance(parsed.get("steps"), list):
        return False
    for step in parsed["steps"]:
        if not isinstance(step, dict):
            return False
        if "step" not in step or "description" not in step or "timer_minutes" not in step:
            return False
    return True
