"""
services/nlp_service.py — Full NLP processing pipeline.

Stages (in order):
  1. Deduplication (cosine similarity via Sentence Transformers)
  2. VADER sentiment (fast, good for informal Reddit text)
  3. FinBERT sentiment (finance-domain, better for news/filings)
  4. Ensemble score (weighted combination)
  5. Aspect-based sentiment (zero-shot NLI per business dimension)
  6. Event detection (rule-based keyword matching)
  7. Topic modelling (BERTopic)

Models are loaded once at module import and reused across requests.
All models are open-source and run locally — no API calls.
"""

import hashlib
import logging
import math
import re
from functools import lru_cache
from typing import Optional

import numpy as np
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from config import settings
from models.schemas import AspectScores, ProcessedSignal, UnifiedDocument

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Model loading (lazy, cached — only loads on first use)
# ─────────────────────────────────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _get_vader():
    """VADER: fast rule-based sentiment, excellent for social media text."""
    logger.info("Loading VADER...")
    return SentimentIntensityAnalyzer()


@lru_cache(maxsize=1)
def _get_finbert():
    """
    FinBERT: BERT fine-tuned on financial news.
    Returns (tokenizer, model) tuple.
    First call downloads ~440 MB from HuggingFace.
    """
    try:
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
        import torch

        logger.info(f"Loading FinBERT ({settings.FINBERT_MODEL})...")
        tokenizer = AutoTokenizer.from_pretrained(settings.FINBERT_MODEL)
        model = AutoModelForSequenceClassification.from_pretrained(settings.FINBERT_MODEL)
        model.eval()
        return tokenizer, model
    except Exception as e:
        logger.error(f"FinBERT load failed: {e}. Falling back to VADER-only mode.")
        return None, None


@lru_cache(maxsize=1)
def _get_sbert():
    """
    Sentence-BERT: used for deduplication and topic clustering.
    First call downloads ~90 MB.
    """
    try:
        from sentence_transformers import SentenceTransformer
        logger.info(f"Loading Sentence-BERT ({settings.SBERT_MODEL})...")
        return SentenceTransformer(settings.SBERT_MODEL)
    except Exception as e:
        logger.error(f"SBERT load failed: {e}")
        return None


@lru_cache(maxsize=1)
def _get_zero_shot():
    """
    Zero-shot NLI classifier for aspect-based sentiment.
    Uses DeBERTa-v3-base-mnli (~180 MB).
    """
    try:
        from transformers import pipeline
        logger.info("Loading zero-shot NLI classifier...")
        return pipeline(
            "zero-shot-classification",
            model="cross-encoder/nli-deberta-v3-small",
        )
    except Exception as e:
        logger.error(f"Zero-shot classifier load failed: {e}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Deduplication
# ─────────────────────────────────────────────────────────────────────────────

def deduplicate(documents: list[UnifiedDocument]) -> list[UnifiedDocument]:
    """
    Remove near-duplicate documents using two-pass strategy:

    Pass 1 — Exact match: SHA-256 hash of normalised text.
    Pass 2 — Semantic match: cosine similarity of SBERT embeddings.
              Any pair with similarity > DEDUP_THRESHOLD is collapsed
              to the higher-engagement document.

    This prevents a viral Reddit post from flooding the score.
    """
    if not documents:
        return []

    # Pass 1: exact dedup by content hash
    seen_hashes: set[str] = set()
    unique: list[UnifiedDocument] = []
    for doc in documents:
        h = hashlib.sha256(doc.text.lower().strip().encode()).hexdigest()
        if h not in seen_hashes:
            seen_hashes.add(h)
            unique.append(doc)

    if len(unique) <= 1:
        return unique

    # Pass 2: semantic dedup
    sbert = _get_sbert()
    if sbert is None:
        return unique

    texts = [doc.text[:512] for doc in unique]
    embeddings = sbert.encode(texts, convert_to_numpy=True, show_progress_bar=False)

    # Normalise for cosine similarity via dot product
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms = np.where(norms == 0, 1e-9, norms)
    normed = embeddings / norms

    sim_matrix = normed @ normed.T   # shape: (N, N)

    keep = [True] * len(unique)
    for i in range(len(unique)):
        if not keep[i]:
            continue
        for j in range(i + 1, len(unique)):
            if not keep[j]:
                continue
            if sim_matrix[i, j] > settings.DEDUP_THRESHOLD:
                # Keep the higher-engagement document
                eng_i = unique[i].upvotes + unique[i].comment_count
                eng_j = unique[j].upvotes + unique[j].comment_count
                if eng_j > eng_i:
                    keep[i] = False
                    break
                else:
                    keep[j] = False

    result = [doc for doc, k in zip(unique, keep) if k]
    logger.info(f"Dedup: {len(documents)} → {len(result)} documents")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 & 3: Sentiment scoring
# ─────────────────────────────────────────────────────────────────────────────

def _vader_score(text: str) -> float:
    """
    VADER compound score: -1 (most negative) to +1 (most positive).
    Best for short, informal text (Reddit posts, tweet-style news headlines).
    """
    vader = _get_vader()
    return vader.polarity_scores(text)["compound"]


def _finbert_score(text: str) -> float:
    """
    FinBERT score: -1 (negative) to +1 (positive).
    Converts the 3-class softmax output (positive/negative/neutral)
    into a continuous score: positive_prob - negative_prob.

    Truncates text to 512 tokens — FinBERT's maximum context length.
    """
    tokenizer, model = _get_finbert()
    if tokenizer is None:
        return 0.0  # fallback: neutral

    try:
        import torch

        inputs = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=settings.MAX_TEXT_LENGTH,
            padding=True,
        )
        with torch.no_grad():
            logits = model(**inputs).logits

        probs = torch.softmax(logits, dim=1)[0]
        # FinBERT label order: positive=0, negative=1, neutral=2
        positive_prob = probs[0].item()
        negative_prob = probs[1].item()
        return positive_prob - negative_prob   # range: -1 to +1

    except Exception as e:
        logger.warning(f"FinBERT inference failed: {e}")
        return 0.0


