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

`timer_meta`에는 CSV의 `timer_seconds`, 정규식 추출 결과, source, mismatch 여부가 들어갑니다. 이 값은 학습 타깃이 아니라 분석용입니다.

초 단위 표현은 모델 스키마를 단순하게 유지하기 위해 분 단위 소수로 변환합니다. 예: `30초 -> 0.5`.

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

### CUDA 메모리 부족

`BASELINE_SAMPLE_SIZE`, `MAX_NEW_TOKENS`, `MAX_LENGTH`, batch size를 줄이세요. 학습에서는 LoRA batch size를 1로 두고 gradient accumulation을 사용하는 편이 안전합니다.

### JSON 파싱 성공률이 낮음

`BASELINE_MODE="few_shot"`을 유지하고, `src/prompt.py`의 예시를 데이터셋과 더 비슷하게 바꿔보세요.

## 추천 실행 순서

```bash
python src/prepare_dataset.py
python src/infer_baseline.py
python src/evaluate.py
```
