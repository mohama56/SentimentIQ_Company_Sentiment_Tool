"""
models/schemas.py — Pydantic models defining every data structure in the system.

These act as contracts between services. If a service returns a dict,
that dict must match one of these models.
"""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel, Field


# ── Raw document: normalised output from ANY data source ──────────────────────

class UnifiedDocument(BaseModel):
    """
    A single piece of content (Reddit post, news article, SEC filing excerpt).
    All ingestion sources normalise to this schema before NLP processing.
    """
    id:               str                    # unique identifier (url hash or post id)
    source:           str                    # "reddit" | "news" | "filing" | "financial"
    text:             str                    # cleaned body text
    url:              Optional[str] = None
    published_at:     Optional[str] = None   # ISO-8601 string
    hours_ago:        float = 0.0            # hours since publication (for recency decay)
    upvotes:          int   = 0
    comment_count:    int   = 0
    subreddit:        Optional[str] = None
    outlet:           Optional[str] = None   # news outlet name


# ── NLP output: one ProcessedSignal per UnifiedDocument ──────────────────────

class AspectScores(BaseModel):
    """Relevance-weighted sentiment per business dimension (0–1 scale)."""
    earnings_profitability: float = 0.5
    leadership_governance:  float = 0.5
    product_innovation:     float = 0.5
    macro_industry:         float = 0.5
    legal_regulatory:       float = 0.5


class ProcessedSignal(BaseModel):
    """
    Full NLP output for a single document. Combines VADER, FinBERT,
    aspect scores, and computed weights.
    """
    document_id:       str
    source:            str
    text_snippet:      str                   # first 200 chars, for evidence panel
    url:               Optional[str] = None
    outlet:            Optional[str] = None
    subreddit:         Optional[str] = None
    published_at:      Optional[str] = None

    # Sentiment
    vader_compound:    float = 0.0           # VADER compound score (-1 to 1)
    finbert_score:     float = 0.0           # FinBERT score (-1 to 1)
    ensemble_score:    float = 0.0           # weighted combination
    sentiment_label:   str   = "neutral"     # very_negative → very_positive

    # Aspect-level breakdown
    aspects:           AspectScores = Field(default_factory=AspectScores)

    # Event flags (e.g. "earnings_beat", "layoff_announced")
    event_flags:       list[str] = []

    # Computed weights (applied during scoring)
    recency_weight:    float = 1.0           # exp(-lambda * hours_ago)
    engagement_weight: float = 1.0           # log-normalised upvotes + comments
    credibility_weight: float = 1.0          # source credibility multiplier

    # Dedup
    embedding_hash:    Optional[str] = None  # SHA-256 of normalised text


# ── API response schemas ───────────────────────────────────────────────────────

class SourceBreakdown(BaseModel):
    news:      Optional[float] = None
    reddit:    Optional[float] = None
    filings:   Optional[float] = None
    financial: Optional[float] = None
    momentum:  Optional[float] = None


class FinancialMetrics(BaseModel):
    ticker:          str
    quarters:        list[str]   = []
    revenue_bn:      list[float] = []
    eps:             list[float] = []
    net_margin:      list[float] = []
    revenue_growth:  Optional[float] = None  # YoY latest quarter
    eps_trend:       str = "unknown"          # "increasing" | "decreasing" | "flat"


class EvidenceItem(BaseModel):
    source:       str
    outlet:       Optional[str] = None
    subreddit:    Optional[str] = None
    text:         str
    sentiment:    str
    published_at: Optional[str] = None
    upvotes:      Optional[int] = None
    url:          Optional[str] = None


class TemperatureResponse(BaseModel):
    """
    The primary API response — everything the dashboard needs in one payload.
    """
    company:            str
    ticker:             str
    temperature_score:  float                   # 0–100
    sentiment_label:    str                     # very_negative → very_positive
    confidence_score:   float                   # 0–1
    score_explanation:  str
    top_themes:         list[str]
    event_flags:        list[str]
    event_adjustment:   float                   # pts added/removed from events
    source_breakdown:   SourceBreakdown
    aspect_breakdown:   AspectScores
    financials:         Optional[FinancialMetrics] = None
    evidence:           dict[str, list[EvidenceItem]] = {}
    signal_count:       int = 0
    sentiment_history:  list[dict] = []
    computed_at:        str = ""


class CompanySearchResult(BaseModel):
    ticker:      str
    name:        str
    exchange:    Optional[str] = None
    sector:      Optional[str] = None
    description: Optional[str] = None


class TopicsResponse(BaseModel):
    ticker:     str
    topics:     list[str]
    topic_meta: list[dict] = []   # [{label, keywords, doc_count, sentiment}]