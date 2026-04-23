# Company Sentiment Intelligence Dashboard

A production-grade NLP and machine learning platform that aggregates real-time signals from Reddit, financial news, SEC filings, and market data to compute a weighted **Company Temperature Score** (0–100) reflecting current market perception of any publicly traded company.

---

## What It Does

Enter any US stock ticker or company name. The system pulls live data from 6+ sources, runs it through a multi-model NLP pipeline, and returns a fully explainable sentiment score with source breakdown, aspect analysis, topic clusters, quarterly financials, and historical trend tracking.

---

## Data Sources

All sources are live and pull real-time data on every analysis run.

| Source | What It Provides | Key Required |
|--------|-----------------|--------------|
| **Reddit** | Posts + comments from r/stocks, r/investing, r/wallstreetbets, r/StockMarket | No — uses public JSON endpoints |
| **Google News RSS** | Articles from Reuters, Bloomberg, WSJ, FT, CNBC and others | No |
| **Yahoo Finance RSS** | Financial headlines and market news | No |
| **GNews API** | 100 articles/day from global financial outlets | Free key at gnews.io |
| **StockTwits** | Pre-labeled BULLISH/BEARISH social sentiment from financial traders | No |
| **MarketBeat RSS** | Analyst upgrades, downgrades, price targets | No |
| **Seeking Alpha RSS** | Financial commentary and analysis headlines | No |
| **SEC EDGAR Filings** | 10-K, 10-Q, 8-K filing excerpts via data.sec.gov | No |
| **SEC EDGAR Financials** | Real quarterly revenue, EPS, net income, margins from XBRL filings | No |
| **Alpha Vantage** | Company name, sector, exchange, description | Free key at alphavantage.co |

---

## NLP and ML Pipeline

Each document from every source passes through a 6-stage pipeline before scoring.

### Stage 1 — Deduplication
- **Exact match:** SHA-256 hash of normalised text
- **Semantic match:** Cosine similarity via Sentence-BERT embeddings (`all-MiniLM-L6-v2`)
- Threshold: 0.92 cosine similarity — near-duplicate content is collapsed to the highest-engagement version
- Prevents viral Reddit posts or syndicated news from flooding the score

### Stage 2 — Sentiment Analysis (Ensemble)
Two models run on every document and are combined with source-adaptive weighting:

**FinBERT** (`ProsusAI/finbert`)
- BERT model fine-tuned on 10,000+ financial news articles and analyst reports
- Outputs: Positive / Negative / Neutral with probability scores
- Converted to continuous score: `positive_prob - negative_prob` → range [-1, +1]
- Best for: News articles, SEC filings, formal financial language

**VADER** (Valence Aware Dictionary and sEntiment Reasoner)
- Rule-based lexicon model with 7,500+ hand-rated words
- Handles slang, emojis, capitalisation, punctuation as sentiment signals
- Compound score range: [-1, +1]
- Best for: Reddit posts, StockTwits messages, informal social text

**Ensemble weighting by source:**
- Reddit / StockTwits: `VADER × 0.55 + FinBERT × 0.45`
- News / Filings: `FinBERT × 0.65 + VADER × 0.35`

**Sentiment labels (5-zone system):**
| Score | Label |
|-------|-------|
| 0–25 | Very Negative |
| 25–45 | Negative |
| 45–60 | Neutral |
| 60–75 | Positive |
| 75–100 | Very Positive |

### Stage 3 — Aspect-Based Sentiment Analysis (ABSA)
**Model:** `cross-encoder/nli-deberta-v3-small` (zero-shot NLI classifier)

For each document, the model answers 5 yes/no questions using natural language inference:
- *"This text discusses earnings, revenue, profit, or financial performance"*
- *"This text discusses company leadership, management, CEO, or corporate governance"*
- *"This text discusses products, technology, innovation, or R&D"*
- *"This text discusses macroeconomic conditions or industry trends"*
- *"This text discusses legal issues, lawsuits, regulations, or compliance"*

The entailment probability (0–1) per aspect is aggregated across all documents and displayed as the Aspect Analysis panel.

### Stage 4 — Event Detection
Rule-based pattern matching using regex across 8 financial event types:

| Event | Score Adjustment |
|-------|-----------------|
| Earnings beat | +8 pts |
| Guidance raised | +6 pts |
| Acquisition announced | +4 pts |
| Earnings miss | −10 pts |
| Guidance lowered | −8 pts |
| Layoff announced | −7 pts |
| Lawsuit filed | −6 pts |
| CEO change | −4 pts |

Total event adjustment is capped at ±20 points.

### Stage 5 — Topic Modelling
**Model:** BERTopic with `all-MiniLM-L6-v2` Sentence-BERT embeddings

