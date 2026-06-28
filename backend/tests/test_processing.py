"""Tests for text preprocessing."""

from __future__ import annotations

from app.models import Review
from app.processing import clean_text, preprocess_reviews


def test_clean_text_strips_html_urls_and_collapses_whitespace():
    raw = "  <b>Great</b>   app!! visit https://x.com now\n\nlove it "
    assert clean_text(raw) == "Great app!! visit now love it"


def test_clean_text_handles_empty():
    assert clean_text(None) == ""
    assert clean_text("") == ""


def test_preprocess_prefers_english_then_falls_back_to_original():
    translated = Review(
        id="1", title="T", content="C", rating=5, country="de",
        title_en="Title", content_en="Body text",
    )
    english = Review(id="2", title="Orig", content="Orig body", rating=4, country="gb")

    preprocess_reviews([translated, english])

    assert translated.content_clean == "Body text"  # from content_en
    assert english.content_clean == "Orig body"  # fallback to original
