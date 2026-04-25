export function EmptyState() {
  const features = [
    { label: 'FinBERT + VADER', desc: 'Dual NLP ensemble for financial text', col: '#a5b4fc' },
    { label: 'BERTopic',        desc: 'Unsupervised topic clustering',          col: '#c77dff' },
    { label: 'SEC Edgar',       desc: 'Real quarterly financials + filings',    col: '#00f5a0' },
    { label: 'Reddit',          desc: 'Live posts and comments',                col: '#ff7eb3' },
    { label: 'Event Detection', desc: 'Earnings, layoffs, lawsuits flagged',    col: '#ffb830' },
    { label: 'Score History',   desc: 'Trend tracking per ticker over time',    col: '#06d6e0' },
  ]

  return (
    <div style={{ maxWidth: 640, margin: '60px auto', textAlign: 'center' }}>

      {/* Wordmark hero */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          fontSize: 42, fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1,
          marginBottom: 16,
        }}>
          <span style={{ color: '#e2e8f0' }}>Sentiment</span>
          <span style={{
            background: 'linear-gradient(90deg, #818cf8, #38bdf8)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>IQ</span>
        </div>
        {/* Accent line */}
        <div style={{
          height: 2, width: 80, borderRadius: 2, margin: '0 auto',
          background: 'linear-gradient(90deg, #6366f1, #38bdf8)',
          opacity: 0.7,
        }}/>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 10 }}>
        Company Sentiment Intelligence
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-3)', lineHeight: 1.9, marginBottom: 40, fontWeight: 400, maxWidth: 480, margin: '0 auto 40px' }}>
        Real-time NLP sentiment scoring from Reddit, news, SEC filings, and financial data.
        Search any US-listed company to begin.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, textAlign: 'left' }}>
        {features.map(f => (
          <div key={f.label} style={{
            padding: '16px 18px',
            background: 'rgba(13,21,53,0.7)',
            border: `1px solid ${f.col}20`,
            borderRadius: 14,
            backdropFilter: 'blur(20px)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = f.col + '40'; e.currentTarget.style.boxShadow = `0 0 20px ${f.col}15` }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = f.col + '20'; e.currentTarget.style.boxShadow = 'none' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: f.col, marginBottom: 5 }}>{f.label}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6 }}>{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}