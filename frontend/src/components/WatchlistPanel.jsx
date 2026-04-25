import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useWindowWidth } from '../hooks/useWindowWidth.js'
import { TICKERS, logoUrl } from './SearchBar.jsx'

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/v1'

/* ── helpers ── */
function scoreColor(s) {
  if (s == null) return 'var(--text-3)'
  if (s >= 70)   return 'var(--green)'
  if (s >= 55)   return '#06d6e0'
  if (s >= 40)   return 'var(--blue-light)'
  if (s >= 25)   return 'var(--amber)'
  return 'var(--red)'
}

/* ── sub-components ── */
function ScoreBadge({ score, label }) {
  const col = scoreColor(score)
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 22, fontWeight: 800, color: col, textShadow: `0 0 16px ${col}50`, lineHeight: 1 }}>
        {score != null ? score : '—'}
      </div>
      {label && <div style={{ fontSize: 10, color: col, opacity: 0.8, marginTop: 3, textTransform: 'capitalize' }}>{label.replace(/_/g, ' ')}</div>}
    </div>
  )
}

function MiniBar({ history = [] }) {
  if (!history.length) return <div style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>No history yet</div>
  const max = Math.max(...history.map(h => h.score))
  const min = Math.min(...history.map(h => h.score))
  const range = max - min || 1
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 28 }}>
      {history.map((h, i) => (
        <div key={i} title={`${h.date}: ${h.score}`} style={{
          flex: 1, minWidth: 6, height: `${Math.max(15, ((h.score - min) / range) * 100)}%`,
          background: scoreColor(h.score), borderRadius: 2,
          opacity: i === history.length - 1 ? 1 : 0.45, transition: 'height 0.4s ease',
        }}/>
      ))}
    </div>
  )
}

function WatchlistCard({ item, onRemove, onAnalyse }) {
  const [removing, setRemoving] = useState(false)
  return (
    <div className="card" style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span onClick={() => onAnalyse(item.ticker)} style={{ fontFamily: 'Space Mono, monospace', fontSize: 15, fontWeight: 800, color: 'var(--blue-light)', cursor: 'pointer', letterSpacing: '-0.02em' }}>
              {item.ticker}
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, border: '1px solid var(--border)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {item.days_tracked > 0 ? `${item.days_tracked}d` : 'pending'}
            </span>
          </div>
          {item.date && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 3 }}>Last updated {item.date}</div>}
        </div>
        <ScoreBadge score={item.score} label={item.label} />
      </div>
      <MiniBar history={item.history || []} />
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => onAnalyse(item.ticker)} style={{ flex: 1, padding: '7px 0', fontSize: 11, fontWeight: 700, background: 'rgba(99,126,255,0.1)', border: '1px solid rgba(99,126,255,0.25)', borderRadius: 8, color: 'var(--blue-light)', cursor: 'pointer' }}>
          Analyse now
        </button>
        <button onClick={async () => { setRemoving(true); await onRemove(item.ticker) }} disabled={removing} style={{ padding: '7px 12px', fontSize: 11, fontWeight: 700, background: 'rgba(255,77,109,0.06)', border: '1px solid rgba(255,77,109,0.2)', borderRadius: 8, color: 'var(--red)', cursor: 'pointer', opacity: removing ? 0.5 : 1 }}>
          ✕
        </button>
      </div>
    </div>
  )
}

/* ── Portal dropdown — renders at document.body level to escape any overflow clipping ── */
function PortalDropdown({ anchorRef, suggestions, highlighted, onSelect, onHover }) {
  const [rect, setRect] = useState(null)

  useEffect(() => {
    if (!anchorRef.current) return
    const update = () => setRect(anchorRef.current.getBoundingClientRect())
    update()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true) }
  }, [anchorRef])

  if (!rect || !suggestions.length) return null

  return createPortal(
    <div style={{
      position: 'fixed',
      top: rect.bottom + 2,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      background: 'rgba(8,14,36,0.98)',
      border: '1px solid rgba(99,126,255,0.45)',
      borderRadius: 12,
      overflow: 'hidden',
      backdropFilter: 'blur(24px)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
      maxHeight: 340,
      overflowY: 'auto',
    }}>
      {suggestions.map((t, i) => (
        <div
          key={t.ticker}
          onMouseDown={e => { e.preventDefault(); onSelect(t) }}
          onMouseEnter={() => onHover(i)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px', cursor: 'pointer',
            background: i === highlighted ? 'rgba(99,126,255,0.13)' : 'transparent',
            borderBottom: i < suggestions.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            transition: 'background 0.1s',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {t.domain && (
              <img src={logoUrl(t.domain)} alt="" width={20} height={20}
                style={{ borderRadius: 5, objectFit: 'contain', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }}
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            )}
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color: 'var(--cyan)', flexShrink: 0, minWidth: 52 }}>
              {t.ticker}
            </span>
            <span style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {t.name}
            </span>
          </div>
          {t.sector || t.exchange ? (
            <span style={{ fontSize: 10, color: 'var(--text-3)', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: 20, whiteSpace: 'nowrap', marginLeft: 8, flexShrink: 0 }}>
              {t.sector || t.exchange}
            </span>
          ) : null}
        </div>
      ))}
    </div>,
    document.body
  )
}

