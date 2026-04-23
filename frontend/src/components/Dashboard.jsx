import { useState, useEffect } from 'react'
import { logoUrl, domainForTicker } from './SearchBar.jsx'
import {
  scoreColor, scoreLabel, scoreZone, pillClass, formatLabel,
  formatRevenue, formatPct, timeAgo, truncate, eventPillClass,
  shortDate, formatQuarter, SCORE_ZONES,
} from '../utils/format.js'
import { SentimentTrendChart, SourceBreakdownChart } from './Charts.jsx'

// ── Circular gauge SVG ──
function CircleGauge({ score }) {
  const [anim, setAnim] = useState(0)
  useEffect(() => {
    const t0 = setTimeout(() => {
      const start = Date.now()
      const dur = 1400
      const frame = () => {
        const t = Math.min((Date.now() - start) / dur, 1)
        setAnim(score * (1 - Math.pow(1 - t, 3)))
        if (t < 1) requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    }, 200)
    return () => clearTimeout(t0)
  }, [score])

  const r   = 80
  const cx  = 100
  const cy  = 100
  const arc = 2 * Math.PI * r
  const pct = anim / 100
  const color = scoreColor(score)
  const zone  = scoreZone(score)

  // Arc background — 270° sweep
  const startAngle = 135
  const sweepAngle = 270
  const toRad = d => (d * Math.PI) / 180
  function arcPath(from, sweep) {
    const start = { x: cx + r * Math.cos(toRad(from)), y: cy + r * Math.sin(toRad(from)) }
    const end   = { x: cx + r * Math.cos(toRad(from + sweep)), y: cy + r * Math.sin(toRad(from + sweep)) }
    const large = sweep > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`
  }
  const activeSweep = sweepAngle * pct

  return (
    <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto' }}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        <defs>
          <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#ff4d6d"/>
            <stop offset="25%"  stopColor="#ffb830"/>
            <stop offset="60%"  stopColor="#637eff"/>
            <stop offset="100%" stopColor="#00f5a0"/>
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        {/* Track */}
        <path d={arcPath(startAngle, sweepAngle)} fill="none" stroke="rgba(99,126,255,0.1)" strokeWidth="12" strokeLinecap="round"/>

        {/* Zone marks */}
        {[25, 45, 60, 75].map(z => {
          const angle = startAngle + (z / 100) * sweepAngle
          const ix = cx + (r + 16) * Math.cos(toRad(angle))
          const iy = cy + (r + 16) * Math.sin(toRad(angle))
          return (
            <circle key={z} cx={ix} cy={iy} r="2" fill="rgba(99,126,255,0.3)"/>
          )
        })}

        {/* Active arc */}
        {activeSweep > 0 && (
          <path
            d={arcPath(startAngle, activeSweep)}
            fill="none"
            stroke="url(#arcGrad)"
            strokeWidth="12"
            strokeLinecap="round"
            filter="url(#glow)"
          />
        )}

        {/* Needle dot */}
        {activeSweep > 0 && (() => {
          const angle = startAngle + activeSweep
          const nx = cx + r * Math.cos(toRad(angle))
          const ny = cy + r * Math.sin(toRad(angle))
          return (
            <circle cx={nx} cy={ny} r="7" fill={color} filter="url(#glow)"
              style={{ boxShadow: `0 0 10px ${color}` }}/>
          )
        })()}

        {/* Center score */}
        <text x="100" y="94" textAnchor="middle" fill={color}
          fontFamily="Space Mono, monospace" fontSize="32" fontWeight="700">
          {Math.round(anim)}
        </text>
        <text x="100" y="112" textAnchor="middle" fill="rgba(255,255,255,0.4)"
          fontFamily="Plus Jakarta Sans, sans-serif" fontSize="11" fontWeight="500">
          / 100
        </text>
        <text x="100" y="130" textAnchor="middle" fill={color}
          fontFamily="Plus Jakarta Sans, sans-serif" fontSize="12" fontWeight="700">
          {zone.label}
        </text>
      </svg>
    </div>
  )
}

export default function Dashboard({ data, onRefresh, loading }) {
  const {
    company, ticker, temperature_score, sentiment_label, confidence_score,
    signal_count, event_flags = [], event_adjustment, score_explanation,
    source_breakdown, aspect_breakdown, top_themes = [], financials,
    evidence = {}, sentiment_history = [], computed_at,
  } = data

  const color = scoreColor(temperature_score)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

      {/* ── Company header ── */}
      <div className="card" style={{ padding: '20px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Company icon */}
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: `linear-gradient(135deg, ${color}22, ${color}44)`,
              border: `1px solid ${color}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden',
            }}>
              <img
                src={logoUrl(domainForTicker(ticker) ?? ticker?.toLowerCase() + '.com')}
                alt={company}
                width={36} height={36}
                style={{ objectFit: 'contain' }}
                onError={e => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.parentElement.style.fontSize = '20px'
                  e.currentTarget.parentElement.style.fontWeight = '800'
                  e.currentTarget.parentElement.style.color = color
                  e.currentTarget.parentElement.style.fontFamily = 'Space Mono, monospace'
                  e.currentTarget.parentElement.textContent = ticker?.charAt(0)
                }}
              />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
                  {company}
                </h1>
                <span style={{
                  fontFamily: 'Space Mono, monospace',
                  fontSize: 11, fontWeight: 700,
                  padding: '3px 10px',
                  background: 'rgba(6,214,224,0.1)',
                  border: '1px solid rgba(6,214,224,0.3)',
                  borderRadius: 6,
                  color: 'var(--cyan)',
                }}>{ticker}</span>
                <span className={pillClass(sentiment_label)}>
                  {formatLabel(sentiment_label)}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-3)' }}>
                {computed_at && (
                  <span>Updated {new Date(computed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} · {shortDate(computed_at)}</span>
                )}
                <span>{signal_count} signals analysed</span>
                {confidence_score && <span>{(confidence_score * 100).toFixed(0)}% model confidence</span>}
              </div>
            </div>
          </div>
          <button onClick={onRefresh} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px',
            fontSize: 13, fontWeight: 700,
            background: 'rgba(99,126,255,0.1)',
            border: '1px solid var(--border-hi)',
            borderRadius: 10,
            color: 'var(--blue-light)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = 'var(--glow-blue)' }}
          onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }}>
              <path d="M4 12a8 8 0 018-8" strokeLinecap="round"/>
              <path d="M20 12a8 8 0 01-8 8" strokeLinecap="round"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Main row: Gauge + Stats + Trend ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 18 }}>

        {/* Gauge card */}
        <div className="card fade-up delay-1" style={{ padding: '24px 20px', textAlign: 'center' }}>
          <div className="label" style={{ marginBottom: 16, textAlign: 'center' }}>Sentiment Score</div>
          <CircleGauge score={temperature_score} />

          <div className="divider" style={{ margin: '20px 0' }}/>

          {/* Confidence */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Confidence</span>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--text)' }}>
                {confidence_score ? (confidence_score * 100).toFixed(0) + '%' : '—'}
              </span>
            </div>
            <div style={{ height: 4, background: 'rgba(99,126,255,0.1)', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{
                height: '100%',
                width: confidence_score ? (confidence_score * 100) + '%' : '0%',
                background: 'linear-gradient(90deg, var(--blue), var(--cyan))',
                borderRadius: 2,
                transition: 'width 1s ease',
                boxShadow: '0 0 8px rgba(6,214,224,0.5)',
              }}/>
            </div>
          </div>

          {/* Source mini bars */}
          <div className="label" style={{ marginBottom: 12, textAlign: 'left' }}>By Source</div>
          {[
            { key: 'news',      label: 'News',      w: 35, col: '#637eff' },
            { key: 'reddit',    label: 'Reddit',    w: 25, col: '#ff7eb3' },
            { key: 'filings',   label: 'Filings',   w: 15, col: '#00f5a0' },
            { key: 'financial', label: 'Financial', w: 15, col: '#ffb830' },
          ].map(({ key, label, w, col }) => {
            const val = source_breakdown?.[key]
            if (val == null) return null
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, textAlign: 'left' }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)', width: 56, flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: val + '%', background: col, borderRadius: 2, transition: 'width 1s ease', boxShadow: `0 0 6px ${col}60` }}/>
                </div>
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: 700, color: 'var(--text)', width: 22, textAlign: 'right' }}>
                  {Math.round(val)}
                </span>
              </div>
            )
          })}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            <KpiCard label="Signal Volume" value={signal_count} sub="deduplicated" color="var(--blue-light)" delay="delay-1"/>
            <KpiCard
              label="Event Detection"
              color="var(--amber)"
              delay="delay-2"
              custom={
                event_flags.length > 0 ? (
                  <div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                      {event_flags.slice(0, 2).map(f => {
                        const { label: lbl, className } = eventPillClass(f)
                        return <span key={f} className={className} style={{ fontSize: 10 }}>{lbl}</span>
                      })}
                    </div>
                    {event_adjustment != null && (
                      <span style={{ fontSize: 18, fontWeight: 800, color: event_adjustment >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'Space Mono, monospace' }}>
                        {event_adjustment >= 0 ? '+' : ''}{event_adjustment} pts
                      </span>
                    )}
                  </div>
                ) : <span style={{ fontSize: 14, color: 'var(--text-3)' }}>None detected</span>
              }
            />
            <KpiCard
              label="History"
              value={sentiment_history.length}
              sub={sentiment_history.length === 1 ? 'day — builds daily' : 'days tracked'}
              color="var(--purple)"
              delay="delay-3"
            />
          </div>

          {/* Trend chart */}
          <SentimentTrendChart history={sentiment_history} />
        </div>
      </div>

      {/* ── Source breakdown ── */}
      <SourceBreakdownChart sourceBreakdown={source_breakdown} />

      {/* ── Aspects + Score explanation ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <AspectCard aspects={aspect_breakdown} />
        <ExplanationCard explanation={score_explanation} eventFlags={event_flags} eventAdjustment={event_adjustment} />
      </div>

      {/* ── Topics + Financials ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
        <TopicsCard topics={top_themes} />
        <FinancialsCard financials={financials} />
      </div>

      {/* ── Evidence ── */}
      <EvidenceCard evidence={evidence} />

      <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', paddingTop: 4 }}>
        Analysis computed {computed_at ? new Date(computed_at).toLocaleString() : '—'} · For research purposes only · Not financial advice
      </div>
    </div>
  )
}

