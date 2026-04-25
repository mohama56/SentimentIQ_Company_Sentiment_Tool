"""
routers/company.py — Company lookup endpoint.

GET /api/v1/search_company?ticker=TSLA
  Resolves a ticker to company name, sector, and description.
  This is the first call the UI makes to confirm the ticker is valid.
"""

import httpx
from fastapi import APIRouter, HTTPException, Query
from models.schemas import CompanySearchResult
from services.data_service import resolve_company

router = APIRouter()


@router.get("/search_company", response_model=CompanySearchResult)
def search_company(ticker: str = Query(..., description="Stock ticker symbol, e.g. TSLA")):
    """
    Resolve a ticker symbol to company metadata.
    Uses Alpha Vantage OVERVIEW endpoint (falls back to mock if no key).
    """
    ticker = ticker.strip().upper()
    if not ticker or len(ticker) > 10:
        raise HTTPException(status_code=400, detail="Invalid ticker symbol")

    result = resolve_company(ticker)

    if not result.get("name"):
        raise HTTPException(status_code=404, detail=f"Company not found for ticker: {ticker}")

    return CompanySearchResult(
        ticker=result["ticker"],
        name=result["name"],
        exchange=result.get("exchange"),
        sector=result.get("sector"),
        description=result.get("description"),
    )


@router.get("/search_tickers")
def search_tickers(q: str = Query(..., min_length=1)):
    """
    Live company search — proxies Yahoo Finance autocomplete.
    Returns matching tickers/names for any publicly traded company.
    """
    q = q.strip()
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(
                "https://query1.finance.yahoo.com/v1/finance/search",
                params={"q": q, "quotesCount": 8, "newsCount": 0, "enableFuzzyQuery": True},
                headers={"User-Agent": "Mozilla/5.0"},
            )
        quotes = resp.json().get("quotes", [])
        results = [
            {
                "ticker": q["symbol"],
                "name":   q.get("shortname") or q.get("longname") or q["symbol"],
                "type":   q.get("quoteType", ""),
                "exchange": q.get("exchDisp", ""),
            }
            for q in quotes
            if q.get("symbol") and q.get("quoteType") in ("EQUITY", "ETF")
        ]
        return {"results": results}
    except Exception as e:
        return {"results": [], "error": str(e)}
