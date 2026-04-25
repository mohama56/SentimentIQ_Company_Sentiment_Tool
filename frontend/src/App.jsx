import { useCallback, useEffect, useState } from 'react'
import { useCompanyAnalysis } from './hooks/useCompanyAnalysis.js'
import { marketStatus } from './utils/format.js'
import { useWindowWidth } from './hooks/useWindowWidth.js'
import SearchBar from './components/SearchBar.jsx'
import { EmptyState } from './components/EmptyState.jsx'
import { LoadingSkeleton } from './components/LoadingSkeleton.jsx'
import { ErrorState } from './components/ErrorState.jsx'
import Dashboard from './components/Dashboard.jsx'
import WatchlistPanel from './components/WatchlistPanel.jsx'

const NAV_ITEMS = [
  { label: 'Dashboard' },
  { label: 'Watchlist' },
]

const MODEL_TAGS = [
  { label: 'FinBERT',         color: '#a5b4fc' },
  { label: 'VADER',           color: '#06d6e0' },
  { label: 'BERTopic',        color: '#c77dff' },
  { label: 'DeBERTa',         color: '#ffb830' },
  { label: 'SEC Edgar',       color: '#00f5a0' },
  { label: 'spaCy',           color: '#ff7eb3' },
  { label: 'Event Detection', color: '#ff4d6d' },
  { label: 'Score History',   color: '#63a4ff' },
]

// Minimal SVG icon for nav items
function NavIcon({ label }) {
  const icons = {
    Dashboard: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
    Watchlist: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
  }
  return icons[label] ?? null
}

