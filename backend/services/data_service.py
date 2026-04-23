"""
services/data_service.py — Data ingestion layer.

All sources work with zero API keys:
  - Reddit:        Public JSON endpoints (no OAuth needed)
  - Google News:   RSS feed, free, no key
  - Yahoo News:    RSS feed, free, no key
  - StockTwits:    Public API, no key
  - Financial RSS: MarketBeat, Seeking Alpha
  - SEC EDGAR:     data.sec.gov, free, no key
  - Financials:    Financial Modeling Prep free tier, no key
  - GNews:         Optional upgrade with free key at gnews.io
"""

import hashlib
import logging
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Optional

import httpx

from config import settings
from models.schemas import UnifiedDocument

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _make_id(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


def _hours_ago(iso_or_ts) -> float:
    try:
        if isinstance(iso_or_ts, (int, float)):
            dt = datetime.fromtimestamp(iso_or_ts, tz=timezone.utc)
        else:
            dt = datetime.fromisoformat(str(iso_or_ts).replace("Z", "+00:00"))
        return max(0.0, (datetime.now(tz=timezone.utc) - dt).total_seconds() / 3600)
    except Exception:
        return 24.0


def _clean(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"http\S+", "", text)
    text = re.sub(r"\s{2,}", " ", text).strip()
    return text[:2000]


def _parse_rss_date(raw: str):
    try:
        dt = parsedate_to_datetime(raw)
        return dt.isoformat(), _hours_ago(dt.isoformat())
    except Exception:
        return None, 24.0


# ─────────────────────────────────────────────────────────────────────────────
# Reddit — public JSON endpoints, no API key needed
# ─────────────────────────────────────────────────────────────────────────────

def fetch_reddit(ticker: str, company_name: str) -> list[UnifiedDocument]:
    """
    Scrape Reddit posts AND comments using public JSON endpoints.

    Reddit makes all public data available as JSON by adding .json to any URL.
    No API key, no OAuth, no registration required.

    Searches r/stocks, r/investing, r/wallstreetbets, r/StockMarket.
    Fetches top comments from high-engagement posts for richer signal.
    Sleeps 1 second between requests to respect Reddit's rate limit.
    """
    SUBREDDITS = ["stocks", "investing", "wallstreetbets", "StockMarket"]
    docs: list[UnifiedDocument] = []
    query = f"{ticker} {company_name}"

    for subreddit in SUBREDDITS:
        try:
            url = f"https://www.reddit.com/r/{subreddit}/search.json"
            params = {
                "q":           query,
                "sort":        "relevance",
                "t":           "week",
                "limit":       20,
                "restrict_sr": 1,
            }

            with httpx.Client(timeout=15.0, headers=HEADERS, follow_redirects=True) as client:
                resp = client.get(url, params=params)

            time.sleep(1.0)

            if resp.status_code == 429:
                logger.warning(f"Reddit rate limited on r/{subreddit} — waiting 5s")
                time.sleep(5.0)
                continue
            if resp.status_code != 200:
                logger.warning(f"Reddit r/{subreddit} returned {resp.status_code}")
                continue

            posts = resp.json().get("data", {}).get("children", [])

            for pw in posts:
                post         = pw.get("data", {})
                score        = post.get("score", 0) or 0
                num_comments = post.get("num_comments", 0) or 0

                if score < 2 and num_comments < 1:
                    continue

                title    = post.get("title", "")
                selftext = post.get("selftext", "")
                body     = _clean(
                    f"{title}. {selftext}"
                    if selftext and selftext not in ("[removed]", "[deleted]")
                    else title
                )
                if len(body) < 20:
                    continue

                permalink = post.get("permalink", "")
                created   = post.get("created_utc", 0)
                post_id   = post.get("id", "")

                docs.append(UnifiedDocument(
                    id=_make_id(permalink or body),
                    source="reddit",
                    text=body,
                    url=f"https://reddit.com{permalink}" if permalink else None,
                    published_at=datetime.fromtimestamp(
                        created, tz=timezone.utc
                    ).isoformat() if created else None,
                    hours_ago=_hours_ago(created) if created else 24.0,
                    upvotes=max(0, score),
                    comment_count=num_comments,
                    subreddit=subreddit,
                ))

                # Fetch top comments for high-engagement posts
                if score > 50 and post_id:
                    try:
                        comments_url = (
                            f"https://www.reddit.com/r/{subreddit}"
                            f"/comments/{post_id}.json?limit=10&sort=top"
                        )
                        with httpx.Client(
                            timeout=12.0, headers=HEADERS, follow_redirects=True
                        ) as client:
                            cr = client.get(comments_url)
                        time.sleep(1.0)

                        if cr.status_code == 200:
                            payload = cr.json()
                            if len(payload) > 1:
                                children = (
                                    payload[1]
                                    .get("data", {})
                                    .get("children", [])
                                )
                                for cw in children[:8]:
                                    c      = cw.get("data", {})
                                    cbody  = _clean(c.get("body", ""))
                                    csc    = c.get("score", 0) or 0
                                    ccr    = c.get("created_utc", 0)
                                    if (
                                        len(cbody) < 30
                                        or cbody in ("[removed]", "[deleted]")
                                    ):
                                        continue
                                    docs.append(UnifiedDocument(
                                        id=_make_id(cbody + str(c.get("id", ""))),
                                        source="reddit",
                                        text=cbody,
                                        url=f"https://reddit.com{permalink}" if permalink else None,
                                        published_at=datetime.fromtimestamp(
                                            ccr, tz=timezone.utc
                                        ).isoformat() if ccr else None,
                                        hours_ago=_hours_ago(ccr) if ccr else 24.0,
                                        upvotes=max(0, csc),
                                        comment_count=0,
                                        subreddit=subreddit,
                                    ))
                    except Exception as e:
                        logger.debug(f"Comment fetch failed for {post_id}: {e}")

        except Exception as e:
            logger.warning(f"Reddit r/{subreddit} failed: {e}")
            continue

    logger.info(f"Reddit: {len(docs)} posts+comments for {ticker}")
    return docs


# ─────────────────────────────────────────────────────────────────────────────
# Google News RSS — free, no key
# ─────────────────────────────────────────────────────────────────────────────

def fetch_google_news(ticker: str, company_name: str) -> list[UnifiedDocument]:
    """Pull from Google News RSS. Free, no key required."""
    docs: list[UnifiedDocument] = []
    queries = [
        f"{ticker} stock",
        f"{company_name} earnings",
        f"{ticker} market",
    ]

    for query in queries:
        url = (
            f"https://news.google.com/rss/search"
            f"?q={query.replace(' ', '+')}&hl=en-US&gl=US&ceid=US:en"
        )
        try:
            with httpx.Client(timeout=12.0, headers=HEADERS, follow_redirects=True) as client:
                resp = client.get(url)
                resp.raise_for_status()

            root = ET.fromstring(resp.text)
            for item in root.findall(".//item")[:12]:
                title  = item.findtext("title", "")
                desc   = item.findtext("description", "")
                link   = item.findtext("link", "")
                pub    = item.findtext("pubDate", "")
                src_el = item.find("source")
                outlet = src_el.text if src_el is not None else "Google News"
                body   = _clean(f"{title}. {desc}")
                if len(body) < 30:
                    continue
                pub_iso, hours = _parse_rss_date(pub)
                docs.append(UnifiedDocument(
                    id=_make_id(link or body),
                    source="news",
                    text=body,
                    url=link or None,
                    published_at=pub_iso,
                    hours_ago=hours,
                    outlet=outlet,
                ))
        except Exception as e:
            logger.warning(f"Google News failed for '{query}': {e}")

    logger.info(f"Google News: {len(docs)} articles for {ticker}")
    return docs


# ─────────────────────────────────────────────────────────────────────────────
# Yahoo Finance News RSS — free, no key
# ─────────────────────────────────────────────────────────────────────────────

def fetch_yahoo_news(ticker: str) -> list[UnifiedDocument]:
    """Pull Yahoo Finance news RSS. Free, no key. Tries multiple URL formats."""
    docs: list[UnifiedDocument] = []
    # Yahoo has changed their RSS URL several times — try both
    urls = [
        f"https://finance.yahoo.com/rss/headline?s={ticker}",
        f"https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US",
    ]
    for url in urls:
        try:
            with httpx.Client(timeout=12.0, headers=HEADERS, follow_redirects=True) as client:
                resp = client.get(url)
                if resp.status_code != 200:
                    continue
            root = ET.fromstring(resp.text)
            for item in root.findall(".//item")[:15]:
                title = item.findtext("title", "")
                desc  = item.findtext("description", "")
                link  = item.findtext("link", "")
                pub   = item.findtext("pubDate", "")
                body  = _clean(f"{title}. {desc}")
                if len(body) < 30:
                    continue
                pub_iso, hours = _parse_rss_date(pub)
                docs.append(UnifiedDocument(
                    id=_make_id(link or body),
                    source="news",
                    text=body,
                    url=link or None,
                    published_at=pub_iso,
                    hours_ago=hours,
                    outlet="Yahoo Finance",
                ))
            if docs:
                break  # got results from this URL, stop trying
        except Exception as e:
            logger.debug(f"Yahoo Finance RSS {url} failed: {e}")
            continue

    logger.info(f"Yahoo Finance RSS: {len(docs)} articles for {ticker}")
    return docs


# ─────────────────────────────────────────────────────────────────────────────
# StockTwits — free, no key
# ─────────────────────────────────────────────────────────────────────────────

def fetch_stocktwits(ticker: str) -> list[UnifiedDocument]:
    """Pull StockTwits messages. Free public API, no key required."""
    docs: list[UnifiedDocument] = []
    url = f"https://api.stocktwits.com/api/2/streams/symbol/{ticker}.json"
    try:
        with httpx.Client(timeout=10.0, headers=HEADERS) as client:
            resp = client.get(url, params={"limit": 30})
            resp.raise_for_status()

        for msg in resp.json().get("messages", []):
            body = _clean(msg.get("body", ""))
            if len(body) < 15:
                continue
            created = msg.get("created_at", "")
            sent    = msg.get("entities", {}).get("sentiment", {})
            tag     = sent.get("basic", "") if sent else ""
            if tag:
                body = f"[{tag.upper()}] {body}"
            likes    = msg.get("likes", {}).get("total", 0) or 0
            reshares = msg.get("reshares", {}).get("reshared_count", 0) or 0
            docs.append(UnifiedDocument(
                id=_make_id(str(msg.get("id", "")) + body),
                source="stocktwits",
                text=body,
                url=f"https://stocktwits.com/message/{msg.get('id', '')}",
                published_at=created,
                hours_ago=_hours_ago(created),
                upvotes=likes + reshares,
                outlet="StockTwits",
            ))
    except httpx.HTTPStatusError as e:
        logger.warning(f"StockTwits HTTP {e.response.status_code} for {ticker}")
    except Exception as e:
        logger.warning(f"StockTwits failed for {ticker}: {e}")

    logger.info(f"StockTwits: {len(docs)} posts for {ticker}")
    return docs


# ─────────────────────────────────────────────────────────────────────────────
# Financial RSS feeds — free, no key
# ─────────────────────────────────────────────────────────────────────────────

def fetch_financial_rss(ticker: str, company_name: str) -> list[UnifiedDocument]:
    """Pull from MarketBeat and Seeking Alpha RSS. Free, no key."""
    docs: list[UnifiedDocument] = []
    feeds = [
        (f"https://www.marketbeat.com/stocks/NASDAQ/{ticker}/rss/", "MarketBeat"),
        (f"https://seekingalpha.com/api/sa/combined/{ticker}.xml",  "Seeking Alpha"),
    ]
    for feed_url, outlet in feeds:
        try:
            with httpx.Client(timeout=10.0, headers=HEADERS, follow_redirects=True) as client:
                resp = client.get(feed_url)
                if resp.status_code != 200:
                    continue
            root = ET.fromstring(resp.text)
            for item in root.findall(".//item")[:8]:
                title = item.findtext("title", "")
                desc  = item.findtext("description", "") or item.findtext("summary", "")
                link  = item.findtext("link", "")
                pub   = item.findtext("pubDate", "") or item.findtext("published", "")
                body  = _clean(f"{title}. {desc}")
                if len(body) < 30:
                    continue
                pub_iso, hours = _parse_rss_date(pub)
                docs.append(UnifiedDocument(
                    id=_make_id(link or body),
                    source="news",
                    text=body,
                    url=link or None,
                    published_at=pub_iso,
                    hours_ago=hours,
                    outlet=outlet,
                ))
        except Exception as e:
            logger.debug(f"Financial RSS {outlet} failed: {e}")

    logger.info(f"Financial RSS: {len(docs)} articles for {ticker}")
    return docs


# ─────────────────────────────────────────────────────────────────────────────
# GNews — optional upgrade with free key at gnews.io
# ─────────────────────────────────────────────────────────────────────────────

def fetch_gnews(ticker: str, company_name: str) -> list[UnifiedDocument]:
    """Pull from GNews API. Optional — skipped if no key configured."""
    if settings.GNEWS_API_KEY == "YOUR_GNEWS_API_KEY":
        return []

    docs: list[UnifiedDocument] = []
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get("https://gnews.io/api/v4/search", params={
                "q":      f'"{ticker}" OR "{company_name}"',
                "lang":   "en",
                "country": "us",
                "max":    settings.NEWS_ARTICLE_LIMIT,
                "apikey": settings.GNEWS_API_KEY,
                "sortby": "publishedAt",
            })
            resp.raise_for_status()

        for article in resp.json().get("articles", []):
            body = _clean(" ".join(filter(None, [
                article.get("title", ""),
                article.get("description", ""),
                article.get("content", ""),
            ])))
            if len(body) < 30:
                continue
            pub = article.get("publishedAt", "")
            docs.append(UnifiedDocument(
                id=_make_id(article.get("url", body)),
                source="news",
                text=body,
                url=article.get("url"),
                published_at=pub,
                hours_ago=_hours_ago(pub),
                outlet=article.get("source", {}).get("name"),
            ))
    except Exception as e:
        logger.error(f"GNews failed for {ticker}: {e}")

    logger.info(f"GNews: {len(docs)} articles for {ticker}")
    return docs


# ─────────────────────────────────────────────────────────────────────────────
# SEC EDGAR — free, no key
# ─────────────────────────────────────────────────────────────────────────────

def fetch_edgar(ticker: str) -> list[UnifiedDocument]:
    """Pull SEC filing excerpts. Free, no key required."""
    docs: list[UnifiedDocument] = []
    edgar_headers = {"User-Agent": "SentimentDashboard contact@example.com"}

    try:
        cik = _get_cik(ticker)
        if not cik:
            return []

        with httpx.Client(timeout=15.0) as client:
            resp = client.get(
                f"https://data.sec.gov/submissions/CIK{cik.zfill(10)}.json",
                headers=edgar_headers,
            )
            resp.raise_for_status()

        data       = resp.json()
        recent     = data.get("filings", {}).get("recent", {})
        forms      = recent.get("form", [])
        dates      = recent.get("filingDate", [])
        accessions = recent.get("accessionNumber", [])

        target = {"8-K", "10-Q", "10-K"}
        count  = 0

        for form, date, acc in zip(forms, dates, accessions):
            if count >= 4:
                break
            if form not in target:
                continue

            acc_clean = acc.replace("-", "")
            index_url = (
                f"https://www.sec.gov/Archives/edgar/data/{cik}"
                f"/{acc_clean}/{acc}-index.htm"
            )
            search_url = (
                f"https://efts.sec.gov/LATEST/search-index?"
                f"q=%22{ticker}%22&dateRange=custom"
                f"&startdt={date}&enddt={date}&forms={form}"
            )

            try:
                with httpx.Client(timeout=10.0) as client:
                    sr = client.get(search_url, headers=edgar_headers)
                    sr.raise_for_status()

                for hit in sr.json().get("hits", {}).get("hits", [])[:2]:
                    src  = hit.get("_source", {})
                    text = _clean(
                        f"{form} filing ({date}): "
                        f"{src.get('display_names', '')} "
                        f"{src.get('period_of_report', '')}"
                    )
                    if len(text) > 20:
                        docs.append(UnifiedDocument(
                            id=_make_id(text),
                            source="filing",
                            text=text,
                            url=index_url,
                            published_at=f"{date}T00:00:00Z",
                            hours_ago=_hours_ago(f"{date}T00:00:00Z"),
                            outlet=f"SEC {form}",
                        ))
                        count += 1
            except Exception as e:
                logger.debug(f"EDGAR search failed for {acc}: {e}")

    except Exception as e:
        logger.error(f"EDGAR fetch failed for {ticker}: {e}")

    logger.info(f"EDGAR: {len(docs)} filings for {ticker}")
    return docs


def _get_cik(ticker: str) -> Optional[str]:
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                "https://www.sec.gov/files/company_tickers.json",
                headers={"User-Agent": "SentimentDashboard contact@example.com"},
            )
            resp.raise_for_status()
        for entry in resp.json().values():
            if entry.get("ticker", "").upper() == ticker.upper():
                return str(entry["cik_str"])
    except Exception as e:
        logger.error(f"CIK lookup failed for {ticker}: {e}")
    return None


