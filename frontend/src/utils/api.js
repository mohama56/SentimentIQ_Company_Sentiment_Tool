/**
 * utils/api.js
 *
 * Centralised API client for the FastAPI backend.
 * All endpoint paths are defined here — change the base URL in one place.
 *
 * All functions throw on HTTP errors so the calling hook can catch and
 * set an error state for the UI.
 */

const BASE_URL = '/api/v1'

/** Generic fetch wrapper — throws on non-OK responses. */
async function apiFetch(path) {
  const res = await fetch(`${BASE_URL}${path}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Resolve a ticker to company metadata.
 * Used to validate the ticker before running the full analysis.
 */
export async function searchCompany(ticker) {
  return apiFetch(`/search_company?ticker=${encodeURIComponent(ticker)}`)
}

/**
 * Run the full analysis pipeline and return the TemperatureResponse.
 * This is the primary API call — it may take 10–30 seconds on first run.
 */
export async function getTemperatureScore(ticker) {
  return apiFetch(`/get_temperature_score?ticker=${encodeURIComponent(ticker)}`)
}

/**
 * Lightweight sentiment-only fetch (no topics or financials).
 * Useful for a quick refresh without re-running the full pipeline.
 */
export async function getSentiment(ticker) {
  return apiFetch(`/get_sentiment?ticker=${encodeURIComponent(ticker)}`)
}

/**
 * BERTopic theme extraction for a ticker.
 */
export async function getTopics(ticker) {
  return apiFetch(`/get_topics?ticker=${encodeURIComponent(ticker)}`)
}

/**
 * Quarterly financial metrics (revenue, EPS, margin).
 */
export async function getFinancials(ticker) {
  return apiFetch(`/get_financials?ticker=${encodeURIComponent(ticker)}`)
}