def _ensemble_score(doc: UnifiedDocument) -> tuple[float, float, float]:
    """
    Compute VADER score, FinBERT score, and their weighted ensemble.

    Weighting rationale:
    - Reddit/informal text: VADER 0.55, FinBERT 0.45
      (VADER handles slang, emojis, and informal tone better)
    - News/filings: FinBERT 0.65, VADER 0.35
      (FinBERT is trained on financial prose — more accurate here)
    """
    vader  = _vader_score(doc.text)
    finbert = _finbert_score(doc.text)

    if doc.source == "reddit":
        ensemble = 0.55 * vader + 0.45 * finbert
    else:
        ensemble = 0.35 * vader + 0.65 * finbert

    return vader, finbert, ensemble


def _label_from_score(score: float) -> str:
    """Map a continuous score (-1 to +1) to a human-readable label."""
    if score < -0.6:  return "very_negative"
    if score < -0.2:  return "negative"
    if score <  0.2:  return "neutral"
    if score <  0.6:  return "positive"
    return "very_positive"


# ─────────────────────────────────────────────────────────────────────────────
# Stage 4: Aspect-based sentiment (ABSA)
# ─────────────────────────────────────────────────────────────────────────────

# Each aspect maps to a natural-language hypothesis for the NLI classifier.
ASPECT_HYPOTHESES = {
    "earnings_profitability": "This text discusses earnings, revenue, profit, or financial performance.",
    "leadership_governance":  "This text discusses company leadership, management, CEO, or corporate governance.",
    "product_innovation":     "This text discusses products, technology, innovation, or research and development.",
    "macro_industry":         "This text discusses macroeconomic conditions, industry trends, or market dynamics.",
    "legal_regulatory":       "This text discusses legal issues, lawsuits, regulations, or compliance.",
}


def _compute_aspects(text: str) -> AspectScores:
    """
    For each business aspect, ask the NLI classifier:
    'Does this text discuss [aspect]?'

    The entailment probability (0–1) measures aspect relevance.
    We then combine it with the document's ensemble sentiment for direction.

    If the NLI model isn't loaded, returns neutral 0.5 for all aspects.
    """
    classifier = _get_zero_shot()
    if classifier is None:
        return AspectScores()

    try:
        # Batch all 5 hypotheses in a single forward pass
        result = classifier(
            text[:512],
            candidate_labels=list(ASPECT_HYPOTHESES.values()),
            multi_label=True,   # aspects are not mutually exclusive
        )

        # Map back from hypothesis text to aspect name
        hyp_to_aspect = {v: k for k, v in ASPECT_HYPOTHESES.items()}
        scores_dict: dict[str, float] = {}
        for label, score in zip(result["labels"], result["scores"]):
            aspect = hyp_to_aspect.get(label)
            if aspect:
                scores_dict[aspect] = round(score, 4)

        return AspectScores(**{
            k: scores_dict.get(k, 0.5) for k in AspectScores.model_fields
        })

    except Exception as e:
        logger.warning(f"Aspect classification failed: {e}")
        return AspectScores()


