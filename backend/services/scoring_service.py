"""
services/scoring_service.py — Temperature Score computation engine.

This is the analytical core of the dashboard.

Formula (all components normalised to 0–1 before weighting):
  raw_score = (
      0.35 × news_sentiment +
      0.25 × reddit_sentiment +
      0.15 × filing_sentiment +
      0.15 × financial_trend +
      0.10 × momentum
  )

  event_adj  = bounded ±0.20 based on detected event flags
  final      = (raw_score + event_adj) × 100  → clamped to [0, 100]

Each source-level sentiment is itself a weighted average:
  weight_i = recency_weight × engagement_weight × credibility_weight
"""

import logging
import math
from collections import defaultdict
from datetime import datetime, timezone
from statistics import mean

from config import settings
from models.schemas import (
    AspectScores,
    EvidenceItem,
    ProcessedSignal,
    SourceBreakdown,
    TemperatureResponse,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Event adjustment table
# ─────────────────────────────────────────────────────────────────────────────
# Each event adds or subtracts from the raw 0–1 score.
# Total event_adj is capped at ±0.20 (±20 pts on the 0–100 scale).

EVENT_ADJUSTMENTS: dict[str, float] = {
    # Positive events
    "earnings_beat":         +0.08,
    "guidance_raised":       +0.06,
    "acquisition_announced": +0.04,

    # Negative events
    "earnings_miss":     -0.10,
    "guidance_lowered":  -0.08,
    "layoff_announced":  -0.07,
    "lawsuit_filed":     -0.06,
    "ceo_change":        -0.04,
}

# Human-readable explanation fragments per event
EVENT_EXPLANATIONS: dict[str, str] = {
    "earnings_beat":         "earnings beat detected (+8 pts)",
    "guidance_raised":       "forward guidance raised (+6 pts)",
    "acquisition_announced": "acquisition activity detected (+4 pts)",
    "earnings_miss":         "earnings miss detected (-10 pts)",
    "guidance_lowered":      "guidance reduction flagged (-8 pts)",
    "layoff_announced":      "layoff announcement detected (-7 pts)",
    "lawsuit_filed":         "legal/regulatory action detected (-6 pts)",
    "ceo_change":            "executive leadership change detected (-4 pts)",
}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _normalize_to_01(score: float) -> float:
    """Map a sentiment score in [-1, +1] to [0, 1]."""
    return (score + 1.0) / 2.0


def _weighted_average(signals: list[ProcessedSignal]) -> float:
    """
    Compute a triple-weighted average ensemble score for a list of signals.

    weight = recency_weight × engagement_weight × credibility_weight
    result = Σ(weight × score) / Σ(weight)

    Returns a value in [0, 1].
    If the signal list is empty, returns 0.5 (neutral default).
    """
    if not signals:
        return 0.5

    total_weight = 0.0
    weighted_sum = 0.0

    for sig in signals:
        weight = sig.recency_weight * sig.engagement_weight * sig.credibility_weight
        score_01 = _normalize_to_01(sig.ensemble_score)
        weighted_sum  += weight * score_01
        total_weight  += weight

    if total_weight == 0:
        return 0.5

    return weighted_sum / total_weight


def _source_signals(
    signals: list[ProcessedSignal], source: str
) -> list[ProcessedSignal]:
    """Filter signals to a single source."""
    return [s for s in signals if s.source == source]


def _financial_trend_score(financials: dict) -> float:
    """
    Convert quarterly financial data into a 0–1 trend score.

    Components:
    - Revenue growth: positive YoY → positive contribution
    - EPS trend: increasing > flat > decreasing
    - Net margin trend: direction of last-to-latest margin

    Returns 0.5 if no financial data is available.
    """
    if not financials or not financials.get("quarters"):
        return 0.5

    score = 0.5  # start neutral

    # Revenue growth contribution (±0.2 max)
    rev_growth = financials.get("revenue_growth")
    if rev_growth is not None:
        # Sigmoid-like: 20% growth → +0.1, -20% → -0.1
        score += 0.1 * math.tanh(rev_growth * 5)

    # EPS trend contribution (±0.15)
    eps_trend = financials.get("eps_trend", "flat")
    if eps_trend == "increasing":
        score += 0.15
    elif eps_trend == "decreasing":
        score -= 0.15

    # Margin trend: compare most recent vs oldest in the window
    margins = financials.get("net_margin", [])
    if len(margins) >= 2:
        margin_delta = margins[0] - margins[-1]   # positive = improving
        score += 0.1 * math.tanh(margin_delta * 20)

    return max(0.0, min(1.0, score))


def _compute_momentum(history: list[dict]) -> float:
    """
    Compute recent score momentum from historical temperature scores.

    Uses the slope of the last 5 data points (linear regression).
    Positive slope → above-neutral momentum (> 0.5).
    No history → neutral 0.5.
    """
    if len(history) < 2:
        return 0.5

    recent = history[-5:]  # last 5 data points
    n = len(recent)
    scores = [h.get("score", 50) / 100 for h in recent]

    # Simple linear regression slope
    xs = list(range(n))
    x_mean = mean(xs)
    y_mean = mean(scores)

    numerator   = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, scores))
    denominator = sum((x - x_mean) ** 2 for x in xs)

    if denominator == 0:
        return 0.5

    slope = numerator / denominator  # score change per step
    # Map slope to 0–1: slope of +0.05/step → ~0.75, -0.05 → ~0.25
    return max(0.0, min(1.0, 0.5 + slope * 5))