# ─────────────────────────────────────────────────────────────────────────────
# Financials — FMP free tier (no key) with Alpha Vantage upgrade
# ─────────────────────────────────────────────────────────────────────────────

def fetch_financials(ticker: str) -> dict:
    """
    Fetch real quarterly financials.
    1. SEC EDGAR company facts API (completely free, no key, always works)
    2. Alpha Vantage (optional upgrade if key in .env)
    Returns {} if all fail — never returns fake data.
    """
    result = _fetch_edgar_financials(ticker)
    if result:
        return result

    if settings.ALPHA_VANTAGE_KEY != "YOUR_ALPHA_VANTAGE_KEY":
        result = _fetch_alpha_vantage_financials(ticker)
        if result:
            return result

    logger.warning(f"Financials unavailable for {ticker} — no data returned")
    return {}


def _fetch_edgar_financials(ticker: str) -> dict:
    """
    Pull quarterly financials from SEC EDGAR company facts API.
    Completely free, no key required, no rate limiting issues.

    SEC EDGAR stores every financial filing as structured JSON at:
    https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json

    This contains revenue (Revenues/RevenueFromContractWithCustomerExcludingAssessedTax),
    net income (NetIncomeLoss), and EPS (EarningsPerShareBasic) for all quarters.
    """
    edgar_headers = {"User-Agent": "SentimentDashboard contact@example.com"}

    try:
        cik = _get_cik(ticker)
        if not cik:
            logger.warning(f"EDGAR financials: no CIK for {ticker}")
            return {}

        url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik.zfill(10)}.json"
        with httpx.Client(timeout=20.0) as client:
            resp = client.get(url, headers=edgar_headers)
            resp.raise_for_status()

        facts = resp.json().get("facts", {}).get("us-gaap", {})

        # Revenue — try multiple GAAP concepts in order of preference
        revenue_data = (
            facts.get("RevenueFromContractWithCustomerExcludingAssessedTax", {})
            or facts.get("Revenues", {})
            or facts.get("SalesRevenueNet", {})
            or facts.get("RevenueFromContractWithCustomerIncludingAssessedTax", {})
        )

        net_income_data = facts.get("NetIncomeLoss", {})
        eps_data        = facts.get("EarningsPerShareBasic", {})

        def _get_quarterly(concept_data: dict) -> list[dict]:
            """Extract quarterly (10-Q + 10-K) units sorted newest first."""
            units = concept_data.get("units", {})
            # Try USD first, then pure numbers for EPS
            values = units.get("USD", units.get("USD/shares", units.get("pure", [])))
            # Keep only 10-Q and 10-K filings, deduplicate by end date
            seen = {}
            for v in values:
                form = v.get("form", "")
                if form not in ("10-Q", "10-K"):
                    continue
                end = v.get("end", "")
                # Keep the most recent filing for each end date
                if end not in seen or v.get("filed", "") > seen[end].get("filed", ""):
                    seen[end] = v
            return sorted(seen.values(), key=lambda x: x.get("end", ""), reverse=True)

        rev_quarters = _get_quarterly(revenue_data)
        net_quarters = _get_quarterly(net_income_data)
        eps_quarters = _get_quarterly(eps_data)

        if not rev_quarters:
            logger.warning(f"EDGAR: no revenue data for {ticker}")
            return {}

        # Build lookup dicts by end date for joining
        net_by_date = {v["end"]: v["val"] for v in net_quarters}
        eps_by_date = {v["end"]: v["val"] for v in eps_quarters}

        quarters, revenue_bn, eps_list, margins = [], [], [], []

        for rv in rev_quarters[:4]:
            end = rv.get("end", "")
            rev = rv.get("val", 0) or 0
            net = net_by_date.get(end, 0) or 0
            eps = eps_by_date.get(end, None)

            quarters.append(end[:7])
            revenue_bn.append(round(rev / 1e9, 2))
            eps_list.append(round(eps, 4) if eps is not None else round(net / 1e9, 4))
            margins.append(round(net / rev, 4) if rev > 0 else 0.0)

        if not quarters:
            return {}

        rev_growth = None
        if len(revenue_bn) >= 2 and revenue_bn[-1] > 0:
            rev_growth = round((revenue_bn[0] - revenue_bn[-1]) / revenue_bn[-1], 4)

        eps_trend = "flat"
        if len(eps_list) >= 2:
            if eps_list[0] > eps_list[-1] * 1.05:
                eps_trend = "increasing"
            elif eps_list[0] < eps_list[-1] * 0.95:
                eps_trend = "decreasing"

        logger.info(f"EDGAR financials: {ticker} — {len(quarters)} quarters")
        return {
            "ticker":         ticker,
            "quarters":       quarters,
            "revenue_bn":     revenue_bn,
            "eps":            eps_list,
            "net_margin":     margins,
            "revenue_growth": rev_growth,
            "eps_trend":      eps_trend,
            "source":         "SEC EDGAR",
        }

    except Exception as e:
        logger.warning(f"EDGAR financials failed for {ticker}: {e}")
        return {}