# ─────────────────────────────────────────────────────────────────────────────
# Stage 5: Event detection
# ─────────────────────────────────────────────────────────────────────────────

# Keyword patterns for each event type. Patterns are lower-cased.
EVENT_PATTERNS = {
    "earnings_beat":         [r"beat.{0,20}expect", r"beat.{0,20}estimate", r"surpass.{0,20}forecast", r"earnings beat"],
    "earnings_miss":         [r"miss.{0,20}expect", r"miss.{0,20}estimate", r"below.{0,20}forecast", r"earnings miss"],
    "guidance_raised":       [r"rais.{0,10}guidance", r"upgrad.{0,10}outlook", r"increas.{0,10}forecast"],
    "guidance_lowered":      [r"lower.{0,10}guidance", r"cut.{0,10}outlook", r"reduc.{0,10}forecast", r"downgrad.{0,10}guidance"],
    "layoff_announced":      [r"layoff", r"lay.off", r"job cut", r"workforce reduction", r"reductions? in force", r"headcount"],
    "lawsuit_filed":         [r"lawsuit", r"legal action", r"sued by", r"class action", r"litigation", r"DOJ", r"SEC investigat"],
    "ceo_change":            [r"ceo resign", r"ceo step", r"new ceo", r"chief executive.{0,10}resign", r"appoint.{0,10}ceo"],
    "acquisition_announced": [r"acquir", r"merger", r"takeover", r"buy.{0,10}company", r"deal worth"],
}


def detect_events(text: str) -> list[str]:
    """
    Scan the text for known financial event signals.
    Returns a list of event type strings that were detected.
    Multiple events can fire on a single document.
    """
    text_lower = text.lower()
    flags: list[str] = []

    for event, patterns in EVENT_PATTERNS.items():
        for pattern in patterns:
            if re.search(pattern, text_lower):
                flags.append(event)
                break  # only flag each event once per document

    return flags


# ─────────────────────────────────────────────────────────────────────────────
# Stage 6: Weighting (recency, engagement, credibility)
# ─────────────────────────────────────────────────────────────────────────────

# Source credibility scores (based on reliability and editorial standards)
SOURCE_CREDIBILITY = {
    "news":      1.00,
    "filing":    0.95,
    "reddit":    0.70,
    "financial": 0.90,
}


def _recency_weight(hours_ago: float) -> float:
    """
    Exponential decay: w = exp(-lambda * hours_ago)
    Same-day content (0h) → weight 1.0
    24h old → ~0.15, 48h old → ~0.02
    """
    return round(math.exp(-settings.RECENCY_LAMBDA * hours_ago), 4)


def _engagement_weight(upvotes: int, comments: int) -> float:
    """
    Log-normalised engagement score (0.5–2.0 range).
    Prevents viral posts from dominating with extreme linear weight.
    Baseline (0 engagement) → 0.5
    High engagement → approaches 2.0
    """
    raw = math.log1p(upvotes + 2 * comments)   # log1p handles 0 gracefully
    # Normalise: assume ~10k total engagement is 'very high'
    normalised = min(raw / math.log1p(10000), 1.0)
    return round(0.5 + 1.5 * normalised, 4)


# ─────────────────────────────────────────────────────────────────────────────
# Main pipeline: process all documents for a company
# ─────────────────────────────────────────────────────────────────────────────

MAX_DOCS_FOR_NLP    = 20   # cap total docs fed into the pipeline
MAX_DOCS_FOR_ASPECT = 4    # DeBERTa is slow — only run on top N docs


