"""
routers/watchlist.py — CRUD endpoints for the custom watchlist.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.history_service import load_history
from services.watchlist_store import get_watchlist, add_ticker, remove_ticker

router = APIRouter()


class AddRequest(BaseModel):
    ticker: str


@router.get("/watchlist")
def get_watchlist_scores():
    """Return all tracked tickers with their latest scores and history length."""
    results = []
    for ticker in get_watchlist():
        history = load_history(ticker)
        latest  = history[-1] if history else None
        results.append({
            "ticker":       ticker,
            "score":        latest["score"]        if latest else None,
            "label":        latest["label"]        if latest else None,
            "date":         latest["date"]         if latest else None,
            "computed_at":  latest.get("computed_at") if latest else None,
            "days_tracked": len(history),
            "history":      [{"date": h["date"], "score": h["score"]} for h in history[-7:]],
        })
    return {"watchlist": results, "total": len(results)}


@router.post("/watchlist")
def add_to_watchlist(body: AddRequest):
    """Add a ticker to the watchlist."""
    ticker = body.ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker is required")
    if len(ticker) > 8:
        raise HTTPException(status_code=400, detail="Invalid ticker")
    updated = add_ticker(ticker)
    return {"message": f"{ticker} added to watchlist", "watchlist": updated}


@router.delete("/watchlist/{ticker}")
def remove_from_watchlist(ticker: str):
    """Remove a ticker from the watchlist."""
    ticker  = ticker.strip().upper()
    updated = remove_ticker(ticker)
    return {"message": f"{ticker} removed from watchlist", "watchlist": updated}
