"""Run inference with the fine-tuned LoRA adapter."""

from __future__ import annotations

import json
import sys
from typing import Any

import torch
from peft import PeftModel
from tqdm import tqdm
from transformers import AutoModelForCausalLM, AutoTokenizer

from config import (
    LORA_INFERENCE_MODE,
    LORA_OUTPUT_DIR,
    LORA_PREDICTIONS_PATH,
    LORA_SAMPLE_SIZE,
    MAX_NEW_TOKENS,
    MODEL_NAME,
    OUTPUT_DIR,
    RANDOM_SEED,
    TEMPERATURE,
    TEST_JSONL_PATH,
    TOP_P,
)
from prompt import build_messages
from utils import parse_model_json, read_jsonl, set_seed, write_jsonl


def load_lora_model_and_tokenizer() -> tuple[Any, Any, torch.device]:
    """Load the base model and attach the trained LoRA adapter."""
    if not LORA_OUTPUT_DIR.exists():
        raise FileNotFoundError(f"LoRA adapter not found: {LORA_OUTPUT_DIR}. Run python src/train_lora.py first.")

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    dtype = torch.float16 if device.type == "cuda" else torch.float32

    print(f"[INFO] Loading base model: {MODEL_NAME}")
    print(f"[INFO] Loading LoRA adapter: {LORA_OUTPUT_DIR}")
    print(f"[INFO] Device: {device}")

    # Prefer the tokenizer saved with the adapter, because train_lora.py stores
    # it next to the LoRA weights.
    tokenizer = AutoTokenizer.from_pretrained(LORA_OUTPUT_DIR, trust_remote_code=True)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token

    base_model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        torch_dtype=dtype,
        trust_remote_code=True,
    )
    model = PeftModel.from_pretrained(base_model, LORA_OUTPUT_DIR)
    model.to(device)
    model.eval()
    return tokenizer, model, device


def build_prompt_text(tokenizer: Any, input_text: str) -> str:
    messages = build_messages(input_text, mode=LORA_INFERENCE_MODE)
    if getattr(tokenizer, "chat_template", None):
        return tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    return "\n\n".join(f"{message['role'].upper()}:\n{message['content']}" for message in messages) + "\n\nASSISTANT:\n"


def generate_one(tokenizer: Any, model: Any, device: torch.device, input_text: str) -> str:
    prompt_text = build_prompt_text(tokenizer, input_text)
    inputs = tokenizer(prompt_text, return_tensors="pt").to(device)

    do_sample = TEMPERATURE > 0
    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=MAX_NEW_TOKENS,
            do_sample=do_sample,
            temperature=TEMPERATURE if do_sample else None,
            top_p=TOP_P if do_sample else None,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    generated_ids = output_ids[0][inputs["input_ids"].shape[-1] :]
    return tokenizer.decode(generated_ids, skip_special_tokens=True).strip()


def main() -> int:
    set_seed(RANDOM_SEED)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    test_rows = read_jsonl(TEST_JSONL_PATH)
    if not test_rows:
        print("[ERROR] No test data found. Run: python src/prepare_dataset.py")
        return 1

    sample_rows = test_rows[:LORA_SAMPLE_SIZE]

    try:
        tokenizer, model, device = load_lora_model_and_tokenizer()
    except Exception as exc:
        print(f"[ERROR] Failed to load LoRA model/tokenizer: {exc}")
        return 1

    predictions: list[dict[str, Any]] = []
    for row in tqdm(sample_rows, desc="LoRA inference"):
        raw_output = generate_one(tokenizer, model, device, row["input_text"])
        parsed_json, extracted_json, parse_error = parse_model_json(raw_output)

        result = {
            "recipe_id": row.get("recipe_id"),
            "input_text": row.get("input_text"),
            "gold_json": row.get("target_json"),
            "raw_output": raw_output,
            "extracted_json": extracted_json,
            "pred_json": parsed_json,
            "parse_success": parsed_json is not None,
            "parse_error": parse_error,
            "model_type": "lora",
            "adapter_path": str(LORA_OUTPUT_DIR),
        }
        predictions.append(result)

        print("\n[LoRA prediction sample]")
        print(json.dumps(result, ensure_ascii=False, indent=2)[:2000])

    write_jsonl(LORA_PREDICTIONS_PATH, predictions)
    print(f"[OK] Saved LoRA predictions: {LORA_PREDICTIONS_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
