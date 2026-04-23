"""
Company Sentiment Intelligence Dashboard — FastAPI Backend
Entry point: starts the API server and registers all routers.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import company, sentiment, topics, financials, temperature

app = FastAPI(
    title="Company Sentiment Intelligence API",
    description="NLP-powered market perception scoring for public companies.",
    version="1.0.0",
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