def _collect_event_flags(signals: list[ProcessedSignal]) -> list[str]:
    """Deduplicated list of all event flags across all signals."""
    all_flags: set[str] = set()
    for sig in signals:
        all_flags.update(sig.event_flags)
    return sorted(all_flags)


def _compute_event_adjustment(event_flags: list[str]) -> float:
    """
    Sum adjustments for all detected events, capped at ±0.20.
    Cap prevents a single catastrophic event from dominating the score.
    """
    total = sum(EVENT_ADJUSTMENTS.get(flag, 0.0) for flag in event_flags)
    return max(-0.20, min(0.20, total))


def _sentiment_label(score: float) -> str:
    """
    Map a 0–100 temperature score to a sentiment label.
    Boundaries tuned for financial context (markets lean optimistic).
    """
    if score < 25:   return "very_negative"
    if score < 40:   return "negative"
    if score < 55:   return "neutral"
    if score < 72:   return "positive"
    return "very_positive"


def _confidence_score(
    signals: list[ProcessedSignal],
    source_breakdown: SourceBreakdown,
) -> float:
    """
    Confidence = f(volume, diversity, recency).

    - Volume:    how many signals we processed (more = more confident)
    - Diversity: how many distinct sources contributed
    - Recency:   average recency weight of all signals

    Scale: 0.0 – 1.0
    """
    # Volume score: 50 signals → 1.0 (diminishing returns)
    volume_score = min(1.0, len(signals) / 50)

    # Diversity: count sources with data
    sources_with_data = sum(1 for v in [
        source_breakdown.news,
        source_breakdown.reddit,
        source_breakdown.filings,
        source_breakdown.financial,
    ] if v is not None)
    diversity_score = sources_with_data / 4.0

    # Recency: mean recency weight (1 = all same-day, 0 = all old)
    if signals:
        recency_score = mean(s.recency_weight for s in signals)
    else:
        recency_score = 0.0

    confidence = (
        0.40 * volume_score +
        0.40 * diversity_score +
        0.20 * recency_score
    )
    return round(confidence, 4)


def _build_explanation(
    source_breakdown: SourceBreakdown,
    event_flags: list[str],
    event_adjustment: float,
    signal_count: int,
    top_themes: list[str],
) -> str:
    """
    Generate a human-readable explanation of the temperature score.
    This is the 'why' behind the number.
    """
    parts: list[str] = []

    # Dominant source
    source_scores = {
        "news":      source_breakdown.news,
        "reddit":    source_breakdown.reddit,
        "filings":   source_breakdown.filings,
        "financial": source_breakdown.financial,
    }
    valid = {k: v for k, v in source_scores.items() if v is not None}
    if valid:
        dominant = max(valid, key=valid.get)
        dominant_val = valid[dominant]
        direction = "positive" if dominant_val > 55 else "negative" if dominant_val < 45 else "neutral"
        parts.append(f"Score primarily driven by {direction} {dominant} signals.")

    # Event flags
    if event_flags:
        event_desc = "; ".join(EVENT_EXPLANATIONS.get(f, f) for f in event_flags)
        adj_pts = round(event_adjustment * 100, 1)
        sign = "+" if adj_pts > 0 else ""
        parts.append(f"Event detection: {event_desc} (net adjustment: {sign}{adj_pts} pts).")

    # Top themes
    if top_themes:
        parts.append(f"Dominant themes: {', '.join(top_themes[:3])}.")

    # Signal volume
    parts.append(f"Based on {signal_count} deduplicated signals.")

    return " ".join(parts)


def _aggregate_aspects(signals: list[ProcessedSignal]) -> AspectScores:
    """
    Average aspect scores across all signals, weighted by ensemble sentiment confidence.
    """
    if not signals:
        return AspectScores()

    totals: dict[str, float] = defaultdict(float)
    count = len(signals)

    for sig in signals:
        for field in AspectScores.model_fields:
            totals[field] += getattr(sig.aspects, field, 0.5)

    return AspectScores(**{k: round(v / count, 4) for k, v in totals.items()})


