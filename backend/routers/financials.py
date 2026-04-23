"""
routers/financials.py — Quarterly financial data endpoint.

GET /api/v1/get_financials?ticker=TSLA
  Returns the last 4 quarters of revenue, EPS, and net margin.
  Data sourced from Alpha Vantage (or mock data if no key configured).
"""

from fastapi import APIRouter, HTTPException, Query

from models.schemas import FinancialMetrics
from services.data_service import fetch_financials

router = APIRouter()


@router.get("/get_financials", response_model=FinancialMetrics)
def get_financials(ticker: str = Query(..., description="Stock ticker, e.g. TSLA")):
    """
    Return quarterly financial metrics for the last 4 quarters.
    Includes revenue growth and EPS trend direction.
    """
    ticker = ticker.strip().upper()
    data   = fetch_financials(ticker)

    if not data or not data.get("quarters"):
        raise HTTPException(status_code=404, detail=f"No financial data for {ticker}")

    return FinancialMetrics(
        ticker=ticker,
        quarters=data["quarters"],
        revenue_bn=data["revenue_bn"],
        eps=data["eps"],
        net_margin=data["net_margin"],
        revenue_growth=data.get("revenue_growth"),
        eps_trend=data.get("eps_trend", "unknown"),
    )
