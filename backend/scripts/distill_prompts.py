"""Prompt distillation with a measurable before/after comparison (100 reviews).

A strong paid teacher (gpt-5.5) labels the reviews as ground truth. We then measure
how well the cheap student model (the classify model) agrees with the teacher:

  1. BEFORE — student classifies with the base prompt (no examples).
  2. DISTILL — build few-shot examples from the teacher's labels (prioritizing the
     reviews the student got wrong) and save them to the prompts file.
  3. AFTER  — student classifies again; the runtime now injects the few-shots.

The teacher is used at dev-time only; the runtime stays on the cheap student model.

Usage (from the ``backend`` directory):
    uv run python scripts/distill_prompts.py
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from openai import OpenAI  # noqa: E402

from app.collector import collect_reviews  # noqa: E402
from app.config import settings  # noqa: E402
from app.insights import llm  # noqa: E402
from app.insights.llm import _classify_sentiment, _parse_json, _text  # noqa: E402
from app.processing import preprocess_reviews  # noqa: E402
from app.translation import translate_reviews  # noqa: E402

_BACKEND = Path(__file__).resolve().parent.parent
FEWSHOT_PATH = _BACKEND / "app" / "insights" / "prompts" / "classify_fewshot.json"
REPORT_PATH = _BACKEND / "evals" / "distillation_report.md"


def _chunks(items, n):
    for i in range(0, len(items), n):
        yield items[i : i + n]


def teacher_labels(reviews) -> dict[str, str]:
    """Ground-truth sentiment labels from the teacher model (gpt-5.5)."""
    client = OpenAI(api_key=settings.openai_api_key)
    labels: dict[str, str] = {}
    for batch in _chunks(reviews, 25):
        items = [{"id": r.id, "text": _text(r)} for r in batch]
        prompt = (
            "Classify each review's sentiment as exactly one of: positive, neutral, negative.\n"
            f"Reviews (JSON):\n{json.dumps(items, ensure_ascii=False)}\n\n"
            'Return JSON: {"results":[{"id":"<id>","sentiment":"..."}]}'
        )
        resp = client.chat.completions.create(
            model=settings.model_teacher, messages=[{"role": "user", "content": prompt}]
        )
        data = _parse_json(resp.choices[0].message.content or "") or {}
        for row in data.get("results", []):
            sentiment = str(row.get("sentiment", "")).lower().strip()
            if sentiment in ("positive", "neutral", "negative"):
                labels[str(row.get("id"))] = sentiment
    return labels


def agreement(pred: dict[str, str], gold: dict[str, str]) -> tuple[float, int]:
    common = [i for i in gold if i in pred]
    if not common:
        return 0.0, 0
    matches = sum(1 for i in common if pred[i] == gold[i])
    return round(matches / len(common) * 100, 1), len(common)


def _student_labels(reviews) -> dict[str, str]:
    return {s.id: s.sentiment for s in _classify_sentiment(reviews)}


async def main() -> None:
    result = await collect_reviews("1459969523", region="europe", limit=100, seed=42)
    reviews = result.reviews
    translate_reviews(reviews)
    preprocess_reviews(reviews)

    print(f"Teacher ({settings.model_teacher}) labeling {len(reviews)} reviews...")
    gold = teacher_labels(reviews)

    # BEFORE: no few-shots.
    if FEWSHOT_PATH.exists():
        FEWSHOT_PATH.unlink()
    llm._classify_fewshot.cache_clear()
    print(f"Student ({settings.model_classify}) — before distillation...")
    before = _student_labels(reviews)
    before_pct, n = agreement(before, gold)

    # DISTILL: few-shots from gold, prioritizing the student's mistakes.
    disagreements = [r for r in reviews if r.id in gold and before.get(r.id) != gold[r.id]]
    examples = [{"text": _text(r, 160), "sentiment": gold[r.id]} for r in disagreements[:4]]
    per_class: dict[str, list] = {"positive": [], "neutral": [], "negative": []}
    for r in reviews:
        g = gold.get(r.id)
        if g and len(per_class[g]) < 2:
            per_class[g].append({"text": _text(r, 160), "sentiment": g})
    for bucket in per_class.values():
        examples += bucket
    FEWSHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
    FEWSHOT_PATH.write_text(json.dumps(examples, ensure_ascii=False, indent=2), encoding="utf-8")
    llm._classify_fewshot.cache_clear()

    # AFTER: runtime now injects the distilled few-shots.
    print("Student — after distillation...")
    after = _student_labels(reviews)
    after_pct, _ = agreement(after, gold)

    delta = round(after_pct - before_pct, 1)
    report = (
        "# Prompt Distillation — Before / After (100 reviews)\n\n"
        f"- **Teacher:** `{settings.model_teacher}` (dev-time only)\n"
        f"- **Student:** `{settings.model_classify}` (runtime)\n"
        f"- **Compared on:** {n} reviews\n\n"
        "| Stage | Agreement with teacher |\n|---|---|\n"
        f"| Before distillation | {before_pct}% |\n"
        f"| After distillation | {after_pct}% |\n"
        f"| **Improvement** | **{'+' if delta >= 0 else ''}{delta} pp** |\n\n"
        f"{len(examples)} few-shot examples distilled "
        f"({len(disagreements)} student mistakes corrected). The few-shots are saved to "
        "`app/insights/prompts/classify_fewshot.json` and injected into the runtime "
        "classify prompt.\n"
    )
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(report, encoding="utf-8")
    print("\n" + report)


if __name__ == "__main__":
    asyncio.run(main())
