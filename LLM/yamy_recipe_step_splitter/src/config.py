"""Configuration for the YAMY recipe step splitter experiment.

Edit this file first when your CSV columns, model, split ratios, or training
settings change. Paths are resolved from the project root:
LLM/yamy_recipe_step_splitter/
"""

from pathlib import Path


# Project paths
PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_DIR = PROJECT_ROOT / "outputs"

CSV_PATH = DATA_DIR / "recipes.csv"
TRAIN_JSONL_PATH = DATA_DIR / "processed_train.jsonl"
VALID_JSONL_PATH = DATA_DIR / "processed_valid.jsonl"
TEST_JSONL_PATH = DATA_DIR / "processed_test.jsonl"
HF_DATASET_DIR = DATA_DIR / "hf_dataset"

BASELINE_PREDICTIONS_PATH = OUTPUT_DIR / "baseline_predictions.jsonl"
EVAL_RESULT_PATH = OUTPUT_DIR / "eval_result.json"
LORA_OUTPUT_DIR = OUTPUT_DIR / "lora_adapter"


# CSV columns. Change these if your CSV uses different names.
RECIPE_ID_COL = "external_recipe_id"
STEP_NO_COL = "step_order"
STEP_TEXT_COL = "description"

# Optional column. If it exists, it is used as the preferred timer label.
TIMER_SECONDS_COL = "timer_seconds"


# Dataset split
TRAIN_RATIO = 0.8
VALID_RATIO = 0.1
TEST_RATIO = 0.1
RANDOM_SEED = 42


# Model and generation
MODEL_NAME = "Qwen/Qwen2.5-1.5B-Instruct"
MAX_LENGTH = 2048
MAX_NEW_TOKENS = 768
TEMPERATURE = 0.2
TOP_P = 0.9

# "few_shot" usually improves JSON format adherence. Use "zero_shot" for a
# stricter baseline without examples.
BASELINE_MODE = "few_shot"
BASELINE_SAMPLE_SIZE = 20


# LoRA / QLoRA
USE_4BIT = False
LORA_R = 16
LORA_ALPHA = 32
LORA_DROPOUT = 0.05
LORA_TARGET_MODULES = ["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"]

TRAIN_EPOCHS = 1
LEARNING_RATE = 2e-4
BATCH_SIZE = 1
GRADIENT_ACCUMULATION_STEPS = 8
LOGGING_STEPS = 10
SAVE_STEPS = 100
