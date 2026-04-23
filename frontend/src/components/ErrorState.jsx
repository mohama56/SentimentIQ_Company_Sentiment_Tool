export function ErrorState({ error, ticker, onRetry }) {
  const isNotFound = error?.toLowerCase().includes('not found')
  const isTimeout  = error?.toLowerCase().includes('timeout')

  return (
    <div style={{ maxWidth: 480, margin: '80px auto' }}>
      <div className="card" style={{ padding: 36, textAlign: 'center' }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'rgba(255,77,109,0.1)',
          border: '1px solid rgba(255,77,109,0.3)',
          margin: '0 auto 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 20px rgba(255,77,109,0.2)',
        }}>
          <span style={{ fontSize: 24 }}>⚠</span>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 10 }}>
          {isNotFound ? `No data found for "${ticker}"` : isTimeout ? 'Request timed out' : 'Analysis failed'}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 20 }}>
          {isNotFound
            ? 'No signals found. Try a major US-listed ticker — AAPL, TSLA, NVDA, MSFT.'
            : isTimeout
            ? 'The pipeline timed out. On first run models need to download — wait 30s and retry.'
            : error || 'Check the backend terminal for details.'}
        </p>
        {error && (
          <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 11, color: 'var(--text-3)', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, textAlign: 'left' }}>
            {error}
          </div>
        )}
        <button onClick={onRetry} className="btn-primary" style={{ padding: '12px 32px', fontSize: 14 }}>
          Try again
        </button>
      </div>
    </div>
  )
}