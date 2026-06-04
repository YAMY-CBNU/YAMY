"""Prompt templates for Korean recipe step splitting."""

from __future__ import annotations

import json
from typing import Any


SYSTEM_PROMPT = """당신은 한국어 레시피 조리 설명을 단계별 JSON으로 변환하는 도우미입니다.
반드시 JSON 객체만 출력하세요. 설명, 마크다운, 코드블록, 주석은 출력하지 마세요.
출력 스키마는 정확히 다음 형식을 따르세요:
{"steps":[{"step":1,"description":"조리 설명","timer_minutes":null}]}
timer_minutes는 조리 시간 표현이 있으면 분 단위 숫자로, 없으면 null로 작성하세요.
30초는 0.5처럼 분 단위 소수로 변환하세요."""


USER_PROMPT_TEMPLATE = """다음 자유형 조리 설명을 단계별 조리 과정으로 분리하세요.

입력:
{input_text}

JSON만 출력하세요."""


FEW_SHOT_EXAMPLES = [
    {
        "input_text": "양파를 얇게 썰어주세요. 팬에 기름을 두르고 양파를 약 5분간 볶아주세요.",
        "target_json": {
            "steps": [
                {"step": 1, "description": "양파를 얇게 썰어주세요.", "timer_minutes": None},
                {"step": 2, "description": "팬에 기름을 두르고 양파를 약 5분간 볶아주세요.", "timer_minutes": 5},
            ]
        },
    },
    {
        "input_text": "물을 끓인 뒤 면을 넣어주세요. 면을 30초 정도 데친 후 찬물에 헹궈주세요.",
        "target_json": {
            "steps": [
                {"step": 1, "description": "물을 끓인 뒤 면을 넣어주세요.", "timer_minutes": None},
                {"step": 2, "description": "면을 30초 정도 데친 후 찬물에 헹궈주세요.", "timer_minutes": 0.5},
            ]
        },
    },
]


def build_user_prompt(input_text: str) -> str:
    """Build a single user prompt."""
    return USER_PROMPT_TEMPLATE.format(input_text=input_text)


def build_messages(input_text: str, mode: str = "few_shot") -> list[dict[str, str]]:
    """Build chat messages for an instruct/chat model."""
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    if mode == "few_shot":
        for example in FEW_SHOT_EXAMPLES:
            messages.append({"role": "user", "content": build_user_prompt(example["input_text"])})
            messages.append(
                {
                    "role": "assistant",
                    "content": json.dumps(example["target_json"], ensure_ascii=False),
                }
            )

    messages.append({"role": "user", "content": build_user_prompt(input_text)})
    return messages


def format_training_text(tokenizer: Any, input_text: str, target_json: dict[str, Any]) -> str:
    """Format one supervised fine-tuning sample.

    Qwen2.5-Instruct tokenizers include a chat template. If a replacement model
    does not, this falls back to a simple instruction-response format.
    """
    target_text = json.dumps(target_json, ensure_ascii=False)
    messages = build_messages(input_text, mode="zero_shot")
    messages.append({"role": "assistant", "content": target_text})

    if getattr(tokenizer, "chat_template", None):
        return tokenizer.apply_chat_template(messages, tokenize=False)

    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"{build_user_prompt(input_text)}\n\n"
        f"정답 JSON:\n{target_text}"
    )
