"""Tests for the translation layer (no network — a fake translator is injected)."""

from __future__ import annotations

from app.models import Review
from app.translation import translate_reviews


class FakeTranslator:
    """Deterministic stand-in: prefixes text so we can assert it was translated."""

    def translate(self, text: str) -> str:
        return f"EN::{text}"


class BoomTranslator:
    def translate(self, text: str) -> str:  # always fails
        raise RuntimeError("boom")


def _review(country: str, title: str = "T", content: str = "C") -> Review:
    return Review(id="x", title=title, content=content, rating=4, country=country)


def test_english_storefront_passthrough():
    reviews = [_review("gb", title="Hello", content="Great app")]
    out = translate_reviews(reviews, FakeTranslator())
    assert out[0].language == "en"
    assert out[0].title_en == "Hello"  # untouched
    assert out[0].content_en == "Great app"


def test_non_english_is_translated():
    reviews = [_review("fr", title="Bonjour", content="Bonne app")]
    out = translate_reviews(reviews, FakeTranslator())
    assert out[0].title_en == "EN::Bonjour"
    assert out[0].content_en == "EN::Bonne app"


def test_translation_error_falls_back_to_original():
    reviews = [_review("es", title="Hola", content="Hola mundo")]
    out = translate_reviews(reviews, BoomTranslator())
    assert out[0].title_en == "Hola"  # original kept on failure
    assert out[0].content_en == "Hola mundo"
