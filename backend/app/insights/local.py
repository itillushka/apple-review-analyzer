"""Local, offline insights backend: VADER sentiment + YAKE themes + rule-based advice.

No network, no API key — this is the graceful-degradation fallback for the LLM
insights graph. It operates on the cleaned English text (``content_clean``), so run
``preprocess_reviews`` (and, for non-English, ``translate_reviews``) first.
"""

from __future__ import annotations

from collections import Counter

import yake
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from ..models import Insights, Review, ReviewSentiment, ThemeStat
from .derived import assemble_insights, local_emotion, local_taxonomy

# VADER compound-score thresholds for the three-way label.
_POSITIVE_AT = 0.05
_NEGATIVE_AT = -0.05

_SENTIMENTS = ("positive", "neutral", "negative")

# Generic words / tokenizer fragments that are not actionable themes.
_JUNK_THEMES = {"app", "apps", "nt", "thing", "things", "way", "lot", "time"}


def _text_of(review: Review) -> str:
    """Best available English text for analysis."""
    return (review.content_clean or review.content_en or review.content or "").strip()


def _classify(analyzer: SentimentIntensityAnalyzer, text: str) -> tuple[str, float]:
    score = analyzer.polarity_scores(text)["compound"] if text else 0.0
    if score >= _POSITIVE_AT:
        return "positive", score
    if score <= _NEGATIVE_AT:
        return "negative", score
    return "neutral", score


def _extract_negative_themes(
    negative_reviews: list[Review], max_themes: int
) -> list[ThemeStat]:
    """Pull recurring keywords/phrases from negative reviews and count their reach."""
    texts = [t for r in negative_reviews if (t := _text_of(r))]
    corpus = ". ".join(texts)
    if not corpus.strip():
        return []

    extractor = yake.KeywordExtractor(lan="en", n=2, top=max_themes * 3, dedupLim=0.7)
    candidates = [phrase for phrase, _score in extractor.extract_keywords(corpus)]

    n_negative = len(negative_reviews) or 1
    themes: list[ThemeStat] = []
    seen: set[str] = set()
    for phrase in candidates:
        low = phrase.lower().strip()
        if low in seen:
            continue
        seen.add(low)
        # Drop generic words, contraction fragments (n't), and non-words.
        if (
            low in _JUNK_THEMES
            or len(low) < 3
            or low.endswith(("n't", "n’t"))
            or not any(c.isalpha() for c in low)
        ):
            continue
        matching = [t for t in texts if low in t.lower()]
        if not matching:
            continue
        themes.append(
            ThemeStat(
                theme=phrase,
                count=len(matching),
                share=round(len(matching) / n_negative * 100, 1),
                examples=[t[:140] for t in matching[:2]],
            )
        )
        if len(themes) >= max_themes:
            break

    themes.sort(key=lambda t: t.count, reverse=True)
    return themes


def _recommendations(themes: list[ThemeStat], sentiment_pct: dict[str, float]) -> list[str]:
    """Templated, evidence-backed recommendations from the extracted themes."""
    if not themes:
        return ["Not enough negative signal to extract specific issues; keep monitoring."]
    recs = [
        f'Address recurring complaints about "{t.theme}" '
        f"— seen in {t.share}% of negative reviews."
        for t in themes[:4]
    ]
    if sentiment_pct.get("negative", 0.0) > 30:
        recs.append(
            "Negative sentiment is high (>30%); prioritize the issues above for the next release."
        )
    return recs


def compute_local_insights(reviews: list[Review], *, max_themes: int = 8) -> Insights:
    """Compute sentiment, negative themes, and recommendations entirely offline."""
    analyzer = SentimentIntensityAnalyzer()
    per_review: list[ReviewSentiment] = []
    for r in reviews:
        label, score = _classify(analyzer, _text_of(r))
        per_review.append(
            ReviewSentiment(
                id=r.id, sentiment=label, score=round(score, 3), emotion=local_emotion(label)
            )
        )

    sentiment_pct = {
        k: round(v / (len(per_review) or 1) * 100, 1)
        for k, v in Counter(s.sentiment for s in per_review).items()
    }
    negative_reviews = [
        r for r, s in zip(reviews, per_review) if s.sentiment == "negative"
    ]
    negative_themes = _extract_negative_themes(negative_reviews, max_themes)
    actionable = _recommendations(negative_themes, sentiment_pct)
    taxonomy = local_taxonomy(negative_reviews)

    return assemble_insights(
        backend="local",
        reviews=reviews,
        per_review=per_review,
        themes=negative_themes,
        actionable=actionable,
        taxonomy=taxonomy,
    )
