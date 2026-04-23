import { shortDate, pillClass, formatLabel } from '../utils/format.js'

export function CompanyHeader({ data, onRefresh, loading }) {
  if (!data) return null
  const { company, ticker, computed_at, signal_count, sentiment_label } = data

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 0', marginBottom: 4,
      borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          {company}
        </h2>
        <span style={{
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: 11, fontWeight: 600,
          padding: '3px 10px',
          background: 'rgba(34,197,94,0.1)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: 4,
          color: 'var(--green)',
        }}>{ticker}</span>
        <span className={pillClass(sentiment_label)}>{formatLabel(sentiment_label)}</span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {computed_at && new Date(computed_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          {computed_at && ' · ' + shortDate(computed_at)}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{signal_count} signals</span>
      </div>

      <button
        onClick={onRefresh}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '7px 16px',
          fontSize: 12, fontWeight: 500,
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          background: 'var(--bg-elevated)',
          color: 'var(--text-2)',
          opacity: loading ? 0.5 : 1,
        }}
        onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.color = 'var(--green)' }}}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)' }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }}>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          <path d="M4 12a8 8 0 018-8v0a8 8 0 018 8" strokeLinecap="round"/>
          <path d="M20 12a8 8 0 01-8 8v0a8 8 0 01-8-8" strokeLinecap="round"/>
        </svg>
        Refresh
      </button>
    </div>
  )
}