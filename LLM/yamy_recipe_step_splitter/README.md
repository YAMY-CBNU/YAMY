# YAMY Recipe Step Splitter

한국어 자유형 레시피 조리 설명을 단계별 JSON으로 분리하고, 조리 시간(`timer_minutes`)을 추출하는 실험용 프로젝트입니다.

## 설치

```bash
cd LLM/yamy_recipe_step_splitter
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

GPU가 있으면 추론과 학습이 훨씬 빠릅니다. Windows에서는 `bitsandbytes` 설치가 실패할 수 있으므로 기본값은 `USE_4BIT=False`입니다.

## CSV 컬럼명 수정

기본 데이터 파일은 `data/recipes.csv`입니다. 현재 기본 컬럼명은 다음과 같습니다.

```python
RECIPE_ID_COL = "external_recipe_id"
STEP_NO_COL = "step_order"
STEP_TEXT_COL = "description"
TIMER_SECONDS_COL = "timer_seconds"
```

CSV 컬럼명이 다르면 `src/config.py` 상단의 값을 바꾸면 됩니다.

## 데이터셋 생성

```bash
python src/prepare_dataset.py
```

생성 파일:

- `data/processed_train.jsonl`
- `data/processed_valid.jsonl`
- `data/processed_test.jsonl`
- `data/hf_dataset/` (`datasets` 패키지가 설치되어 있으면 Hugging Face `DatasetDict`로 저장)

`target_json`은 모델이 예측할 스키마만 포함합니다.

```json
{
  "steps": [
    {
      "step": 1,
      "description": "팬에 기름을 두르고 5분간 볶아주세요.",
      "timer_minutes": 5
    }
  ]
}
```

`timer_minutes`는 CSV의 `timer_seconds` 컬럼만 사용해 만듭니다. `description` 안에 `5분`, `30초` 같은 표현이 있어도 `timer_seconds`가 비어 있으면 `timer_minutes`는 `null`입니다.

`timer_meta`에는 CSV에서 변환한 분 단위 값과 source만 들어갑니다. 이 값은 학습 타깃이 아니라 분석용입니다.

초 단위는 CSV의 초 값을 분 단위 소수로 변환합니다. 예: `timer_seconds=30 -> timer_minutes=0.5`.

## 베이스라인 추론

```bash
python src/infer_baseline.py
```

기본 모델은 `Qwen/Qwen2.5-1.5B-Instruct`입니다. 다른 모델을 쓰려면 `src/config.py`의 `MODEL_NAME`을 바꾸세요.

기본 추론 방식은 few-shot입니다. zero-shot으로 바꾸려면:

```python
BASELINE_MODE = "zero_shot"
```

결과는 `outputs/baseline_predictions.jsonl`에 저장됩니다.

## 평가

```bash
python src/evaluate.py
```

`outputs/lora_predictions.jsonl`이 있으면 LoRA 결과를 우선 평가하고, 없으면 `outputs/baseline_predictions.jsonl`을 평가합니다.

평가 지표:

- JSON 파싱 성공률
- 스키마 유효 비율
- 단계 개수 정확도
- 평균 단계 개수 차이
- `timer_minutes` 정확도
- description exact match / normalized match

결과는 콘솔과 `outputs/eval_result.json`에 저장됩니다.

## LoRA 파인튜닝

```bash
python src/train_lora.py
```

학습 결과 adapter는 `outputs/lora_adapter/`에 저장됩니다.

GPU를 사용하려면 `src/config.py`에서 다음 값이 켜져 있으면 됩니다. CUDA가 잡히면 학습 시작 시 GPU 이름이 출력됩니다.

```python
USE_GPU = True
```

RTX 3070 같은 8GB GPU에서는 기본 학습 설정을 메모리 절약형으로 둡니다.

```python
MAX_LENGTH = 1024
LORA_R = 8
LORA_TARGET_MODULES = ["q_proj", "v_proj"]
GRADIENT_CHECKPOINTING = True
EVAL_DURING_TRAINING = False
```

그래도 CUDA out of memory가 나면 `MAX_LENGTH = 512`로 더 줄이세요. 학습 중 검증은 꺼져 있으므로, 학습 후 별도 추론/평가 스크립트로 성능을 확인하는 흐름이 안전합니다.

학습된 adapter로 추론하려면:

```bash
python src/infer_lora.py
python src/evaluate.py
```

LoRA 추론 결과는 `outputs/lora_predictions.jsonl`에 저장됩니다.

원본 단계, 합쳐진 입력, 모델이 다시 나눈 단계를 눈으로 비교하려면:

```bash
python src/show_examples.py
```

결과는 `outputs/prediction_examples.md`에 저장됩니다.

QLoRA 4bit를 시도하려면 `src/config.py`에서 다음 값을 바꾸세요.

```python
USE_4BIT = True
```

Windows에서 `bitsandbytes` 오류가 나면 `USE_4BIT=False`로 되돌리고 실행하세요.

## 자주 발생하는 오류

### CSV 컬럼을 찾을 수 없음

`src/config.py`의 `RECIPE_ID_COL`, `STEP_NO_COL`, `STEP_TEXT_COL`이 실제 CSV 헤더와 같은지 확인하세요. `prepare_dataset.py`는 사용 가능한 컬럼 목록을 출력합니다.

### 모델 다운로드 또는 로딩 실패

인터넷 연결, Hugging Face 캐시, 모델명, 디스크 용량을 확인하세요. CPU만 있으면 Qwen 1.5B도 느릴 수 있습니다.

### TRL 실행 중 cp949 UnicodeDecodeError

Windows 한국어 환경에서 `trl`이 내부 템플릿을 `cp949`로 읽으려다 실패할 수 있습니다. `train_lora.py`에는 이 문제를 우회하는 패치가 들어 있습니다. 그래도 비슷한 오류가 나면 PowerShell에서 UTF-8 모드로 실행하세요.

```powershell
$env:PYTHONUTF8="1"
python src/train_lora.py
```

### CUDA 메모리 부족

`BASELINE_SAMPLE_SIZE`, `MAX_NEW_TOKENS`, `MAX_LENGTH`, batch size를 줄이세요. 학습에서는 LoRA batch size를 1로 두고 gradient accumulation을 사용하는 편이 안전합니다.

### JSON 파싱 성공률이 낮음

`BASELINE_MODE="few_shot"`을 유지하고, `src/prompt.py`의 예시를 데이터셋과 더 비슷하게 바꿔보세요.

## 추천 실행 순서

```bash
python src/prepare_dataset.py
python src/infer_baseline.py
python src/evaluate.py
python src/train_lora.py
python src/infer_lora.py
python src/evaluate.py
python src/show_examples.py
```
