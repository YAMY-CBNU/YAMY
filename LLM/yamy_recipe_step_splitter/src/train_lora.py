"""LoRA/QLoRA supervised fine-tuning for recipe step splitting."""

from __future__ import annotations

import sys
from typing import Any

import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig, TrainingArguments
from trl import SFTTrainer

from config import (
    BATCH_SIZE,
    GRADIENT_ACCUMULATION_STEPS,
    LEARNING_RATE,
    LOGGING_STEPS,
    LORA_ALPHA,
    LORA_DROPOUT,
    LORA_OUTPUT_DIR,
    LORA_R,
    LORA_TARGET_MODULES,
    MAX_LENGTH,
    MODEL_NAME,
    RANDOM_SEED,
    SAVE_STEPS,
    TRAIN_EPOCHS,
    TRAIN_JSONL_PATH,
    USE_4BIT,
    VALID_JSONL_PATH,
)
from prompt import format_training_text
from utils import read_jsonl, set_seed


def load_training_rows() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    train_rows = read_jsonl(TRAIN_JSONL_PATH)
    valid_rows = read_jsonl(VALID_JSONL_PATH)
    if not train_rows:
        raise FileNotFoundError("No training rows found. Run: python src/prepare_dataset.py")
    return train_rows, valid_rows


def load_model_and_tokenizer() -> tuple[Any, Any]:
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
    if tokenizer.pad_token_id is None:
        tokenizer.pad_token = tokenizer.eos_token

    quantization_config = None
    if USE_4BIT:
        quantization_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_use_double_quant=True,
        )

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_NAME,
        trust_remote_code=True,
        torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
        device_map="auto" if torch.cuda.is_available() else None,
        quantization_config=quantization_config,
    )

    if USE_4BIT:
        model = prepare_model_for_kbit_training(model)

    return tokenizer, model


def make_dataset(rows: list[dict[str, Any]], tokenizer: Any) -> Dataset:
    texts = [
        format_training_text(tokenizer, row["input_text"], row["target_json"])
        for row in rows
        if row.get("input_text") and row.get("target_json")
    ]
    return Dataset.from_dict({"text": texts})


def main() -> int:
    set_seed(RANDOM_SEED)

    try:
        train_rows, valid_rows = load_training_rows()
        tokenizer, model = load_model_and_tokenizer()
    except Exception as exc:
        print(f"[ERROR] Failed to initialize training: {exc}")
        print("[INFO] On Windows, keep USE_4BIT=False unless bitsandbytes works in your environment.")
        return 1

    train_dataset = make_dataset(train_rows, tokenizer)
    eval_dataset = make_dataset(valid_rows, tokenizer) if valid_rows else None

    lora_config = LoraConfig(
        r=LORA_R,
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        target_modules=LORA_TARGET_MODULES,
        bias="none",
        task_type="CAUSAL_LM",
    )
    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    training_args = TrainingArguments(
        output_dir=str(LORA_OUTPUT_DIR),
        num_train_epochs=TRAIN_EPOCHS,
        per_device_train_batch_size=BATCH_SIZE,
        per_device_eval_batch_size=BATCH_SIZE,
        gradient_accumulation_steps=GRADIENT_ACCUMULATION_STEPS,
        learning_rate=LEARNING_RATE,
        logging_steps=LOGGING_STEPS,
        save_steps=SAVE_STEPS,
        save_total_limit=2,
        evaluation_strategy="steps" if eval_dataset is not None else "no",
        eval_steps=SAVE_STEPS if eval_dataset is not None else None,
        fp16=torch.cuda.is_available() and not USE_4BIT,
        bf16=False,
        report_to="none",
        seed=RANDOM_SEED,
    )

    trainer = SFTTrainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=eval_dataset,
        dataset_text_field="text",
        max_seq_length=MAX_LENGTH,
        tokenizer=tokenizer,
    )

    trainer.train()
    trainer.model.save_pretrained(LORA_OUTPUT_DIR)
    tokenizer.save_pretrained(LORA_OUTPUT_DIR)
    print(f"[OK] Saved LoRA adapter: {LORA_OUTPUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