// ── KPI Card ──
function KpiCard({ label, value, sub, color = 'var(--text)', custom, delay = '' }) {
  return (
    <div className={`card fade-up ${delay}`} style={{ padding: '18px 20px' }}>
      <div className="label" style={{ marginBottom: 12 }}>{label}</div>
      {custom ?? (
        <>
          <div style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: 34, fontWeight: 700,
            color, lineHeight: 1,
            letterSpacing: '-0.03em', marginBottom: 6,
            textShadow: `0 0 20px ${color}50`,
          }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>{sub}</div>}
        </>
      )}
    </div>
  )
}

// ── Aspect Card ──
function AspectCard({ aspects }) {
  if (!aspects) return null
  const items = [
    { key: 'earnings_profitability', label: 'Earnings & Profitability', col: '#00f5a0' },
    { key: 'product_innovation',     label: 'Product & Innovation',     col: '#637eff' },
    { key: 'leadership_governance',  label: 'Leadership & Governance',  col: '#c77dff' },
    { key: 'macro_industry',         label: 'Macro & Industry',         col: '#06d6e0' },
    { key: 'legal_regulatory',       label: 'Legal & Regulatory',       col: '#ffb830' },
  ]
  return (
    <div className="card fade-up delay-3" style={{ padding: '22px 24px' }}>
      <div className="label" style={{ marginBottom: 20 }}>Aspect Analysis</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {items.map(({ key, label, col }) => {
          const pct = Math.round((aspects[key] ?? 0.5) * 100)
          return (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7 }}>
                <span style={{ fontSize: 13, color: 'var(--text-2)', fontWeight: 500 }}>{label}</span>
                <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 700, color: col }}>{pct}</span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{
                  height: '100%', width: pct + '%',
                  background: `linear-gradient(90deg, ${col}99, ${col})`,
                  borderRadius: 3,
                  transition: 'width 1.2s cubic-bezier(0.4,0,0.2,1)',
                  boxShadow: `0 0 8px ${col}60`,
                }}/>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Explanation Card ──
function ExplanationCard({ explanation, eventFlags = [], eventAdjustment }) {
  return (
    <div className="card fade-up delay-3" style={{ padding: '22px 24px' }}>
      <div className="label" style={{ marginBottom: 16 }}>Score Drivers</div>
      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.85, marginBottom: 18 }}>
        {explanation || 'Analysis complete.'}
      </p>
      {eventFlags.length > 0 && (
        <>
          <div className="label" style={{ marginBottom: 12 }}>Detected Events</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {eventFlags.map(flag => {
              const { label, className } = eventPillClass(flag)
              return <span key={flag} className={className}>{label}</span>
            })}
          </div>
          {eventAdjustment != null && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 16px',
              borderRadius: 10,
              background: eventAdjustment >= 0 ? 'rgba(0,245,160,0.08)' : 'rgba(255,77,109,0.08)',
              border: `1px solid ${eventAdjustment >= 0 ? 'rgba(0,245,160,0.25)' : 'rgba(255,77,109,0.25)'}`,
            }}>
              <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 14, fontWeight: 700, color: eventAdjustment >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {eventAdjustment >= 0 ? '+' : ''}{eventAdjustment} pts
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>from events</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Topics Card ──
function TopicsCard({ topics = [] }) {
  const palette = [
    { bg: 'rgba(0,245,160,0.1)',  border: 'rgba(0,245,160,0.25)',  text: '#00f5a0' },
    { bg: 'rgba(6,214,224,0.1)',  border: 'rgba(6,214,224,0.25)',  text: '#06d6e0' },
    { bg: 'rgba(99,126,255,0.1)', border: 'rgba(99,126,255,0.25)', text: '#a5b4fc' },
    { bg: 'rgba(199,125,255,0.1)',border: 'rgba(199,125,255,0.25)',text: '#c77dff' },
    { bg: 'rgba(255,184,48,0.1)', border: 'rgba(255,184,48,0.25)', text: '#ffb830' },
    { bg: 'rgba(255,126,179,0.1)',border: 'rgba(255,126,179,0.25)',text: '#ff7eb3' },
    { bg: 'rgba(255,77,109,0.1)', border: 'rgba(255,77,109,0.25)', text: '#ff4d6d' },
  ]
  return (
    <div className="card fade-up delay-4" style={{ padding: '22px 24px' }}>
      <div className="label" style={{ marginBottom: 16 }}>Topic Clusters</div>
      {topics.length > 0 ? (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {topics.map((topic, i) => {
              const c = palette[i % palette.length]
              return (
                <span key={topic} style={{
                  padding: '6px 16px',
                  fontSize: 12, fontWeight: i === 0 ? 700 : 500,
                  background: c.bg, border: `1px solid ${c.border}`,
                  borderRadius: 20, color: c.text,
                  boxShadow: i === 0 ? `0 0 12px ${c.text}30` : 'none',
                  transition: 'all 0.2s',
                }}>{topic}</span>
              )
            })}
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 16 }}>
            Extracted via BERTopic · ranked by signal frequency
          </p>
        </>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No topics extracted.</p>
      )}
    </div>
  )
}

