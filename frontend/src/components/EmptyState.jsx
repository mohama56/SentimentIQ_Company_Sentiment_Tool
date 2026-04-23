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
      {/* Animated orb */}
      <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 32px' }}>
        <div style={{
          position: 'absolute', inset: 0,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, rgba(99,126,255,0.3), rgba(6,214,224,0.3))',
          animation: 'pulse-glow 3s infinite',
        }}/>
        <div style={{
          position: 'absolute', inset: 8,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--blue), var(--cyan))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 30px rgba(99,126,255,0.5)',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
            <path d="M3 3v18h18" strokeLinecap="round"/>
            <path d="M7 16l4-4 4 4 5-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>

      <h2 style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', marginBottom: 12 }}>
        Company Sentiment Intelligence
      </h2>
      <p style={{ fontSize: 15, color: 'var(--text-3)', lineHeight: 1.8, marginBottom: 40, fontWeight: 400 }}>
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