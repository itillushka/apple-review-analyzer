"""Text preprocessing for review analysis.

Produces a cleaned, English-normalized copy of each review's title/content
(``title_clean`` / ``content_clean``) without discarding the originals. The
cleaned text is what the metrics/insights layers analyze.
"""

from __future__ import annotations

import re
import unicodedata

from .models import Review

_TAG_RE = re.compile(r"<[^>]+>")
_URL_RE = re.compile(r"https?://\S+|www\.\S+")
_WHITESPACE_RE = re.compile(r"\s+")


def clean_text(text: str | None) -> str:
    """Normalize text for analysis.

    Steps: Unicode NFKC normalization, strip HTML tags and URLs, collapse all
    whitespace to single spaces, and trim. Case and punctuation are preserved —
    lowercasing/tokenization is left to the NLP step that needs it.
    """
    if not text:
        return ""
    text = unicodedata.normalize("NFKC", text)
    text = _TAG_RE.sub(" ", text)
    text = _URL_RE.sub(" ", text)
    text = _WHITESPACE_RE.sub(" ", text)
    return text.strip()


def preprocess_reviews(reviews: list[Review]) -> list[Review]:
    """Fill ``title_clean`` / ``content_clean`` on each review, in place.

    Cleans the English text (``*_en``) when present, otherwise the original — so
    this is safe to run whether or not the translation layer ran first.
    """
    for r in reviews:
        r.title_clean = clean_text(r.title_en if r.title_en is not None else r.title)
        r.content_clean = clean_text(
            r.content_en if r.content_en is not None else r.content
        )
    return reviews