export default function App() {
  const { data, loading, error, ticker, status, analyze } = useCompanyAnalysis()
  const handleRefresh = useCallback(() => { if (ticker) analyze(ticker) }, [ticker, analyze])
  const [mkt, setMkt] = useState(marketStatus())
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeView, setActiveView] = useState('Dashboard')
  const width = useWindowWidth()
  const isMobile = width < 768

  const handleWatchlistAnalyse = useCallback((t) => {
    setActiveView('Dashboard')
    analyze(t)
    if (isMobile) setSidebarOpen(false)
  }, [analyze, isMobile])

  useEffect(() => {
    const id = setInterval(() => setMkt(marketStatus()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    if (!isMobile) setSidebarOpen(false)
  }, [isMobile])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Mobile overlay ── */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 49,
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
        }}/>
      )}

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: 'rgba(10,17,40,0.98)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: isMobile ? (sidebarOpen ? 0 : -220) : 0,
        height: '100vh',
        backdropFilter: 'blur(20px)',
        zIndex: isMobile ? 50 : 'auto',
        transition: 'left 0.25s ease',
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 20px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>

            {/* Icon mark */}
            <div style={{
              width: 38, height: 38,
              background: 'linear-gradient(145deg, #6366f1 0%, #4338ca 45%, #0ea5e9 100%)',
              borderRadius: 11,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 4px 24px rgba(99,102,241,0.55)',
              flexShrink: 0,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Glass sheen */}
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '52%',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 100%)',
                borderRadius: '11px 11px 60% 60%',
                pointerEvents: 'none',
              }}/>
              {/* Custom SVG mark — brain arch + sentiment pulse */}
              <svg width="22" height="20" viewBox="0 0 26 22" fill="none" strokeLinecap="round" strokeLinejoin="round">
                {/* Brain arch */}
                <path d="M5 13 C5 7 8.5 3 13 3 C17.5 3 21 7 21 13" stroke="white" strokeWidth="2" strokeOpacity="0.45"/>
                {/* Sentiment pulse line */}
                <path d="M2 13 L5 13 L7.5 7.5 L10.5 18 L13 9.5 L15.5 15.5 L18 11.5 L21 13 L24 13" stroke="white" strokeWidth="2.2" strokeOpacity="1"/>
                {/* Baseline */}
                <line x1="5" y1="19" x2="21" y2="19" stroke="white" strokeWidth="1.5" strokeOpacity="0.3"/>
              </svg>
            </div>

            {/* Wordmark */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                <span style={{ color: 'var(--text)' }}>Sentiment</span>
                <span style={{
                  background: 'linear-gradient(90deg, #818cf8, #38bdf8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>IQ</span>
              </div>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
                textTransform: 'uppercase', marginTop: 3,
                color: 'transparent',
                background: 'linear-gradient(90deg, rgba(129,140,248,0.7), rgba(56,189,248,0.5))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>
                Intelligence Platform
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {NAV_ITEMS.map(item => {
            const isActive = activeView === item.label
            return (
              <div key={item.label} onClick={() => { setActiveView(item.label); if (isMobile) setSidebarOpen(false) }} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px',
                borderRadius: 10,
                marginBottom: 2,
                cursor: 'pointer',
                background: isActive ? 'rgba(99,126,255,0.15)' : 'transparent',
                border: isActive ? '1px solid rgba(99,126,255,0.2)' : '1px solid transparent',
                color: isActive ? 'var(--blue-light)' : 'var(--text-3)',
                transition: 'all 0.15s',
                boxShadow: isActive ? '0 0 12px rgba(99,126,255,0.1)' : 'none',
              }}>
                <NavIcon label={item.label} />
                <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 500 }}>{item.label}</span>
                {isActive && (
                  <div style={{
                    marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--blue-light)',
                    boxShadow: '0 0 6px var(--blue)',
                  }}/>
                )}
              </div>
            )
          })}
        </nav>

        {/* Market status */}
        <div style={{
          margin: '0 12px 12px',
          padding: '12px 14px',
          background: 'rgba(0,0,0,0.2)',
          borderRadius: 10,
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: mkt.open ? 'var(--green)' : 'var(--text-3)',
              boxShadow: mkt.open ? '0 0 8px rgba(0,245,160,0.6)' : 'none',
              animation: mkt.open ? 'pulse-glow 2s infinite' : 'none',
              flexShrink: 0,
            }}/>
            <span style={{ fontSize: 12, fontWeight: 700, color: mkt.open ? 'var(--green)' : 'var(--text-3)' }}>
              {mkt.label}
            </span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 500 }}>
            NYSE · NASDAQ · AMEX
          </div>
        </div>

        {/* NLP Pipeline tags */}
        <div style={{ padding: '14px 12px', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 10 }}>
            NLP Pipeline
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {MODEL_TAGS.map(m => (
              <span key={m.label} style={{
                fontSize: 9, fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                border: `1px solid ${m.color}25`,
                background: m.color + '10',
                color: m.color,
                letterSpacing: '0.02em',
              }}>{m.label}</span>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

        {/* Top bar */}
        <header style={{
          height: 52,
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center',
          padding: isMobile ? '0 16px' : '0 28px',
          background: 'rgba(6,11,24,0.85)',
          backdropFilter: 'blur(20px)',
          position: 'sticky', top: 0, zIndex: 40,
          justifyContent: 'space-between',
          gap: 12,
        }}>
          {/* Hamburger on mobile */}
          {isMobile && (
            <button onClick={() => setSidebarOpen(o => !o)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-3)', padding: 4, flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          )}
          <div style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {status === 'success' && data ? (
              <span>
                <span style={{ color: 'var(--blue-light)', fontWeight: 700 }}>{data.company}</span>
                <span style={{ color: 'var(--text-3)' }}>
                  {' '}· {data.signal_count} signals
                  {data.computed_at ? ' · ' + new Date(data.computed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <span style={{
                  fontWeight: 800, fontSize: 13, letterSpacing: '-0.01em',
                  background: 'linear-gradient(90deg, #818cf8, #38bdf8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>SentimentIQ</span>
                <span style={{
                  fontSize: 10, fontWeight: 600, color: 'var(--text-3)',
                  padding: '2px 8px', border: '1px solid var(--border)',
                  borderRadius: 20, letterSpacing: '0.04em',
                }}>
                  {activeView === 'Watchlist' ? 'Watchlist' : 'Dashboard'}
                </span>
              </span>
            )}
          </div>

          {/* Market status indicator in header too */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: mkt.open ? 'var(--green)' : 'var(--text-3)',
              boxShadow: mkt.open ? '0 0 6px rgba(0,245,160,0.6)' : 'none',
            }}/>
            <span style={{ fontSize: 11, fontWeight: 600, color: mkt.open ? 'var(--green)' : 'var(--text-3)' }}>
              {mkt.label}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: isMobile ? '16px 12px 60px' : '24px 28px 60px' }}>
          {activeView === 'Watchlist' ? (
            <WatchlistPanel onAnalyse={handleWatchlistAnalyse} />
          ) : (
            <>
              <SearchBar onSearch={analyze} loading={loading} />
              {status === 'idle'    && <EmptyState />}
              {status === 'loading' && <LoadingSkeleton ticker={ticker} />}
              {status === 'error'   && <ErrorState error={error} ticker={ticker} onRetry={handleRefresh} />}
              {status === 'success' && data && (
                <Dashboard data={data} onRefresh={handleRefresh} loading={loading} />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}