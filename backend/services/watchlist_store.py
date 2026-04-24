"""
services/watchlist_store.py — Persist the user's custom watchlist.

Stores tickers in backend/data/watchlist.json.
Initialised with a set of popular defaults on first run.
"""

import json
import logging
import os

logger = logging.getLogger(__name__)

DATA_DIR      = os.path.join(os.path.dirname(__file__), "..", "data")
WATCHLIST_FILE = os.path.join(DATA_DIR, "watchlist.json")

DEFAULTS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "JPM", "NFLX", "AMD"]


def _ensure():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(WATCHLIST_FILE):
        _write(DEFAULTS)


def _read() -> list[str]:
    try:
        with open(WATCHLIST_FILE) as f:
            return json.load(f)
    except Exception:
        return list(DEFAULTS)


def _write(tickers: list[str]):
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(WATCHLIST_FILE, "w") as f:
        json.dump(tickers, f, indent=2)


def get_watchlist() -> list[str]:
    _ensure()
    return _read()


def add_ticker(ticker: str) -> list[str]:
    _ensure()
    tickers = _read()
    ticker  = ticker.upper().strip()
    if ticker not in tickers:
        tickers.append(ticker)
        _write(tickers)
    return tickers


def remove_ticker(ticker: str) -> list[str]:
    _ensure()
    tickers = [t for t in _read() if t.upper() != ticker.upper()]
    _write(tickers)
    return tickers
