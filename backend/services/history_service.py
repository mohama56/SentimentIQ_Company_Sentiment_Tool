"""
services/history_service.py — Persist and retrieve sentiment score history.

Stores one JSON file per ticker at:
  backend/data/history/{TICKER}.json

Each file is a list of daily records:
  [{"date": "2026-04-19", "score": 72.4, "label": "positive"}, ...]

On each analysis run, today's score is upserted (one record per day).
This gives real historical trend data without needing a database.
"""

import json
import logging
import os
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Store history files next to the backend code
HISTORY_DIR = os.path.join(os.path.dirname(__file__), "..", "data", "history")


def _ensure_dir():
    os.makedirs(HISTORY_DIR, exist_ok=True)


def _filepath(ticker: str) -> str:
    return os.path.join(HISTORY_DIR, f"{ticker.upper()}.json")


def load_history(ticker: str) -> list[dict]:
    """
    Load all historical score records for a ticker.
    Returns a list sorted oldest → newest.
    Returns [] if no history exists yet.
    """
    _ensure_dir()
    path = _filepath(ticker)

    if not os.path.exists(path):
        return []

    try:
        with open(path, "r") as f:
            data = json.load(f)
        # Sort oldest first for chart rendering
        return sorted(data, key=lambda x: x["date"])
    except Exception as e:
        logger.error(f"History load failed for {ticker}: {e}")
        return []


def save_score(ticker: str, score: float, label: str, computed_at: str):
    """
    Upsert today's score for a ticker.
    One record per calendar day — re-running today overwrites today's entry.
    """
    _ensure_dir()
    path = _filepath(ticker)

    # Get today's date string in UTC
    today = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d")

    # Load existing history
    history = load_history(ticker)

    # Remove any existing entry for today (upsert)
    history = [h for h in history if h.get("date") != today]

    # Append today's record
    history.append({
        "date":        today,
        "score":       round(score, 1),
        "label":       label,
        "computed_at": computed_at,
    })

    # Keep last 90 days max
    history = sorted(history, key=lambda x: x["date"])[-90:]

    try:
        with open(path, "w") as f:
            json.dump(history, f, indent=2)
        logger.info(f"History saved: {ticker} → {score} on {today}")
    except Exception as e:
        logger.error(f"History save failed for {ticker}: {e}")
