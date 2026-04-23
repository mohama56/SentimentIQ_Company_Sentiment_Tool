"""
routers/topics.py — Topic modelling endpoint.
GET /api/v1/get_topics?ticker=TSLA
"""
import logging
from fastapi import APIRouter, HTTPException, Query
from models.schemas import TopicsResponse
from services.data_service import fetch_google_news, fetch_yahoo_news, fetch_reddit, resolve_company
from services.nlp_service import deduplicate, extract_topics

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/get_topics", response_model=TopicsResponse)
def get_topics(ticker: str = Query(...)):
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

    unique = deduplicate(docs)
    if not unique:
        raise HTTPException(status_code=404, detail=f"No content found for {ticker}")

    topics, topic_meta = extract_topics(unique)
    return TopicsResponse(ticker=ticker, topics=topics, topic_meta=topic_meta)