import { useState, useEffect, useCallback } from 'react'
import { useWindowWidth } from '../hooks/useWindowWidth.js'

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/v1'

function scoreColor(s) {
  if (s == null) return 'var(--text-3)'
  if (s >= 70)  return 'var(--green)'
  if (s >= 55)  return '#06d6e0'
  if (s >= 40)  return 'var(--blue-light)'
  if (s >= 25)  return 'var(--amber)'
  return 'var(--red)'
}

function ScoreBadge({ score, label }) {
  const col = scoreColor(score)
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontFamily: 'Space Mono, monospace',
        fontSize: 22, fontWeight: 800,
        color: col,
        textShadow: `0 0 16px ${col}50`,
        lineHeight: 1,
      }}>
        {score != null ? score : '—'}
      </div>
      {label && (
        <div style={{ fontSize: 10, color: col, opacity: 0.8, marginTop: 3, textTransform: 'capitalize' }}>
          {label.replace('_', ' ')}
        </div>
      )}
    </div>
  )
}

function MiniBar({ history = [] }) {
  if (!history.length) return (
    <div style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>No history yet</div>
  )
  const max = Math.max(...history.map(h => h.score))
  const min = Math.min(...history.map(h => h.score))
  const range = max - min || 1
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }}>
      {history.map((h, i) => {
        const pct = ((h.score - min) / range) * 100
        const col = scoreColor(h.score)
        return (
          <div key={i} title={`${h.date}: ${h.score}`} style={{
            flex: 1, minWidth: 6,
            height: `${Math.max(15, pct)}%`,
            background: col,
            borderRadius: 2,
            opacity: i === history.length - 1 ? 1 : 0.45,
            transition: 'height 0.4s ease',
          }}/>
        )
      })}
    </div>
  )
}

function WatchlistCard({ item, onRemove, onAnalyse }) {
  const [removing, setRemoving] = useState(false)
  const handleRemove = async () => {
    setRemoving(true)
    await onRemove(item.ticker)
  }
  return (
    <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              onClick={() => onAnalyse(item.ticker)}
              style={{
                fontFamily: 'Space Mono, monospace',
                fontSize: 15, fontWeight: 800,
                color: 'var(--blue-light)',
                cursor: 'pointer',
                letterSpacing: '-0.02em',
              }}
            >
              {item.ticker}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: '2px 7px',
              borderRadius: 5, border: '1px solid var(--border)',
              color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em',
            }}>
              {item.days_tracked > 0 ? `${item.days_tracked}d` : 'pending'}
            </span>
          </div>
          {item.date && (
            <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>
              Last updated {item.date}
            </div>
          )}
        </div>
        <ScoreBadge score={item.score} label={item.label} />
      </div>

      <MiniBar history={item.history || []} />

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onAnalyse(item.ticker)}
          style={{
            flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 700,
            background: 'rgba(99,126,255,0.1)', border: '1px solid rgba(99,126,255,0.25)',
            borderRadius: 8, color: 'var(--blue-light)', cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          Analyse now
        </button>
        <button
          onClick={handleRemove}
          disabled={removing}
          style={{
            padding: '7px 12px', fontSize: 11, fontWeight: 700,
            background: 'rgba(255,77,109,0.06)', border: '1px solid rgba(255,77,109,0.2)',
            borderRadius: 8, color: 'var(--red)', cursor: 'pointer', transition: 'all 0.15s',
            opacity: removing ? 0.5 : 1,
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

export default function WatchlistPanel({ onAnalyse }) {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [input, setInput]       = useState('')
  const [adding, setAdding]     = useState(false)
  const [error, setError]       = useState('')
  const isMobile = useWindowWidth() < 768

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/watchlist`)
      const data = await res.json()
      setItems(data.watchlist || [])
    } catch {
      setError('Could not load watchlist.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchWatchlist() }, [fetchWatchlist])

  const handleAdd = async () => {
    const ticker = input.trim().toUpperCase()
    if (!ticker) return
    setAdding(true)
    setError('')
    try {
      const res = await fetch(`${BASE}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.detail || 'Failed to add ticker.')
      } else {
        setInput('')
        await fetchWatchlist()
      }
    } catch {
      setError('Network error.')
    } finally {
      setAdding(false)
    }
  }

  const handleRemove = async (ticker) => {
    await fetch(`${BASE}/watchlist/${ticker}`, { method: 'DELETE' })
    await fetchWatchlist()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Auto-Track Watchlist</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
              Sentiment scores refresh automatically every 24 hours · {items.length} companies tracked
            </div>
          </div>
          <div style={{
            fontSize: 10, fontWeight: 700, padding: '4px 10px',
            background: 'rgba(0,245,160,0.08)', border: '1px solid rgba(0,245,160,0.2)',
            borderRadius: 8, color: 'var(--green)', letterSpacing: '0.06em',
          }}>
            ● AUTO-REFRESH ON
          </div>
        </div>

        {/* Add ticker */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <input
            value={input}
            onChange={e => { setInput(e.target.value.toUpperCase()); setError('') }}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Add ticker e.g. AAPL"
            maxLength={8}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
              borderRadius: 10, padding: '10px 14px',
              color: 'var(--text)', fontSize: 13,
              fontFamily: 'Space Mono, monospace',
              outline: 'none',
            }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !input.trim()}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 700,
              background: 'linear-gradient(135deg, var(--blue), var(--cyan))',
              border: 'none', borderRadius: 10,
              color: 'white', cursor: adding ? 'wait' : 'pointer',
              opacity: adding || !input.trim() ? 0.6 : 1,
              transition: 'opacity 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </div>
        {error && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 8 }}>{error}</div>}
      </div>

      {/* Cards grid */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 0', fontSize: 13 }}>
          Loading watchlist…
        </div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No tickers tracked yet. Add one above.</div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: 14,
        }}>
          {items.map(item => (
            <WatchlistCard
              key={item.ticker}
              item={item}
              onRemove={handleRemove}
              onAnalyse={onAnalyse}
            />
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>
        Clicking "Analyse now" runs the full NLP pipeline instantly and updates the score · Auto-refresh runs daily at server time
      </div>
    </div>
  )
}
