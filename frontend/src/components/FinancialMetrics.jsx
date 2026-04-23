import { formatRevenue as fr, formatPct as fp } from '../utils/format.js'

export function FinancialMetrics({ financials }) {
  if (!financials?.quarters?.length) return null
  const { quarters, revenue_bn, eps, net_margin, revenue_growth, eps_trend, source } = financials
  const trendColor = eps_trend === 'increasing' ? 'var(--up)' : eps_trend === 'decreasing' ? 'var(--down)' : 'var(--text-3)'
  const maxRev = Math.max(...revenue_bn)

  return (
    <div className="card fade-up delay-5" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="label">Quarterly Financials</div>
        <div style={{ display: 'flex', gap: 14, fontSize: 12 }}>
          {revenue_growth != null && (
            <span style={{ color: revenue_growth >= 0 ? 'var(--up)' : 'var(--down)', fontWeight: 600 }}>
              {revenue_growth >= 0 ? '▲' : '▼'} {Math.abs(revenue_growth * 100).toFixed(1)}% YoY
            </span>
          )}
          <span style={{ color: trendColor, fontWeight: 600 }}>EPS {eps_trend}</span>
          {source && <span style={{ color: 'var(--text-3)' }}>{source}</span>}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr 72px 52px 56px', gap: 12, padding: '0 10px 6px', borderBottom: '1px solid var(--border)' }}>
          {['Quarter', '', 'Revenue', 'EPS', 'Margin'].map(h => (
            <span key={h} style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: h !== '' && h !== 'Quarter' ? 'right' : 'left' }}>
              {h}
            </span>
          ))}
        </div>

        {quarters.map((q, i) => {
          const isLatest = i === 0
          const barW = maxRev > 0 ? (revenue_bn[i] / maxRev) * 100 : 0
          return (
            <div key={q} style={{
              display: 'grid', gridTemplateColumns: '80px 1fr 72px 52px 56px',
              alignItems: 'center', gap: 12,
              padding: '9px 10px',
              background: isLatest ? 'rgba(34,197,94,0.06)' : 'transparent',
              borderRadius: 'var(--radius-sm)',
              border: isLatest ? '1px solid rgba(34,197,94,0.2)' : '1px solid transparent',
            }}>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: isLatest ? 700 : 400, color: isLatest ? 'var(--green)' : 'var(--text-2)' }}>
                {q}
              </span>
              <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ height: '100%', width: barW + '%', background: isLatest ? 'var(--green)' : 'var(--text-3)', borderRadius: 2, opacity: isLatest ? 1 : 0.5 }}/>
              </div>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: isLatest ? 'var(--text)' : 'var(--text-2)', textAlign: 'right' }}>
                {fr(revenue_bn[i])}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-2)', textAlign: 'right' }}>
                ${eps[i]?.toFixed(2)}
              </span>
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-3)', textAlign: 'right' }}>
                {fp(net_margin[i])}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}