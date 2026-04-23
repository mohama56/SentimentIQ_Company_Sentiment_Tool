export function TopicClusters({ topics = [] }) {
  if (!topics.length) return null
  const palette = [
    { bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.3)',  text: '#22c55e' },
    { bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.3)', text: '#3b82f6' },
    { bg: 'rgba(168,85,247,0.1)',  border: 'rgba(168,85,247,0.3)', text: '#a855f7' },
    { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.3)', text: '#f59e0b' },
    { bg: 'rgba(236,72,153,0.1)',  border: 'rgba(236,72,153,0.3)', text: '#ec4899' },
    { bg: 'rgba(20,184,166,0.1)',  border: 'rgba(20,184,166,0.3)', text: '#14b8a6' },
    { bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.3)', text: '#f97316' },
  ]
  return (
    <div className="card fade-up delay-5" style={{ padding: '20px 24px' }}>
      <div className="label" style={{ marginBottom: 14 }}>Topic Clusters</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {topics.map((topic, i) => {
          const c = palette[i % palette.length]
          return (
            <span key={topic} style={{
              padding: '5px 14px',
              fontSize: 12, fontWeight: i === 0 ? 600 : 400,
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: 20, color: c.text,
            }}>{topic}</span>
          )
        })}
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 12 }}>
        Extracted via BERTopic · ranked by signal frequency
      </p>
    </div>
  )
}