def process_documents(documents: list[UnifiedDocument]) -> list[ProcessedSignal]:
    """
    Run the full NLP pipeline on a list of normalised documents.

    For each document:
      1. VADER + FinBERT → ensemble score
      2. Aspect classification (only top MAX_DOCS_FOR_ASPECT by recency)
      3. Event detection
      4. Recency / engagement / credibility weights

    Returns a list of ProcessedSignal ready for the scoring engine.
    """
    # Sort by recency and cap total docs to keep latency predictable
    sorted_docs = sorted(documents, key=lambda d: d.hours_ago)
    capped = sorted_docs[:MAX_DOCS_FOR_NLP]

    # Pre-compute which docs get expensive aspect classification
    aspect_set = {id(d) for d in capped[:MAX_DOCS_FOR_ASPECT]}

    signals: list[ProcessedSignal] = []

    for doc in capped:
        try:
            # ── Sentiment ───────────────────────────────────────────────────
            vader, finbert, ensemble = _ensemble_score(doc)
            label = _label_from_score(ensemble)

            # ── Aspects (only for top recent docs to avoid timeout) ──────────
            aspects = _compute_aspects(doc.text) if id(doc) in aspect_set else AspectScores()

            # ── Events ──────────────────────────────────────────────────────
            events = detect_events(doc.text)

            # ── Weights ─────────────────────────────────────────────────────
            recency     = _recency_weight(doc.hours_ago)
            engagement  = _engagement_weight(doc.upvotes, doc.comment_count)
            credibility = SOURCE_CREDIBILITY.get(doc.source, 0.7)

            signals.append(ProcessedSignal(
                document_id=doc.id,
                source=doc.source,
                text_snippet=doc.text[:220],
                url=doc.url,
                outlet=doc.outlet,
                subreddit=doc.subreddit,
                published_at=doc.published_at,
                vader_compound=round(vader, 4),
                finbert_score=round(finbert, 4),
                ensemble_score=round(ensemble, 4),
                sentiment_label=label,
                aspects=aspects,
                event_flags=events,
                recency_weight=recency,
                engagement_weight=engagement,
                credibility_weight=credibility,
                embedding_hash=hashlib.sha256(doc.text.encode()).hexdigest(),
            ))

        except Exception as e:
            logger.error(f"NLP pipeline failed for doc {doc.id}: {e}")
            continue

    logger.info(f"NLP: processed {len(signals)}/{len(documents)} signals (capped at {MAX_DOCS_FOR_NLP})")
    return signals


# ─────────────────────────────────────────────────────────────────────────────
# Topic modelling (BERTopic)
# ─────────────────────────────────────────────────────────────────────────────

def extract_topics(documents: list[UnifiedDocument]) -> tuple[list[str], list[dict]]:
    """
    Run BERTopic on the document corpus to extract the dominant themes.

    Returns:
        topics      — list of human-readable topic label strings
        topic_meta  — list of dicts with {label, keywords, doc_count}

    Falls back to keyword frequency if BERTopic isn't installed or
    there aren't enough documents (< BERTOPIC_MIN_DOCS).
    """
    texts = [doc.text for doc in documents if len(doc.text) > 30]

    if len(texts) < settings.BERTOPIC_MIN_DOCS:
        logger.warning("Not enough documents for BERTopic — using keyword fallback")
        return _keyword_fallback_topics(texts), []

    try:
        from bertopic import BERTopic

        sbert = _get_sbert()   # reuse cached model — don't reload

        # min_topic_size controls granularity; smaller = more topics
        topic_model = BERTopic(
            embedding_model=sbert,
            min_topic_size=max(2, len(texts) // 10),
            verbose=False,
        )

        topics_raw, _ = topic_model.fit_transform(texts)
        topic_info    = topic_model.get_topic_info()

        # Extract top topics (exclude the noise topic -1)
        top_labels: list[str]  = []
        topic_meta: list[dict] = []

        for _, row in topic_info.iterrows():
            topic_id = row["Topic"]
            if topic_id == -1:
                continue   # BERTopic clusters it can't assign go to -1

            # get_topic returns a list of (word, weight) tuples
            keywords = [w for w, _ in (topic_model.get_topic(topic_id) or [])[:5]]
            label    = " · ".join(keywords[:3])

            top_labels.append(label)
            topic_meta.append({
                "label":     label,
                "keywords":  keywords,
                "doc_count": int(row.get("Count", 0)),
            })

            if len(top_labels) >= 8:
                break

        return top_labels, topic_meta

    except ImportError:
        logger.warning("BERTopic not installed — using keyword fallback")
        return _keyword_fallback_topics(texts), []
    except Exception as e:
        logger.error(f"BERTopic failed: {e} — using keyword fallback")
        return _keyword_fallback_topics(texts), []


def _keyword_fallback_topics(texts: list[str]) -> list[str]:
    """
    Simple keyword frequency fallback when BERTopic is unavailable.
    Extracts the most common meaningful bi-grams and uni-grams.
    """
    from collections import Counter

    STOPWORDS = {
        "the", "a", "an", "is", "it", "in", "to", "of", "and", "or",
        "for", "on", "at", "by", "with", "that", "this", "are", "was",
        "has", "have", "its", "as", "be", "been", "from", "will", "said",
        "i", "we", "they", "he", "she", "you", "not", "but", "so", "if",
        "about", "after", "before", "into", "than", "their", "there",
        "also", "can", "could", "would", "should", "may", "might",
    }

    words: list[str] = []
    for text in texts:
        tokens = re.findall(r"\b[a-zA-Z]{4,}\b", text.lower())
        words.extend([t for t in tokens if t not in STOPWORDS])

    counter = Counter(words)
    return [word for word, _ in counter.most_common(8)]
