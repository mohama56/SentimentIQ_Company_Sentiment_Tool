"""
Company Sentiment Intelligence Dashboard — FastAPI Backend
Entry point: starts the API server and registers all routers.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import company, sentiment, topics, financials, temperature


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Pre-load heavy NLP models at startup so first request isn't slow
    import logging
    logger = logging.getLogger(__name__)
    try:
        logger.info("Pre-loading NLP models...")
        from services.nlp_service import _get_vader, _get_finbert, _get_sbert, _get_zero_shot
        _get_vader()
        _get_finbert()
        _get_sbert()
        _get_zero_shot()
        logger.info("NLP models ready.")
    except Exception as e:
        logger.warning(f"Model pre-load failed: {e}")
    yield


app = FastAPI(
    title="Company Sentiment Intelligence API",
    description="NLP-powered market perception scoring for public companies.",
    version="1.0.0",
    lifespan=lifespan,
)

# Allow the React frontend (running on localhost:5173 or :3000) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all route groups
app.include_router(company.router,     prefix="/api/v1", tags=["Company"])
app.include_router(sentiment.router,   prefix="/api/v1", tags=["Sentiment"])
app.include_router(topics.router,      prefix="/api/v1", tags=["Topics"])
app.include_router(financials.router,  prefix="/api/v1", tags=["Financials"])
app.include_router(temperature.router, prefix="/api/v1", tags=["Temperature Score"])


@app.get("/api/v1/health")
def health_check():
    """Quick liveness probe — confirms the server is running."""
    return {"status": "ok", "version": "1.0.0"}