/* ── Main component ── */
export default function WatchlistPanel({ onAnalyse }) {
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [input, setInput]         = useState('')
  const [adding, setAdding]       = useState(false)
  const [error, setError]         = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [dropOpen, setDropOpen]   = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const [searching, setSearching] = useState(false)
  const inputWrapRef = useRef(null)
  const debounceRef  = useRef(null)
  const isMobile     = useWindowWidth() < 768

  /* Live search: local first, then backend */
  useEffect(() => {
    const q = input.trim()
    if (!q) { setSuggestions([]); setDropOpen(false); return }

    // Instant local matches from the curated list
    const local = TICKERS.filter(t =>
      t.ticker.toLowerCase().startsWith(q.toLowerCase()) ||
      t.name.toLowerCase().includes(q.toLowerCase()) ||
      t.sector.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 6)

    setSuggestions(local)
    if (local.length) setDropOpen(true)

    // Debounced live search for anything not in local list
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res  = await fetch(`${BASE}/search_tickers?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        const remote = (data.results || []).map(r => ({
          ticker: r.ticker,
          name:   r.name,
          sector: r.exchange || r.type || '',
          domain: null,  // no logo for unknown companies
        }))
        // Merge: local first (they have logos), then remote entries not already shown
        const localTickers = new Set(local.map(l => l.ticker))
        const merged = [...local, ...remote.filter(r => !localTickers.has(r.ticker))].slice(0, 8)
        setSuggestions(merged)
        if (merged.length) setDropOpen(true)
      } catch { /* keep local results */ }
      finally { setSearching(false) }
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [input])

  // Close on outside click
  useEffect(() => {
    const fn = e => { if (inputWrapRef.current && !inputWrapRef.current.contains(e.target)) setDropOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  function selectSuggestion(t) {
    setInput('')
    setDropOpen(false)
    setSuggestions([])
    setHighlighted(-1)
    doAdd(t.ticker)
  }

  function handleKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted(h => Math.max(h - 1, -1)) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (highlighted >= 0 && suggestions[highlighted]) selectSuggestion(suggestions[highlighted])
      else handleAdd()
    }
    else if (e.key === 'Escape') setDropOpen(false)
  }

  const fetchWatchlist = useCallback(async () => {
    try {
      const res  = await fetch(`${BASE}/watchlist`)
      const data = await res.json()
      setItems(data.watchlist || [])
    } catch { setError('Could not load watchlist.') }
    finally  { setLoading(false) }
  }, [])

  useEffect(() => { fetchWatchlist() }, [fetchWatchlist])

  const doAdd = async (ticker) => {
    const t = ticker.trim().toUpperCase()
    if (!t) return
    setAdding(true); setError('')
    try {
      const res = await fetch(`${BASE}/watchlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: t }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.detail || 'Failed to add ticker.')
      } else {
        setInput(''); setDropOpen(false); setSuggestions([])
        await fetchWatchlist()
      }
    } catch { setError('Network error.') }
    finally  { setAdding(false) }
  }

  const handleAdd    = () => doAdd(input)
  const handleRemove = async (ticker) => { await fetch(`${BASE}/watchlist/${ticker}`, { method: 'DELETE' }); await fetchWatchlist() }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header card */}
      <div className="card" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>Auto-Track Watchlist</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
              Sentiment scores refresh automatically every 24 hours · {items.length} companies tracked
            </div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 700, padding: '4px 10px', background: 'rgba(0,245,160,0.08)', border: '1px solid rgba(0,245,160,0.2)', borderRadius: 8, color: 'var(--green)', letterSpacing: '0.06em' }}>
            ● AUTO-REFRESH ON
          </div>
        </div>

        {/* Search input */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <div ref={inputWrapRef} style={{ flex: 1, position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: `1px solid ${error ? 'var(--red)' : dropOpen && suggestions.length ? 'rgba(99,126,255,0.5)' : 'var(--border)'}`, borderRadius: 10, transition: 'border-color 0.15s' }}>
              <svg style={{ marginLeft: 12, flexShrink: 0, color: 'var(--text-3)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                value={input}
                onChange={e => { setInput(e.target.value); setHighlighted(-1); setError('') }}
                onFocus={() => { if (suggestions.length) setDropOpen(true) }}
                onKeyDown={handleKey}
                placeholder="Search any company — Best Buy, CoreWeave, Apple…"
                style={{ flex: 1, padding: '11px 12px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13 }}
              />
              {searching && (
                <svg style={{ marginRight: 12, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2">
                  <path d="M12 3a9 9 0 019 9" strokeLinecap="round"/>
                  <circle cx="12" cy="12" r="9" strokeOpacity="0.2"/>
                </svg>
              )}
              {input && !searching && (
                <button onClick={() => { setInput(''); setSuggestions([]); setDropOpen(false) }} style={{ marginRight: 8, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
              )}
            </div>

            {/* Portal dropdown — renders at body level, never clipped */}
            {dropOpen && suggestions.length > 0 && (
              <PortalDropdown
                anchorRef={inputWrapRef}
                suggestions={suggestions}
                highlighted={highlighted}
                onSelect={selectSuggestion}
                onHover={setHighlighted}
              />
            )}
          </div>

          <button
            onClick={handleAdd}
            disabled={adding || !input.trim()}
            style={{ padding: '11px 20px', fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg, var(--blue), var(--cyan))', border: 'none', borderRadius: 10, color: 'white', cursor: adding ? 'wait' : 'pointer', opacity: adding || !input.trim() ? 0.6 : 1, transition: 'opacity 0.15s', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </div>
        {error && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 6 }}>{error}</div>}
      </div>

      {/* Watchlist grid */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '40px 0', fontSize: 13 }}>Loading watchlist…</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>No tickers tracked yet. Search and add one above.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {items.map(item => (
            <WatchlistCard key={item.ticker} item={item} onRemove={handleRemove} onAnalyse={onAnalyse} />
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>
        "Analyse now" runs the full pipeline instantly · Auto-refresh runs daily · For any ticker not in the list, type it directly and press + Add
      </div>
    </div>
  )
}
