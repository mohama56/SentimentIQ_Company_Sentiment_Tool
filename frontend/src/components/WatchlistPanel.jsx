import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useWindowWidth } from '../hooks/useWindowWidth.js'
import { TICKERS, logoUrl } from './SearchBar.jsx'

const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api/v1'

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function scoreColor(s) {
  if (s == null) return 'var(--text-3)'
  if (s >= 70)   return '#00f5a0'
  if (s >= 55)   return '#06d6e0'
  if (s >= 40)   return '#a5b4fc'
  if (s >= 25)   return '#ffb830'
  return '#ff4d6d'
}

function scoreBg(s) {
  if (s == null) return 'rgba(255,255,255,0.04)'
  if (s >= 70)   return 'rgba(0,245,160,0.08)'
  if (s >= 55)   return 'rgba(6,214,224,0.08)'
  if (s >= 40)   return 'rgba(165,180,252,0.08)'
  if (s >= 25)   return 'rgba(255,184,48,0.08)'
  return 'rgba(255,77,109,0.08)'
}

function scoreBorder(s) {
  if (s == null) return 'var(--border)'
  if (s >= 70)   return 'rgba(0,245,160,0.2)'
  if (s >= 55)   return 'rgba(6,214,224,0.2)'
  if (s >= 40)   return 'rgba(165,180,252,0.2)'
  if (s >= 25)   return 'rgba(255,184,48,0.2)'
  return 'rgba(255,77,109,0.2)'
}

// "2026-04-23" + optional ISO timestamp → "04-23-2026 · 2:14 PM"
function formatDateTime(dateStr, computedAt) {
  if (!dateStr) return null
  const [y, m, d] = dateStr.split('-')
  const datePart = `${m}-${d}-${y}`
  if (computedAt) {
    try {
      const t = new Date(computedAt)
      const time = t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
      return `${datePart} · ${time}`
    } catch { /* fall through */ }
  }
  return datePart
}

// Look up company info from the curated TICKERS list
function getCompanyInfo(ticker) {
  return TICKERS.find(t => t.ticker === ticker) ?? null
}

/* ─── Mini spark line ─────────────────────────────────────────────────────── */
function SparkLine({ history = [] }) {
  if (history.length < 2) return null
  const scores = history.map(h => h.score)
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  const range = max - min || 1
  const W = 80, H = 28
  const pts = scores.map((s, i) => {
    const x = (i / (scores.length - 1)) * W
    const y = H - ((s - min) / range) * (H - 4) - 2
    return `${x},${y}`
  }).join(' ')
  const last = scores[scores.length - 1]
  const col  = scoreColor(last)
  return (
    <svg width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
      <circle cx={(scores.length - 1) / (scores.length - 1) * W} cy={H - ((last - min) / range) * (H - 4) - 2} r="2.5" fill={col}/>
    </svg>
  )
}

