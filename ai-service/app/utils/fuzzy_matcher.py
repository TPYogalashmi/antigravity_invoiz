"""
Fuzzy product name matching using rapidfuzz with difflib fallback.
"""
from __future__ import annotations
import logging
from rapidfuzz import process, fuzz
logger = logging.getLogger(__name__)

# Minimum similarity score (0-100) to accept a fuzzy match
FUZZY_THRESHOLD = 70


def _ratio_rapidfuzz(query: str, choices: list[str]) -> list[tuple[str, float]]:
    results = process.extract(
        query,
        choices,
        scorer=fuzz.token_set_ratio,
        limit=5,
    )
    # rapidfuzz returns (match, score, index)
    return [(r[0], r[1]) for r in results]


def _ratio_difflib(query: str, choices: list[str]) -> list[tuple[str, float]]:
    from difflib import SequenceMatcher
    scored = []
    for choice in choices:
        ratio = SequenceMatcher(None, query.lower(), choice.lower()).ratio() * 100
        scored.append((choice, ratio))
    scored.sort(key=lambda x: x[1], reverse=True)
    return scored[:5]


def best_match(
    query: str,
    choices: list[str],
    threshold: float = FUZZY_THRESHOLD,
) -> tuple[str | None, float]:
    """
    Find the best matching string from `choices` for `query`.

    Returns:
        (matched_string, score) if score >= threshold
        (None, score)           if best score is below threshold
    """
    if not choices:
        return None, 0.0

    q = query.lower().strip()

    # Exact match short-circuit
    for c in choices:
        if c.lower().strip() == q:
            return c, 100.0

    try:
        results = _ratio_rapidfuzz(q, choices)
    except ImportError:
        logger.warning("rapidfuzz not installed — falling back to difflib")
        results = _ratio_difflib(q, choices)

    if not results:
        return None, 0.0

    top_match, top_score = results[0]

    if top_score >= threshold:
        logger.info(
            "Fuzzy match: '%s' → '%s' (score=%.1f)", query, top_match, top_score
        )
        return top_match, top_score

    logger.warning(
        "Fuzzy match below threshold for '%s': best='%s' score=%.1f threshold=%.1f",
        query, top_match, top_score, threshold,
    )
    return None, top_score