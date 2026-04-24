"""
Company Sentiment Intelligence Dashboard — FastAPI Backend
Entry point: starts the API server and registers all routers.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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

# CORS — allow all origins. Must be added BEFORE other middleware.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# Catch-all exception handler — ensures CORS headers are always present
# even when the request crashes before FastAPI can process the response.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
        headers={"Access-Control-Allow-Origin": "*"},
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