def _top_evidence(
    signals: list[ProcessedSignal], source: str, n: int = 3
) -> list[EvidenceItem]:
    """
    Return the top N most impactful signals for a source as evidence snippets.
    Ranked by: abs(ensemble_score) × recency_weight × engagement_weight
    """
    source_sigs = _source_signals(signals, source)
    ranked = sorted(
        source_sigs,
        key=lambda s: abs(s.ensemble_score) * s.recency_weight * s.engagement_weight,
        reverse=True,
    )
    items: list[EvidenceItem] = []
    for sig in ranked[:n]:
        items.append(EvidenceItem(
            source=sig.source,
            outlet=sig.outlet,
            subreddit=sig.subreddit,
            text=sig.text_snippet,
            sentiment=sig.sentiment_label,
            published_at=sig.published_at,
            upvotes=None if sig.source != "reddit" else 0,
            url=sig.url,
        ))
    return items


# ─────────────────────────────────────────────────────────────────────────────
# Main scoring function
# ─────────────────────────────────────────────────────────────────────────────

def compute_temperature_score(
    ticker: str,
    company_name: str,
    signals: list[ProcessedSignal],
    financials: dict,
    topics: list[str],
    history: list[dict] | None = None,
) -> TemperatureResponse:
    """
    Compute the Company Temperature Score (0–100) and build the full response.

    Args:
        ticker:       Stock ticker symbol (e.g. "TSLA")
        company_name: Full company name
        signals:      List of NLP-processed signals (all sources)
        financials:   Dict from data_service.fetch_financials()
        topics:       List of topic strings from nlp_service.extract_topics()
        history:      Optional list of past {date, score} dicts for momentum

    Returns:
        TemperatureResponse — the complete API response payload
    """
    history = history or []

    # ── 1. Aggregate per-source scores ───────────────────────────────────────
    news_score     = _weighted_average(_source_signals(signals, "news"))
    reddit_score   = _weighted_average(_source_signals(signals, "reddit"))
    filing_score   = _weighted_average(_source_signals(signals, "filing"))
    financial_score = _financial_trend_score(financials)
    momentum_score = _compute_momentum(history)

    # ── 2. Source breakdown (convert 0–1 to 0–100 for readability) ───────────
    source_breakdown = SourceBreakdown(
        news=round(news_score * 100, 1)      if _source_signals(signals, "news")    else None,
        reddit=round(reddit_score * 100, 1)  if _source_signals(signals, "reddit")  else None,
        filings=round(filing_score * 100, 1) if _source_signals(signals, "filing")  else None,
        financial=round(financial_score * 100, 1),
        momentum=round(momentum_score * 100, 1),
    )

    # ── 3. Weighted composite (weights defined in config.py) ─────────────────
    raw_score = (
        settings.WEIGHT_NEWS      * news_score     +
        settings.WEIGHT_REDDIT    * reddit_score   +
        settings.WEIGHT_FILINGS   * filing_score   +
        settings.WEIGHT_FINANCIAL * financial_score +
        settings.WEIGHT_MOMENTUM  * momentum_score
    )

    # ── 4. Event detection and adjustment ────────────────────────────────────
    event_flags      = _collect_event_flags(signals)
    event_adjustment = _compute_event_adjustment(event_flags)
    adjusted_score   = raw_score + event_adjustment

    # ── 5. Final temperature score (0–100) ───────────────────────────────────
    temperature_score = round(max(0.0, min(100.0, adjusted_score * 100)), 1)
    sentiment_label   = _sentiment_label(temperature_score)

    # ── 6. Confidence ────────────────────────────────────────────────────────
    confidence = _confidence_score(signals, source_breakdown)

    # ── 7. Aspect aggregation ────────────────────────────────────────────────
    aspect_breakdown = _aggregate_aspects(signals)

    # ── 8. Explanation ───────────────────────────────────────────────────────
    explanation = _build_explanation(
        source_breakdown, event_flags, event_adjustment, len(signals), topics
    )

    # ── 9. Evidence snippets ─────────────────────────────────────────────────
    evidence = {
        "news":    _top_evidence(signals, "news"),
        "reddit":  _top_evidence(signals, "reddit"),
        "filings": _top_evidence(signals, "filing"),
    }

    # ── 10. Assemble response ────────────────────────────────────────────────
    from models.schemas import FinancialMetrics

    fin_metrics = None
    if financials:
        fin_metrics = FinancialMetrics(
            ticker=ticker,
            quarters=financials.get("quarters", []),
            revenue_bn=financials.get("revenue_bn", []),
            eps=financials.get("eps", []),
            net_margin=financials.get("net_margin", []),
            revenue_growth=financials.get("revenue_growth"),
            eps_trend=financials.get("eps_trend", "unknown"),
        )

    return TemperatureResponse(
        company=company_name,
        ticker=ticker.upper(),
        temperature_score=temperature_score,
        sentiment_label=sentiment_label,
        confidence_score=round(confidence, 4),
        score_explanation=explanation,
        top_themes=topics[:6],
        event_flags=event_flags,
        event_adjustment=round(event_adjustment * 100, 1),
        source_breakdown=source_breakdown,
        aspect_breakdown=aspect_breakdown,
        financials=fin_metrics,
        evidence=evidence,
        signal_count=len(signals),
        computed_at=datetime.now(tz=timezone.utc).isoformat(),
    )
