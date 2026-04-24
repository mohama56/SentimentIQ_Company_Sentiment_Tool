"""
services/scheduler_service.py — Background auto-refresh scheduler.

Runs the full analysis pipeline for a default watchlist of tickers
once per day, so historical sentiment data accumulates automatically
without requiring a user to manually search for each company.

How it works:
  - On startup, waits 90 seconds (lets the server warm up and models load)
  - Processes each ticker in the watchlist one at a time
  - Waits 30 seconds between tickers to avoid rate-limiting APIs
  - Sleeps 24 hours then repeats

History is stored via history_service.save_score — same as manual searches.
"""

import asyncio
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Tickers to auto-refresh daily. Add or remove as needed.
WATCHLIST = [
    "AAPL", "MSFT", "NVDA", "AMZN", "GOOGL",
    "META", "TSLA", "JPM",  "NFLX", "AMD",
]

STARTUP_DELAY_SECONDS  = 90    # wait after boot before first run
BETWEEN_TICKER_SECONDS = 30    # pause between tickers (API rate limit courtesy)
REFRESH_INTERVAL_HOURS = 24    # full cycle runs once per day


def _run_analysis(ticker: str) -> None:
    """
    Synchronous: run the full pipeline for one ticker and save the score.
    Mirrors exactly what the /get_temperature_score endpoint does.
    """
    from services.data_service import (
        fetch_reddit, fetch_google_news, fetch_yahoo_news,
        fetch_stocktwits, fetch_financial_rss, fetch_gnews,
        fetch_edgar, fetch_financials, resolve_company,
    )
    from services.history_service import load_history, save_score
    from services.nlp_service import deduplicate, extract_topics, process_documents
    from services.scoring_service import compute_temperature_score
    from concurrent.futures import ThreadPoolExecutor, as_completed

    company_info = resolve_company(ticker)
    company_name = company_info.get("name", ticker)
    history      = load_history(ticker)

    fetch_tasks = [
        (fetch_reddit,        (ticker, company_name)),
        (fetch_google_news,   (ticker, company_name)),
        (fetch_yahoo_news,    (ticker,)),
        (fetch_stocktwits,    (ticker,)),
        (fetch_financial_rss, (ticker, company_name)),
        (fetch_gnews,         (ticker, company_name)),
        (fetch_edgar,         (ticker,)),
        (fetch_financials,    (ticker,)),
    ]

    all_docs   = []
    financials = {}

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fn, *args): fn.__name__ for fn, args in fetch_tasks}
        for future in as_completed(futures, timeout=60):
            name = futures[future]
            try:
                result = future.result()
                if name == "fetch_financials":
                    financials = result or {}
                else:
                    all_docs.extend(result or [])
            except Exception as e:
                logger.debug(f"[scheduler] {ticker} — {name} failed: {e}")

    if not all_docs:
        logger.warning(f"[scheduler] {ticker} — no data, skipping")
        return

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

    save_score(ticker, result.temperature_score, result.sentiment_label, result.computed_at)
    logger.info(f"[scheduler] {ticker} → {result.temperature_score} ({result.sentiment_label})")


async def run_scheduler() -> None:
    """
    Async loop: wait for server warm-up, then refresh all watchlist tickers
    once per day. Runs forever in the background.
    """
    logger.info(f"[scheduler] Starting — first run in {STARTUP_DELAY_SECONDS}s")
    await asyncio.sleep(STARTUP_DELAY_SECONDS)

    loop = asyncio.get_event_loop()

    while True:
        now = datetime.now(tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        logger.info(f"[scheduler] Daily refresh started at {now} — {len(WATCHLIST)} tickers")

        for ticker in WATCHLIST:
            try:
                # Run synchronous pipeline in a thread so we don't block the event loop
                await loop.run_in_executor(None, _run_analysis, ticker)
            except Exception as e:
                logger.error(f"[scheduler] {ticker} failed: {e}")

            # Courtesy pause between tickers
            await asyncio.sleep(BETWEEN_TICKER_SECONDS)

        logger.info(f"[scheduler] Daily refresh complete. Next run in {REFRESH_INTERVAL_HOURS}h")
        await asyncio.sleep(REFRESH_INTERVAL_HOURS * 3600)