def _fetch_alpha_vantage_financials(ticker: str) -> dict:
    """Alpha Vantage quarterly income statement — optional upgrade."""
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get("https://www.alphavantage.co/query", params={
                "function": "INCOME_STATEMENT",
                "symbol":   ticker,
                "apikey":   settings.ALPHA_VANTAGE_KEY,
            })
            resp.raise_for_status()

        reports = resp.json().get("quarterlyReports", [])[:4]
        if not reports:
            return {}

        quarters, revenue_bn, eps_list, margins = [], [], [], []
        for r in reports:
            rev    = float(r.get("totalRevenue", 0) or 0)
            net    = float(r.get("netIncome",    0) or 0)
            shares = float(r.get("commonStockSharesOutstanding", 1) or 1)
            quarters.append(r.get("fiscalDateEnding", "")[:7])
            revenue_bn.append(round(rev / 1e9, 2))
            eps_list.append(round(net / shares, 4) if shares > 0 else 0.0)
            margins.append(round(net / rev, 4) if rev > 0 else 0.0)

        rev_growth = None
        if len(revenue_bn) >= 2 and revenue_bn[-1] > 0:
            rev_growth = round((revenue_bn[0] - revenue_bn[-1]) / revenue_bn[-1], 4)

        eps_trend = "flat"
        if len(eps_list) >= 2:
            if eps_list[0] > eps_list[-1] * 1.05:
                eps_trend = "increasing"
            elif eps_list[0] < eps_list[-1] * 0.95:
                eps_trend = "decreasing"

        logger.info(f"Alpha Vantage financials: {ticker} — {len(quarters)} quarters")
        return {
            "ticker":         ticker,
            "quarters":       quarters,
            "revenue_bn":     revenue_bn,
            "eps":            eps_list,
            "net_margin":     margins,
            "revenue_growth": rev_growth,
            "eps_trend":      eps_trend,
            "source":         "Alpha Vantage",
        }

    except Exception as e:
        logger.warning(f"Alpha Vantage financials failed for {ticker}: {e}")
        return {}


