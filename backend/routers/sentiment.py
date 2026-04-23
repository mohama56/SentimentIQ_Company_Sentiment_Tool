"""
routers/sentiment.py — Lightweight sentiment-only endpoint.
GET /api/v1/get_sentiment?ticker=TSLA
"""
import logging
from fastapi import APIRouter, HTTPException, Query
from services.data_service import fetch_google_news, fetch_yahoo_news, fetch_reddit, resolve_company
from services.nlp_service import deduplicate, process_documents

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/get_sentiment")
def get_sentiment(ticker: str = Query(...)):
    ticker = ticker.strip().upper()
    company_info = resolve_company(ticker)
    company_name = company_info.get("name", ticker)

    docs = []
    for fetcher, args in [
        (fetch_google_news, (ticker, company_name)),
        (fetch_yahoo_news,  (ticker,)),
        (fetch_reddit,      (ticker, company_name)),
    ]:
        try:
            docs.extend(fetcher(*args))
        except Exception as e:
            logger.warning(f"{fetcher.__name__} failed: {e}")

    unique  = deduplicate(docs)
    signals = process_documents(unique)

    if not signals:
        raise HTTPException(status_code=404, detail=f"No sentiment data for {ticker}")

    def source_summary(source):
        src = [s for s in signals if s.source == source]
        if not src:
            return None
        avg = sum(s.ensemble_score for s in src) / len(src)
        counts = {}
        for s in src:
            counts[s.sentiment_label] = counts.get(s.sentiment_label, 0) + 1
        return {"avg_score": round(avg, 4), "label": max(counts, key=counts.get), "doc_count": len(src)}

    return {"ticker": ticker, "company": company_name,
            "news": source_summary("news"), "reddit": source_summary("reddit"),
            "total_docs": len(signals)}