/* ─── Company logo ────────────────────────────────────────────────────────── */
function CompanyLogo({ ticker, domain, size = 40 }) {
  const [failed, setFailed] = useState(false)
  const initials = ticker.slice(0, 2)
  if (!domain || failed) {
    return (
      <div style={{
        width: size, height: size, borderRadius: size * 0.25,
        background: 'linear-gradient(135deg, rgba(99,126,255,0.3), rgba(6,214,224,0.2))',
        border: '1px solid rgba(99,126,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <span style={{ fontFamily: 'Space Mono, monospace', fontSize: size * 0.3, fontWeight: 800, color: 'var(--blue-light)' }}>
          {initials}
        </span>
      </div>
    )
  }
  return (
    <img
      src={logoUrl(domain)}
      alt={ticker}
      width={size} height={size}
      onError={() => setFailed(true)}
      style={{ borderRadius: size * 0.25, objectFit: 'contain', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0 }}
    />
  )
}

/* ─── Watchlist card ──────────────────────────────────────────────────────── */
function WatchlistCard({ item, onRemove, onAnalyse, isRefreshing = false }) {
  const [removing, setRemoving] = useState(false)
  const info    = getCompanyInfo(item.ticker)
  const col     = scoreColor(item.score)
  const bg      = scoreBg(item.score)
  const border  = scoreBorder(item.score)
  const updated = formatDateTime(item.date, item.computed_at)

  return (
    <div className="card fade-up" style={{
      padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column',
      border: `1px solid ${isRefreshing ? 'rgba(99,126,255,0.4)' : item.score != null ? border : 'var(--border)'}`,
      transition: 'border-color 0.3s',
      position: 'relative',
    }}>
      {/* Refreshing shimmer overlay */}
      {isRefreshing && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
          background: 'linear-gradient(90deg, transparent 0%, rgba(99,126,255,0.06) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.6s linear infinite',
        }}/>
      )}

      {/* Score bar accent — pulsing blue while refreshing */}
      <div style={{
        height: 3,
        background: isRefreshing
          ? 'linear-gradient(90deg, rgba(99,126,255,0.4), rgba(6,214,224,0.8), rgba(99,126,255,0.4))'
          : item.score != null
            ? `linear-gradient(90deg, ${col}60, ${col})`
            : 'transparent',
        width: '100%',
        backgroundSize: isRefreshing ? '200% 100%' : '100% 100%',
        animation: isRefreshing ? 'shimmer 1.6s linear infinite' : 'none',
      }}/>

      {/* Card body */}
      <div style={{ padding: '16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Row 1: logo + name + score */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <CompanyLogo ticker={item.ticker} domain={info?.domain} size={40} />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span
                onClick={() => onAnalyse(item.ticker)}
                style={{ fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 800, color: 'var(--blue-light)', cursor: 'pointer', letterSpacing: '-0.01em' }}
              >
                {item.ticker}
              </span>
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 5, border: '1px solid var(--border)', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {item.days_tracked > 0 ? `${item.days_tracked}d` : 'pending'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {info?.name ?? item.ticker}
            </div>
            {info?.sector && (
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{info.sector}</div>
            )}
          </div>

          {/* Score */}
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            {isRefreshing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 48 }}>
                <svg style={{ animation: 'spin 1s linear infinite' }} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--blue-light)" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="9" strokeOpacity="0.2"/>
                  <path d="M12 3a9 9 0 019 9" strokeLinecap="round"/>
                </svg>
                <div style={{ fontSize: 9, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.04em' }}>UPDATING</div>
              </div>
            ) : item.score != null ? (
              <>
                <div style={{
                  fontFamily: 'Space Mono, monospace', fontSize: 26, fontWeight: 800, lineHeight: 1,
                  color: col, textShadow: `0 0 20px ${col}50`,
                }}>
                  {item.score}
                </div>
                <div style={{ fontSize: 10, color: col, opacity: 0.85, marginTop: 3, textTransform: 'capitalize', fontWeight: 600 }}>
                  {item.label?.replace(/_/g, ' ')}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic', marginTop: 4 }}>Pending</div>
            )}
          </div>
        </div>

        {/* Row 2: spark line + last updated */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <div>
            {updated ? (
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 4 }}>
                Updated {updated}
              </div>
            ) : (
              <div style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic', marginBottom: 4 }}>
                Awaiting first refresh
              </div>
            )}
            {(item.history?.length ?? 0) > 1 && (
              <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{item.history.length}-day trend</div>
            )}
          </div>
          <SparkLine history={item.history ?? []} />
        </div>

        {/* Row 3: score gauge bar */}
        {item.score != null && (
          <div>
            <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{
                height: '100%', width: `${item.score}%`,
                background: `linear-gradient(90deg, ${col}80, ${col})`,
                borderRadius: 2, transition: 'width 1s ease',
                boxShadow: `0 0 8px ${col}60`,
              }}/>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 9, color: 'var(--text-3)' }}>0</span>
              <span style={{ fontSize: 9, color: 'var(--text-3)' }}>100</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={() => onAnalyse(item.ticker)}
          style={{
            flex: 1, padding: '10px 0', fontSize: 11, fontWeight: 700,
            background: 'transparent', border: 'none', borderRight: '1px solid var(--border)',
            color: 'var(--blue-light)', cursor: 'pointer', transition: 'background 0.15s',
            letterSpacing: '0.02em',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,126,255,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          Analyse now
        </button>
        <button
          onClick={async () => { setRemoving(true); await onRemove(item.ticker) }}
          disabled={removing}
          style={{
            padding: '10px 18px', fontSize: 11, fontWeight: 700,
            background: 'transparent', border: 'none',
            color: removing ? 'var(--text-3)' : 'var(--red)',
            cursor: removing ? 'wait' : 'pointer', transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,77,109,0.07)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {removing ? '…' : 'Remove'}
        </button>
      </div>
    </div>
  )
}

/* ─── Portal dropdown ─────────────────────────────────────────────────────── */
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
      position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width,
      zIndex: 9999, background: 'rgba(8,14,36,0.98)',
      border: '1px solid rgba(99,126,255,0.4)', borderRadius: 12,
      overflow: 'hidden', backdropFilter: 'blur(24px)',
      boxShadow: '0 20px 60px rgba(0,0,0,0.7)', maxHeight: 340, overflowY: 'auto',
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
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {t.domain
              ? <img src={logoUrl(t.domain)} alt="" width={22} height={22} style={{ borderRadius: 5, objectFit: 'contain', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} onError={e => { e.currentTarget.style.display = 'none' }}/>
              : <div style={{ width: 22, height: 22, borderRadius: 5, background: 'rgba(99,126,255,0.15)', border: '1px solid rgba(99,126,255,0.2)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 8, fontWeight: 800, color: 'var(--blue-light)' }}>{t.ticker.slice(0, 2)}</span></div>
            }
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, fontWeight: 700, color: 'var(--cyan)', flexShrink: 0, minWidth: 52 }}>{t.ticker}</span>
            <span style={{ fontSize: 12, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
          </div>
          {(t.sector || t.exchange) && (
            <span style={{ fontSize: 10, color: 'var(--text-3)', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: 20, whiteSpace: 'nowrap', marginLeft: 8, flexShrink: 0 }}>
              {t.sector || t.exchange}
            </span>
          )}
        </div>
      ))}
    </div>,
    document.body
  )
}