// ── Financials Card ──
function FinancialsCard({ financials }) {
  if (!financials?.quarters?.length) return (
    <div className="card fade-up delay-4" style={{ padding: '22px 24px' }}>
      <div className="label" style={{ marginBottom: 14 }}>Quarterly Financials</div>
      <p style={{ fontSize: 13, color: 'var(--text-3)' }}>Financial data unavailable for this ticker.</p>
    </div>
  )

  const { quarters, revenue_bn, eps, net_margin, revenue_growth, eps_trend, source } = financials
  const maxRev = Math.max(...revenue_bn)

  return (
    <div className="card fade-up delay-4" style={{ padding: '22px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div className="label">Quarterly Financials</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12 }}>
          {revenue_growth != null && (
            <span style={{
              color: revenue_growth >= 0 ? 'var(--green)' : 'var(--red)',
              fontWeight: 700, fontFamily: 'Space Mono, monospace',
            }}>
              {revenue_growth >= 0 ? '▲' : '▼'} {Math.abs(revenue_growth * 100).toFixed(1)}% YoY
            </span>
          )}
          <span style={{ color: eps_trend === 'increasing' ? 'var(--green)' : eps_trend === 'decreasing' ? 'var(--red)' : 'var(--text-3)', fontWeight: 600 }}>
            EPS {eps_trend}
          </span>
          {source && <span style={{ fontSize: 10, color: 'var(--text-3)', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: 6 }}>{source}</span>}
        </div>
      </div>

      {/* Header */}
      <div style={{ display: 'grid', gridTemplateColumns: '90px 1fr 84px 52px 56px', gap: 10, paddingBottom: 10, marginBottom: 6, borderBottom: '1px solid var(--border)' }}>
        {['Quarter', '', 'Revenue', 'EPS', 'Margin'].map((h, i) => (
          <span key={i} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: i > 1 ? 'right' : 'left' }}>{h}</span>
        ))}
      </div>

      {quarters.map((q, i) => {
        const latest = i === 0
        const barW   = maxRev > 0 ? (revenue_bn[i] / maxRev) * 100 : 0
        return (
          <div key={q} style={{
            display: 'grid', gridTemplateColumns: '90px 1fr 84px 52px 56px',
            alignItems: 'center', gap: 10,
            padding: '10px 14px', marginBottom: 6,
            background: latest ? 'rgba(0,245,160,0.04)' : 'transparent',
            borderRadius: 10,
            border: latest ? '1px solid rgba(0,245,160,0.15)' : '1px solid transparent',
          }}>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, fontWeight: latest ? 700 : 400, color: latest ? 'var(--green)' : 'var(--text-3)' }}>
              {formatQuarter(q)}
            </span>
            <div style={{ height: 5, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{
                height: '100%', width: barW + '%',
                background: latest
                  ? 'linear-gradient(90deg, rgba(0,245,160,0.6), var(--green))'
                  : 'rgba(99,126,255,0.3)',
                borderRadius: 3,
                boxShadow: latest ? '0 0 8px rgba(0,245,160,0.4)' : 'none',
              }}/>
            </div>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 700, color: latest ? 'var(--text)' : 'var(--text-2)', textAlign: 'right' }}>
              {formatRevenue(revenue_bn[i])}
            </span>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: 'var(--text-2)', textAlign: 'right' }}>
              ${eps[i]?.toFixed(2)}
            </span>
            <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: 'var(--text-3)', textAlign: 'right' }}>
              {formatPct(net_margin[i])}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Evidence Card ──
