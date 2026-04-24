"""
config.py — Central configuration for API keys, weights, and constants.

Copy this file to config_local.py and fill in your real keys.
Never commit real keys to version control.
"""

from dotenv import load_dotenv
load_dotenv()
import os
from dataclasses import dataclass


@dataclass
class Config:
    # ── Reddit (PRAW) ──────────────────────────────────────────────────────────
    # Create a free app at: https://www.reddit.com/prefs/apps
    REDDIT_CLIENT_ID:     str = os.getenv("REDDIT_CLIENT_ID",     "YOUR_REDDIT_CLIENT_ID")
    REDDIT_CLIENT_SECRET: str = os.getenv("REDDIT_CLIENT_SECRET", "YOUR_REDDIT_CLIENT_SECRET")
    REDDIT_USER_AGENT:    str = os.getenv("REDDIT_USER_AGENT",    "SentimentDashboard/1.0")

    # ── News (GNews) ───────────────────────────────────────────────────────────
    # Free tier at: https://gnews.io  (100 req/day)
    GNEWS_API_KEY: str = os.getenv("GNEWS_API_KEY", "YOUR_GNEWS_API_KEY")

    # ── Financial data (Alpha Vantage) ─────────────────────────────────────────
    # Free tier at: https://www.alphavantage.co  (25 req/day)
    ALPHA_VANTAGE_KEY: str = os.getenv("ALPHA_VANTAGE_KEY", "YOUR_ALPHA_VANTAGE_KEY")

    # ── SEC EDGAR — no key required ────────────────────────────────────────────
    EDGAR_BASE_URL: str = "https://data.sec.gov/submissions"
    EDGAR_SEARCH_URL: str = "https://efts.sec.gov/LATEST/search-index?q="

    # ── Scoring weights (must sum to 1.0) ──────────────────────────────────────
    WEIGHT_NEWS:      float = 0.35
    WEIGHT_REDDIT:    float = 0.25
    WEIGHT_FILINGS:   float = 0.15
    WEIGHT_FINANCIAL: float = 0.15
    WEIGHT_MOMENTUM:  float = 0.10

    # ── NLP settings ───────────────────────────────────────────────────────────
    FINBERT_MODEL:   str   = "ProsusAI/finbert"
    SBERT_MODEL:     str   = "all-MiniLM-L6-v2"
    DEDUP_THRESHOLD: float = 0.92   # cosine similarity threshold for near-duplicates
    MAX_TEXT_LENGTH: int   = 512    # max tokens for FinBERT

    # ── Recency decay ──────────────────────────────────────────────────────────
    # lambda in exp(-lambda * hours). Higher = faster decay.
    RECENCY_LAMBDA: float = 0.08

    # ── Data fetch limits ──────────────────────────────────────────────────────
    REDDIT_POST_LIMIT:   int = 50
    NEWS_ARTICLE_LIMIT:  int = 30
    BERTOPIC_MIN_DOCS:   int = 999  # effectively disabled on Railway — keyword fallback is instant


settings = Config()
