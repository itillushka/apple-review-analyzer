"""Translate non-English reviews to English so the NLP/insights stack is uniform.

Reviews are collected per region and therefore arrive in many languages. This
module normalizes each review's title/content into English (``title_en`` /
``content_en``). Reviews from English-language storefronts are passed through
untouched. Translation is pluggable: a free, key-less web translator is the
default today; an LLM-based translator is wired in phase 3.
"""

from __future__ import annotations

import logging
from typing import Protocol

from .models import Review

logger = logging.getLogger(__name__)

# Storefronts whose reviews are predominantly English — skip translation.
ENGLISH_STOREFRONTS = {"us", "gb", "ie", "ca", "au", "nz", "in", "za", "sg"}

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

    English-storefront reviews are marked English and copied through. For others,
    each field is translated; any failure falls back to the original text. The
    source language is left unset (None) since we do not run language detection —
    the translator auto-detects per call.
    """
    translator = translator or default_translator()
    for r in reviews:
        if r.country in ENGLISH_STOREFRONTS:
            r.language = "en"
            r.title_en = r.title
            r.content_en = r.content
            continue
        r.title_en = _safe_translate(translator, r.title)
        r.content_en = _safe_translate(translator, r.content)
    return reviews
