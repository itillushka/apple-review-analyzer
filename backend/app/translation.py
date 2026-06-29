"""Translate non-English reviews to English so the NLP/insights stack is uniform.

Reviews are collected per region and therefore arrive in many languages. This
module normalizes each review's title/content into English (``title_en`` /
``content_en``). Reviews from English-language storefronts are passed through
untouched. Translation is pluggable: a free, key-less web translator is the
default today; an LLM-based translator is wired in phase 3.
"""

from __future__ import annotations

import concurrent.futures
import json
import logging
from pathlib import Path
from typing import Protocol

from .config import settings
from .models import Review

logger = logging.getLogger(__name__)

# Storefronts whose reviews are predominantly English — skip translation.
ENGLISH_STOREFRONTS = {"us", "gb", "ie", "ca", "au", "nz", "in", "za", "sg"}

# Parallel workers + a persistent text→English cache so re-runs are instant.
# Translation is best-effort for display only (the multilingual LLM analyzes the
# original text), so it is hard-bounded by a timeout and never blocks for long.
_MAX_WORKERS = 8
_TIMEOUT = 25.0


def _cache_path() -> Path:
    return Path(settings.data_dir) / "translation_cache.json"


def _load_cache() -> dict:
    path = _cache_path()
    if not path.exists():
        return {}
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_cache(cache: dict) -> None:
    path = _cache_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")

# Google's web endpoint rejects very long inputs; reviews are short, but guard anyway.
MAX_TRANSLATE_CHARS = 4500


class Translator(Protocol):
    """Translate a single piece of text into English."""

    def translate(self, text: str) -> str: ...


class NullTranslator:
    """Passthrough translator (no network) — leaves text unchanged."""

    def translate(self, text: str) -> str:
        return text


class GoogleWebTranslator:
    """Free, key-less translator backed by deep-translator's Google web endpoint."""

    def __init__(self, target: str = "en") -> None:
        from deep_translator import GoogleTranslator

        self._engine = GoogleTranslator(source="auto", target=target)

    def translate(self, text: str) -> str:
        text = (text or "").strip()
        if not text:
            return ""
        return self._engine.translate(text[:MAX_TRANSLATE_CHARS]) or text


def default_translator() -> Translator:
    """Best available no-key translator; falls back to passthrough if unavailable."""
    try:
        return GoogleWebTranslator()
    except Exception as exc:  # import / init failure → degrade gracefully
        logger.warning("Translation unavailable (%s); using passthrough.", exc)
        return NullTranslator()


def _safe_translate(translator: Translator, text: str) -> str:
    """Translate, falling back to the original text on any failure."""
    if not text:
        return ""
    try:
        return translator.translate(text)
    except Exception as exc:  # never let one bad translation sink the batch
        logger.warning("Translation failed (%s); keeping original.", exc)
        return text


def translate_reviews(
    reviews: list[Review], translator: Translator | None = None
) -> list[Review]:
    """Fill ``title_en`` / ``content_en`` / ``language`` on each review, in place.

    English-storefront reviews are passed through. For others, each unique source
    text is translated **once** (a persistent cache makes re-runs instant) and the
    remaining work runs **in parallel** across a thread pool. Failures fall back to
    the original text so a single bad translation never sinks the batch.
    """
    translator = translator or default_translator()
    cache = _load_cache()

    # Collect the unique, uncached texts that actually need translating.
    pending: list[str] = []
    seen: set[str] = set()
    for r in reviews:
        if r.country in ENGLISH_STOREFRONTS:
            continue
        for raw in (r.title, r.content):
            text = (raw or "").strip()
            if text and text not in cache and text not in seen:
                seen.add(text)
                pending.append(text)

    # Translate the backlog concurrently, hard-bounded by a timeout so a flaky
    # endpoint can never hang the request. Anything not done in time falls back to
    # the original text (cache.get default below).
    if pending:
        pool = concurrent.futures.ThreadPoolExecutor(max_workers=_MAX_WORKERS)
        futures = {pool.submit(_safe_translate, translator, t): t for t in pending}
        try:
            for fut in concurrent.futures.as_completed(futures, timeout=_TIMEOUT):
                cache[futures[fut]] = fut.result()
        except concurrent.futures.TimeoutError:
            logger.warning("Translation timed out; remaining texts stay in original language.")
        pool.shutdown(wait=False, cancel_futures=True)
        _save_cache(cache)

    # Assign from the cache (English storefronts mirror the original).
    for r in reviews:
        if r.country in ENGLISH_STOREFRONTS:
            r.language = "en"
            r.title_en = r.title
            r.content_en = r.content
            continue
        title = (r.title or "").strip()
        content = (r.content or "").strip()
        r.title_en = cache.get(title, r.title) if title else ""
        r.content_en = cache.get(content, r.content) if content else ""
    return reviews
