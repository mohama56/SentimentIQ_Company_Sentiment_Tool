"""
routers/temperature.py — Primary analysis endpoint.
"""
import logging
from fastapi import APIRouter, HTTPException, Query
from models.schemas import TemperatureResponse
from services.data_service import (
    fetch_reddit,
    fetch_google_news,
    fetch_yahoo_news,
    fetch_stocktwits,
    fetch_financial_rss,
    fetch_gnews,
    fetch_edgar,
    fetch_financials,
    resolve_company,
)
from services.history_service import load_history, save_score
from services.nlp_service import deduplicate, extract_topics, process_documents
from services.scoring_service import compute_temperature_score

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/get_temperature_score", response_model=TemperatureResponse)
def get_temperature_score(ticker: str = Query(..., description="Stock ticker, e.g. TSLA")):
    ticker = ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=400, detail="Ticker is required")

    company_info = resolve_company(ticker)
    company_name = company_info.get("name", ticker)
    logger.info(f"Starting analysis for {ticker} ({company_name})")

    # Load real saved history for momentum + trend chart
    history = load_history(ticker)

    # Fetch from all sources — each is independent, failures return []
    all_docs = []
    financials = {}

    for fetcher, args in [
        (fetch_reddit,        (ticker, company_name)),
        (fetch_google_news,   (ticker, company_name)),
        (fetch_yahoo_news,    (ticker,)),
        (fetch_stocktwits,    (ticker,)),
        (fetch_financial_rss, (ticker, company_name)),
        (fetch_gnews,         (ticker, company_name)),
        (fetch_edgar,         (ticker,)),
    ]:
        try:
            all_docs.extend(fetcher(*args))
        except Exception as e:
            logger.warning(f"{fetcher.__name__} failed: {e}")

    try:
        financials = fetch_financials(ticker)
    except Exception as e:
        logger.warning(f"Financials failed: {e}")

    if not all_docs:
        raise HTTPException(
            status_code=404,
            detail=f"No data found for '{ticker}'. Check API keys or try a major US ticker."
        )

    unique_docs = deduplicate(all_docs)
    signals     = process_documents(unique_docs)
    topics, _   = extract_topics(unique_docs)

    result = compute_temperature_score(
        ticker=ticker,
        company_name=company_name,
        signals=signals,
        financials=financials,
        topics=topics,
        history=history,
    )

    # Save today's score — builds real historical trend
    save_score(ticker, result.temperature_score, result.sentiment_label, result.computed_at)

    # Attach full real history to response
    full_history = load_history(ticker)
    result.sentiment_history = [{"date": h["date"], "score": h["score"]} for h in full_history]

    logger.info(f"Done: {ticker} → {result.temperature_score} ({len(full_history)} days history)")
    return result