# ─────────────────────────────────────────────────────────────────────────────
# Company info — SEC EDGAR (no key) with Alpha Vantage upgrade
# ─────────────────────────────────────────────────────────────────────────────

def resolve_company(ticker: str) -> dict:
    """
    Resolve ticker to company name.
    Primary:  Alpha Vantage OVERVIEW (if key configured) — richer data
    Fallback: SEC EDGAR company tickers JSON (free, no key)
    """
    ticker = ticker.upper()

    if settings.ALPHA_VANTAGE_KEY != "YOUR_ALPHA_VANTAGE_KEY":
        try:
            with httpx.Client(timeout=10.0) as client:
                resp = client.get("https://www.alphavantage.co/query", params={
                    "function": "OVERVIEW",
                    "symbol":   ticker,
                    "apikey":   settings.ALPHA_VANTAGE_KEY,
                })
                resp.raise_for_status()
            data = resp.json()
            if data.get("Name"):
                return {
                    "ticker":      data.get("Symbol", ticker),
                    "name":        data.get("Name", ticker),
                    "sector":      data.get("Sector", ""),
                    "exchange":    data.get("Exchange", ""),
                    "description": data.get("Description", "")[:300],
                }
        except Exception as e:
            logger.warning(f"Alpha Vantage overview failed for {ticker}: {e}")

    # Fallback: SEC EDGAR — covers all US listed companies, free
    try:
        with httpx.Client(timeout=10.0) as client:
            resp = client.get(
                "https://www.sec.gov/files/company_tickers.json",
                headers={"User-Agent": "SentimentDashboard contact@example.com"},
            )
            resp.raise_for_status()
        for entry in resp.json().values():
            if entry.get("ticker", "").upper() == ticker:
                return {
                    "ticker":      ticker,
                    "name":        entry.get("title", ticker),
                    "sector":      "",
                    "exchange":    "",
                    "description": "",
                }
    except Exception as e:
        logger.warning(f"EDGAR company lookup failed for {ticker}: {e}")

    return {"ticker": ticker, "name": ticker, "sector": "", "exchange": "", "description": ""}