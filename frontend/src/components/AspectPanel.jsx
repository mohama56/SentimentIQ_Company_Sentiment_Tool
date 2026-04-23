import { scoreColor as sc3 } from '../utils/format.js'
import { eventPillClass as epc, formatLabel as fl2 } from '../utils/format.js'

const ASPECTS = [
  { key: 'earnings_profitability', label: 'Earnings & Profitability' },
  { key: 'product_innovation',     label: 'Product & Innovation'     },
  { key: 'leadership_governance',  label: 'Leadership & Governance'  },
  { key: 'macro_industry',         label: 'Macro & Industry'         },
  { key: 'legal_regulatory',       label: 'Legal & Regulatory'       },
]

export function AspectPanel({ aspects }) {
  if (!aspects) return null
  return (
    <div className="card fade-up delay-4" style={{ padding: '20px 24px' }}>
      <div className="label" style={{ marginBottom: 16 }}>Aspect Analysis</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {ASPECTS.map(({ key, label }) => {
          const pct = Math.round((aspects[key] ?? 0.5) * 100)
          const color = sc3(pct)
          return (
            <div key={key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>{label}</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color }}>
                  {pct}
                </span>
              </div>
              <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div className="bar-fill" style={{ width: pct + '%', background: color }}/>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ScoreExplanation({ explanation, eventFlags = [], eventAdjustment }) {
  return (
    <div className="card fade-up delay-4" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="label">Score Explanation</div>
      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.75 }}>{explanation || 'Analysis complete.'}</p>
      {eventFlags.length > 0 && (
        <div>
          <div className="label" style={{ marginBottom: 10 }}>Detected Events</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {eventFlags.map(flag => {
              const { label, className } = epc(flag)
              return <span key={flag} className={className}>{label}</span>
            })}
          </div>
          {eventAdjustment != null && (
            <div style={{ fontSize: 12, fontWeight: 600, marginTop: 10, color: eventAdjustment >= 0 ? 'var(--up)' : 'var(--down)' }}>
              Net adjustment: {eventAdjustment >= 0 ? '+' : ''}{eventAdjustment} pts
            </div>
          )}
        </div>
      )}
    </div>
  )
}