"""LoRA/QLoRA supervised fine-tuning for recipe step splitting."""

from __future__ import annotations

import sys
import inspect
from pathlib import Path
from typing import Any

import torch
from datasets import Dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig


def patch_pathlib_read_text_for_windows_trl() -> None:
    """Make TRL template loading robust on Korean Windows locales.

    Some TRL versions call Path.read_text() without an explicit encoding while
    importing SFTTrainer. On Windows this can default to cp949 and fail on TRL's
    UTF-8 Jinja templates. This small compatibility patch only changes calls
    where encoding was omitted.
    """
    original_read_text = Path.read_text

    def read_text_utf8_default(self: Path, encoding: str | None = None, errors: str | None = None) -> str:
        return original_read_text(self, encoding=encoding or "utf-8", errors=errors)

    Path.read_text = read_text_utf8_default


patch_pathlib_read_text_for_windows_trl()
from trl import SFTConfig, SFTTrainer

from config import (
    BATCH_SIZE,
    EVAL_DURING_TRAINING,
    GRADIENT_CHECKPOINTING,
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
    USE_GPU,
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
    use_cuda = USE_GPU and torch.cuda.is_available()
    if USE_GPU and not torch.cuda.is_available():
        print("[WARN] USE_GPU=True, but CUDA is not available. Training will run on CPU.")
    elif use_cuda:
        print(f"[INFO] Using GPU: {torch.cuda.get_device_name(0)}")
    else:
        print("[INFO] USE_GPU=False. Training will run on CPU.")

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
        torch_dtype=torch.float16 if use_cuda else torch.float32,
        device_map="auto" if use_cuda else None,
        quantization_config=quantization_config,
    )

    if USE_4BIT:
        model = prepare_model_for_kbit_training(model)

    model.config.use_cache = False
    if GRADIENT_CHECKPOINTING and hasattr(model, "gradient_checkpointing_enable"):
        model.gradient_checkpointing_enable()

    return tokenizer, model


def make_dataset(rows: list[dict[str, Any]], tokenizer: Any) -> Dataset:
    texts = [
        format_training_text(tokenizer, row["input_text"], row["target_json"])
        for row in rows
        if row.get("input_text") and row.get("target_json")
    ]
    return Dataset.from_dict({"text": texts})


def filter_supported_kwargs(callable_obj: Any, kwargs: dict[str, Any]) -> dict[str, Any]:
    """Keep only keyword arguments supported by the installed library version."""
    signature = inspect.signature(callable_obj)
    return {key: value for key, value in kwargs.items() if key in signature.parameters}


def build_sft_config(eval_dataset: Dataset | None) -> SFTConfig:
    """Build TRL SFTConfig with transformers/TRL version-compatible names."""
    use_cuda = USE_GPU and torch.cuda.is_available()
    kwargs: dict[str, Any] = {
        "output_dir": str(LORA_OUTPUT_DIR),
        "num_train_epochs": TRAIN_EPOCHS,
        "per_device_train_batch_size": BATCH_SIZE,
        "per_device_eval_batch_size": BATCH_SIZE,
        "gradient_accumulation_steps": GRADIENT_ACCUMULATION_STEPS,
        "learning_rate": LEARNING_RATE,
        "logging_steps": LOGGING_STEPS,
        "save_steps": SAVE_STEPS,
        "save_total_limit": 2,
        "eval_steps": SAVE_STEPS if eval_dataset is not None else None,
        "fp16": use_cuda and not USE_4BIT,
        "bf16": False,
        "gradient_checkpointing": GRADIENT_CHECKPOINTING,
        "gradient_checkpointing_kwargs": {"use_reentrant": False},
        "report_to": "none",
        "seed": RANDOM_SEED,
        "dataset_text_field": "text",
        "max_length": MAX_LENGTH,
        "max_seq_length": MAX_LENGTH,
    }

    # transformers 5 uses eval_strategy/use_cpu. Older versions use
    # evaluation_strategy/no_cuda.
    sft_config_params = inspect.signature(SFTConfig.__init__).parameters
    if "eval_strategy" in sft_config_params:
        kwargs["eval_strategy"] = "steps" if eval_dataset is not None else "no"
    else:
        kwargs["evaluation_strategy"] = "steps" if eval_dataset is not None else "no"

    if "use_cpu" in sft_config_params:
        kwargs["use_cpu"] = not use_cuda
    else:
        kwargs["no_cuda"] = not use_cuda

    return SFTConfig(**filter_supported_kwargs(SFTConfig, kwargs))


def build_sft_trainer(
    model: Any,
    training_args: SFTConfig,
    train_dataset: Dataset,
    eval_dataset: Dataset | None,
    tokenizer: Any,
) -> SFTTrainer:
    """Create SFTTrainer across old and new TRL constructor APIs."""
    kwargs: dict[str, Any] = {
        "model": model,
        "args": training_args,
        "train_dataset": train_dataset,
        "eval_dataset": eval_dataset,
        "processing_class": tokenizer,
        "tokenizer": tokenizer,
        "dataset_text_field": "text",
        "max_seq_length": MAX_LENGTH,
    }
    return SFTTrainer(**filter_supported_kwargs(SFTTrainer, kwargs))


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
    eval_dataset = make_dataset(valid_rows, tokenizer) if EVAL_DURING_TRAINING and valid_rows else None
    if not EVAL_DURING_TRAINING:
        print("[INFO] EVAL_DURING_TRAINING=False. Skipping validation during training to save VRAM.")

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

    training_args = build_sft_config(eval_dataset)
    trainer = build_sft_trainer(model, training_args, train_dataset, eval_dataset, tokenizer)

    trainer.train()
    trainer.model.save_pretrained(LORA_OUTPUT_DIR)
    tokenizer.save_pretrained(LORA_OUTPUT_DIR)
    print(f"[OK] Saved LoRA adapter: {LORA_OUTPUT_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