/* ─── Main panel ──────────────────────────────────────────────────────────── */
export default function WatchlistPanel({ onAnalyse }) {
  const [items, setItems]                   = useState([])
  const [loading, setLoading]               = useState(true)
  const [input, setInput]                   = useState('')
  const [adding, setAdding]                 = useState(false)
  const [error, setError]                   = useState('')
  const [suggestions, setSuggestions]       = useState([])
  const [dropOpen, setDropOpen]             = useState(false)
  const [highlighted, setHighlighted]       = useState(-1)
  const [searching, setSearching]           = useState(false)
  const [refreshingSet, setRefreshingSet]   = useState(new Set())   // tickers currently being refreshed
  const [refreshQueue, setRefreshQueue]     = useState([])          // tickers waiting to be refreshed
  const [refreshDone, setRefreshDone]       = useState(0)           // how many have finished
  const [refreshTotal, setRefreshTotal]     = useState(0)           // total stale count for this visit
  const [refreshError, setRefreshError]     = useState('')          // last ticker that failed
  const refreshRunning = useRef(false)      // guard against double-starts
  const inputWrapRef = useRef(null)
  const debounceRef  = useRef(null)
  const isMobile     = useWindowWidth() < 768

  /* ── Stale detection helper ──────────────────────────────────────────────── */
  function todayUTC() {
    return new Date().toISOString().slice(0, 10)   // "2026-04-24"
  }

  function isStale(item) {
    return item.score === null || item.date !== todayUTC()
  }

  /* ── Sequential auto-refresh engine ─────────────────────────────────────── */
  // Runs once after initial watchlist load (and on manual add so newly-added stale items get queued)
  const runRefreshQueue = useCallback(async (queue) => {
    if (!queue.length || refreshRunning.current) return
    refreshRunning.current = true

    for (const ticker of queue) {
      // Mark card as refreshing
      setRefreshingSet(prev => new Set([...prev, ticker]))

      try {
        const res  = await fetch(`${BASE}/get_temperature_score?ticker=${encodeURIComponent(ticker)}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        // Score saved server-side; now pull the updated watchlist entry for just this ticker
        const wRes  = await fetch(`${BASE}/watchlist`)
        const wData = await wRes.json()
        const updated = (wData.watchlist || []).find(w => w.ticker === ticker)
        if (updated) {
          setItems(prev => prev.map(it => it.ticker === ticker ? updated : it))
        }
      } catch {
        setRefreshError(ticker)
      }

      // Unmark refreshing, increment done count
      setRefreshingSet(prev => { const s = new Set(prev); s.delete(ticker); return s })
      setRefreshDone(d => d + 1)
    }

    refreshRunning.current = false
  }, [])

  /* ── Live search ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const q = input.trim()
    if (!q) { setSuggestions([]); setDropOpen(false); return }

    const ql = q.toLowerCase()
    function tokenize(str) {
      return str.replace(/([a-z])([A-Z])/g, '$1 $2').split(/[\s.\-&/,()]+/).filter(Boolean).map(w => w.toLowerCase())
    }
    const wordMatch = name => tokenize(name).some(tok => tok.startsWith(ql))
    const local = TICKERS.filter(t =>
      t.ticker.toLowerCase().startsWith(ql) || wordMatch(t.name) || t.sector.toLowerCase().startsWith(ql)
    ).slice(0, 6)

    setSuggestions(local)
    if (local.length) setDropOpen(true)

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res  = await fetch(`${BASE}/search_tickers?q=${encodeURIComponent(q)}`)
        const data = await res.json()
        const localSet = new Set(local.map(l => l.ticker))
        const remote = (data.results || [])
          .filter(r => !localSet.has(r.ticker))
          .map(r => ({ ticker: r.ticker, name: r.name, sector: r.exchange || '', domain: null }))
        const merged = [...local, ...remote].slice(0, 8)
        setSuggestions(merged)
        if (merged.length) setDropOpen(true)
      } catch { /* keep local */ }
      finally { setSearching(false) }
    }, 150)

    return () => clearTimeout(debounceRef.current)
  }, [input])

  useEffect(() => {
    const fn = e => { if (inputWrapRef.current && !inputWrapRef.current.contains(e.target)) setDropOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  function selectSuggestion(t) {
    setInput(''); setDropOpen(false); setSuggestions([]); setHighlighted(-1)
    doAdd(t.ticker)
  }

  function handleKey(e) {
    if (e.key === 'ArrowDown')  { e.preventDefault(); setHighlighted(h => Math.min(h + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, -1)) }
    else if (e.key === 'Enter') { e.preventDefault(); highlighted >= 0 && suggestions[highlighted] ? selectSuggestion(suggestions[highlighted]) : handleAdd() }
    else if (e.key === 'Escape') setDropOpen(false)
  }

  const fetchWatchlist = useCallback(async () => {
    try {
      const res  = await fetch(`${BASE}/watchlist`)
      const data = await res.json()
      const list = data.watchlist || []
      setItems(list)
      return list
    } catch { setError('Could not load watchlist.') }
    finally  { setLoading(false) }
  }, [])

  // On mount: load watchlist, then detect & queue stale items
  useEffect(() => {
    fetchWatchlist().then(list => {
      if (!list) return
      const stale = list.filter(isStale).map(i => i.ticker)
      if (stale.length) {
        setRefreshQueue(stale)
        setRefreshTotal(stale.length)
        setRefreshDone(0)
        runRefreshQueue(stale)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])   // intentionally runs once on mount

  const doAdd = async (ticker) => {
    const t = ticker.trim().toUpperCase()
    if (!t) return
    setAdding(true); setError('')
    try {
      const res = await fetch(`${BASE}/watchlist`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: t }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); setError(b.detail || 'Failed to add ticker.') }
      else {
        setInput(''); setDropOpen(false); setSuggestions([])
        const list = await fetchWatchlist()
        // If newly-added ticker is stale (no score yet), append to queue
        if (list) {
          const newItem = list.find(i => i.ticker === t)
          if (newItem && isStale(newItem) && !refreshingSet.has(t) && !refreshQueue.includes(t)) {
            const newQueue = [t]
            setRefreshQueue(prev => [...prev, t])
            setRefreshTotal(prev => prev + 1)
            runRefreshQueue(newQueue)
          }
        }
      }
    } catch { setError('Network error.') }
    finally  { setAdding(false) }
  }

  const handleAdd    = () => doAdd(input)
  const handleRemove = async t => { await fetch(`${BASE}/watchlist/${t}`, { method: 'DELETE' }); await fetchWatchlist() }

  /* ── Banner state ────────────────────────────────────────────────────────── */
  const isAutoRefreshing  = refreshingSet.size > 0
  const bannerVisible     = refreshTotal > 0 && refreshDone < refreshTotal
  const bannerRemaining   = refreshTotal - refreshDone
  const allDone           = refreshTotal > 0 && refreshDone >= refreshTotal && !isAutoRefreshing
  const [showDoneBanner, setShowDoneBanner] = useState(false)

  useEffect(() => {
    if (allDone) {
      setShowDoneBanner(true)
      const t = setTimeout(() => { setShowDoneBanner(false); setRefreshTotal(0); setRefreshDone(0) }, 4000)
      return () => clearTimeout(t)
    }
  }, [allDone])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Auto-refresh progress banner */}
      {(bannerVisible || showDoneBanner) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 18px', borderRadius: 12,
          background: showDoneBanner ? 'rgba(0,245,160,0.07)' : 'rgba(99,126,255,0.08)',
          border: `1px solid ${showDoneBanner ? 'rgba(0,245,160,0.25)' : 'rgba(99,126,255,0.25)'}`,
          fontSize: 13, fontWeight: 600, color: showDoneBanner ? '#00f5a0' : 'var(--blue-light)',
          animation: 'fade-up 0.3s ease',
        }}>
          {showDoneBanner ? (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
              All watchlist scores updated!
              {refreshError && <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400, marginLeft: 6 }}>({refreshError} failed — will retry next visit)</span>}
            </>
          ) : (
            <>
              <svg style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="9" strokeOpacity="0.2"/>
                <path d="M12 3a9 9 0 019 9" strokeLinecap="round"/>
              </svg>
              Auto-updating {bannerRemaining} {bannerRemaining === 1 ? 'company' : 'companies'}…
              <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>
                ({refreshDone}/{refreshTotal} done · ~25–45s each)
              </span>
            </>
          )}
        </div>
      )}

      {/* Header */}
      <div className="card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Auto-Track Watchlist</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
              Scores refresh every 24 hours automatically · {items.length} {items.length === 1 ? 'company' : 'companies'} tracked
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, padding: '5px 12px', background: 'rgba(0,245,160,0.07)', border: '1px solid rgba(0,245,160,0.18)', borderRadius: 8, color: '#00f5a0', letterSpacing: '0.05em' }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00f5a0', boxShadow: '0 0 6px #00f5a0', animation: 'pulse-glow 2s infinite' }}/>
            AUTO-REFRESH ON
          </div>
        </div>

        {/* Search */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div ref={inputWrapRef} style={{ flex: 1, position: 'relative' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${error ? '#ff4d6d' : dropOpen && suggestions.length ? 'rgba(99,126,255,0.5)' : 'var(--border)'}`,
              borderRadius: 10, paddingLeft: 12, transition: 'border-color 0.15s',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input
                value={input}
                onChange={e => { setInput(e.target.value); setHighlighted(-1); setError('') }}
                onFocus={() => { if (suggestions.length) setDropOpen(true) }}
                onKeyDown={handleKey}
                placeholder="Search any company — Best Buy, CoreWeave, Apple…"
                style={{ flex: 1, padding: '12px 4px', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13 }}
              />
              {searching && (
                <svg style={{ marginRight: 10, animation: 'spin 0.8s linear infinite', flexShrink: 0 }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" strokeOpacity="0.2"/>
                  <path d="M12 3a9 9 0 019 9" strokeLinecap="round"/>
                </svg>
              )}
              {input && !searching && (
                <button onClick={() => { setInput(''); setSuggestions([]); setDropOpen(false) }}
                  style={{ marginRight: 8, background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 18, cursor: 'pointer', lineHeight: 1, padding: 0 }}>×</button>
              )}
            </div>
            {dropOpen && suggestions.length > 0 && (
              <PortalDropdown anchorRef={inputWrapRef} suggestions={suggestions} highlighted={highlighted} onSelect={selectSuggestion} onHover={setHighlighted} />
            )}
          </div>
          <button
            onClick={handleAdd} disabled={adding || !input.trim()}
            style={{ padding: '12px 22px', fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg, var(--blue), var(--cyan))', border: 'none', borderRadius: 10, color: 'white', cursor: adding ? 'wait' : 'pointer', opacity: adding || !input.trim() ? 0.55 : 1, transition: 'opacity 0.15s', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </div>
        {error && <div style={{ fontSize: 11, color: '#ff4d6d', marginTop: 8 }}>{error}</div>}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '48px 0', fontSize: 13 }}>Loading watchlist…</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 12 }}>⭐</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>Your watchlist is empty</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Search for any company above to start auto-tracking its sentiment</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {items.map(item => (
            <WatchlistCard
              key={item.ticker}
              item={item}
              onRemove={handleRemove}
              onAnalyse={onAnalyse}
              isRefreshing={refreshingSet.has(item.ticker)}
            />
          ))}
        </div>
      )}

      <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', paddingBottom: 4 }}>
        "Analyse now" runs the full NLP pipeline instantly and updates the score · Scores shown are for research purposes only
      </div>
    </div>
  )
}
