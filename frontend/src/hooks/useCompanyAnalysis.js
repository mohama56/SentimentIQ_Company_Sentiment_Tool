/**
 * hooks/useCompanyAnalysis.js
 *
 * Custom React hook that manages the full analysis lifecycle:
 *   - Idle → Loading → Success / Error
 *
 * Components call `analyze(ticker)` and read back `data`, `loading`, `error`.
 * All API calls are centralised here — components stay pure/presentational.
 */

import { useState, useCallback, useRef } from 'react'
import { getTemperatureScore } from '../utils/api.js'

/**
 * @typedef {Object} AnalysisState
 * @property {Object|null}  data      - TemperatureResponse from the backend
 * @property {boolean}      loading   - true while the pipeline is running
 * @property {string|null}  error     - error message if the request failed
 * @property {string|null}  ticker    - ticker currently being analysed
 * @property {string}       status    - 'idle' | 'loading' | 'success' | 'error'
 * @property {Function}     analyze   - call with a ticker string to start analysis
 * @property {Function}     reset     - clear results back to idle state
 */

export function useCompanyAnalysis() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [ticker,  setTicker]  = useState(null)
  const [status,  setStatus]  = useState('idle')

  // Track in-flight request so we can ignore stale responses
  const currentTickerRef = useRef(null)

  const analyze = useCallback(async (rawTicker) => {
    const t = rawTicker.trim().toUpperCase()
    if (!t) return

    // Start loading — cancel any previous result
    currentTickerRef.current = t
    setTicker(t)
    setLoading(true)
    setError(null)
    setData(null)
    setStatus('loading')

    try {
      const result = await getTemperatureScore(t)

      // Ignore if a newer request has started in the meantime
      if (currentTickerRef.current !== t) return

      setData(result)
      setStatus('success')
    } catch (err) {
      if (currentTickerRef.current !== t) return
      setError(err.message || 'Analysis failed. Check your API keys and try again.')
      setStatus('error')
    } finally {
      if (currentTickerRef.current === t) {
        setLoading(false)
      }
    }
  }, [])

  const reset = useCallback(() => {
    currentTickerRef.current = null
    setData(null)
    setLoading(false)
    setError(null)
    setTicker(null)
    setStatus('idle')
  }, [])

  return { data, loading, error, ticker, status, analyze, reset }
}