- Clusters all deduplicated documents into semantic topic groups
- Uses c-TF-IDF for topic labelling (what words are uniquely important per cluster)
- Returns top 8 topics ranked by document frequency
- Falls back to keyword frequency extraction if fewer than 5 documents

### Stage 6 — Named Entity Recognition
**Model:** spaCy `en_core_web_sm`

- Extracts company names (ORG), executives (PERSON), and competitor mentions
- Cross-references against known ticker registry for competitor identification

---

## Scoring Formula

```
temperature_score = clamp(raw_score + event_adjustment, 0, 100)

raw_score = (
    0.35 × news_sentiment     +
    0.25 × reddit_sentiment   +
    0.15 × filing_sentiment   +
    0.15 × financial_trend    +
    0.10 × momentum
) × 100
```

Each source-level sentiment is a **triple-weighted average**:
```
weight_i = recency_weight × engagement_weight × credibility_weight
```

**Recency decay:** `exp(-0.08 × hours_since_publish)` — same-day content weights ~1.0, 24h old ~0.15

**Engagement weighting:** `log(1 + upvotes + 2×comments)` — normalised to [0.5, 2.0]

**Source credibility:**
| Source | Weight |
|--------|--------|
| News | 1.00 |
| SEC Filings | 0.95 |
| Financial data | 0.90 |
| StockTwits | 0.75 |
| Reddit | 0.70 |

**Financial trend score** pulls from SEC EDGAR XBRL data:
- Revenue YoY growth direction
- EPS trend (increasing / flat / decreasing)
- Net margin trend across last 4 quarters

**Momentum** uses linear regression slope over the last 5 saved history points.

**Confidence score** = `0.40 × volume_score + 0.40 × diversity_score + 0.20 × recency_score`

---

## Tech Stack

### Backend
- **FastAPI** — async REST API framework
- **Python 3.12**
- **Pydantic v2** — data validation and schema enforcement
- **httpx** — async HTTP client for all external API calls
- **uvicorn** — ASGI server

### NLP / ML Models
- **FinBERT** (`ProsusAI/finbert`) — financial sentiment classification
- **VADER** (`vaderSentiment`) — social/informal sentiment analysis
- **Sentence-BERT** (`all-MiniLM-L6-v2`) — document embeddings for dedup + BERTopic
- **BERTopic** — unsupervised topic modelling
- **DeBERTa-v3** (`cross-encoder/nli-deberta-v3-small`) — zero-shot aspect classification
- **spaCy** (`en_core_web_sm`) — named entity recognition
- **HuggingFace Transformers** — model loading and inference

### Frontend
- **React 18** with Vite
- **Tailwind CSS** — utility-first styling
- **Recharts** — sentiment trend and source breakdown charts
- **Geist + Geist Mono** fonts

### Data & Storage
- **JSON file store** (`backend/data/history/{TICKER}.json`) — persistent score history per ticker, up to 90 days
- **In-memory caching** — models loaded once and reused across requests

---

## API Keys

| Key | Source | Free Tier | Required |
|-----|--------|-----------|----------|
| `GNEWS_API_KEY` | gnews.io | 100 req/day | Optional (adds news volume) |
| `ALPHA_VANTAGE_KEY` | alphavantage.co | 25 req/day | Optional (adds company metadata) |
| `REDDIT_CLIENT_ID` + `REDDIT_CLIENT_SECRET` | reddit.com/prefs/apps | Unlimited | Optional (Reddit already works without via public JSON) |

**The tool runs fully without any API keys.** Keys add additional signal volume and richer metadata.

---

## Setup

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm

# Optional: add API keys
cp .env.example .env
# Edit .env with your keys

uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/get_temperature_score?ticker=TSLA` | Full analysis pipeline — primary endpoint |
| `GET` | `/api/v1/get_sentiment?ticker=TSLA` | Lightweight sentiment only |
| `GET` | `/api/v1/get_topics?ticker=TSLA` | BERTopic theme extraction |
| `GET` | `/api/v1/get_financials?ticker=TSLA` | Quarterly financial metrics |
| `GET` | `/api/v1/search_company?ticker=TSLA` | Resolve ticker to company info |
| `GET` | `/api/v1/health` | Server liveness check |

---

## Score History

Every analysis run saves today's score to `backend/data/history/{TICKER}.json`. The sentiment trend chart populates automatically as you run more analyses over time. History is kept for 90 days per ticker and feeds the momentum component of the scoring formula.

---

## Disclaimer

This tool is built for research and analytical purposes. Temperature scores reflect aggregated public sentiment signals and are not financial advice. Always conduct your own due diligence before making investment decisions.