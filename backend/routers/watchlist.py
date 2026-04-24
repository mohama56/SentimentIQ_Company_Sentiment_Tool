"""
routers/watchlist.py — Exposes the auto-refresh watchlist and its latest scores.
"""
from fastapi import APIRouter
from services.history_service import load_history
from services.scheduler_service import WATCHLIST

router = APIRouter()


@router.get("/watchlist")
def get_watchlist():
    """
    Return the auto-tracked tickers and their most recent sentiment score.
    Scores are populated by the background scheduler — no user action needed.
    """
    results = []
    for ticker in WATCHLIST:
        history = load_history(ticker)
        latest  = history[-1] if history else None
        results.append({
            "ticker":     ticker,
            "score":      latest["score"]  if latest else None,
            "label":      latest["label"]  if latest else None,
            "date":       latest["date"]   if latest else None,
            "days_tracked": len(history),
        })
    return {"watchlist": results, "total": len(WATCHLIST)}