const TABS      = [{ key: 'news', label: 'News' }, { key: 'reddit', label: 'Reddit' }, { key: 'filings', label: 'Filings' }]
const TAB_COLS  = { news: '#06d6e0', reddit: '#ff7eb3', filings: '#00f5a0' }

function EvidenceCard({ evidence = {} }) {
  const [active, setActive] = useState('news')
  const items = evidence[active] ?? []

  return (
    <div className="card fade-up delay-5" style={{ padding: '22px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div className="label">Signal Evidence</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {TABS.map(tab => {
            const count    = evidence[tab.key]?.length ?? 0
            const isActive = active === tab.key
            const col      = TAB_COLS[tab.key]
            return (
              <button key={tab.key} onClick={() => setActive(tab.key)} style={{
                padding: '6px 16px',
                fontSize: 12, fontWeight: isActive ? 700 : 500,
                background: isActive ? col + '15' : 'transparent',
                border: `1px solid ${isActive ? col + '40' : 'var(--border)'}`,
                borderRadius: 8,
                color: isActive ? col : 'var(--text-3)',
                cursor: 'pointer', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: isActive ? `0 0 12px ${col}20` : 'none',
              }}>
                {tab.label}
                {count > 0 && <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 10 }}>{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="thin-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: 380, overflowY: 'auto', paddingRight: 4 }}>
        {items.length > 0 ? items.map((item, i) => (
          <div key={i} style={{
            borderLeft: `3px solid ${TAB_COLS[active] ?? 'var(--border)'}`,
            paddingLeft: 18,
            paddingTop: 2,
          }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              {item.outlet && <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{item.outlet}</span>}
              {item.subreddit && <span style={{ fontSize: 13, fontWeight: 700, color: '#ff7eb3' }}>r/{item.subreddit}</span>}
              {item.published_at && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{timeAgo(item.published_at)}</span>}
              {item.upvotes > 0 && <span style={{ fontSize: 12, color: 'var(--text-3)' }}>↑ {item.upvotes.toLocaleString()}</span>}
              <span className={pillClass(item.sentiment)} style={{ fontSize: 11 }}>
                {formatLabel(item.sentiment)}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.75 }}>
              {truncate(item.text, 240)}
            </p>
            {item.url && (
              <a href={item.url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none', marginTop: 6, display: 'inline-block', transition: 'color 0.15s' }}
                onMouseEnter={e => e.target.style.color = 'var(--cyan)'}
                onMouseLeave={e => e.target.style.color = 'var(--text-3)'}>
                View source →
              </a>
            )}
          </div>
        )) : (
          <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '32px 0' }}>
            No {active} signals available
          </p>
        )}
      </div>
    </div>
  )
}