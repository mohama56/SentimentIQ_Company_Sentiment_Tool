import { scoreColor, scoreZone, pillClass as pc, formatLabel as fl, eventPillClass, SCORE_ZONES } from '../utils/format.js'

export function MetricSummaryRow({ data }) {
  if (!data) return null
  const { temperature_score, sentiment_label, confidence_score, signal_count, event_flags = [], event_adjustment } = data
  const color = scoreColor(temperature_score)
  const zone  = scoreZone(temperature_score)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>

      <div className="card fade-up delay-1" style={{ padding: '18px 20px' }}>
        <div className="label" style={{ marginBottom: 10 }}>Temperature Score</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 38, fontWeight: 700, color, lineHeight: 1, letterSpacing: '-0.03em' }}>
            {temperature_score?.toFixed(1)}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>/100</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 10px',
            background: zone.color + '15',
            border: `1px solid ${zone.color}40`,
            borderRadius: 20,
          }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: zone.color }}/>
            <span style={{ fontSize: 10, fontWeight: 700, color: zone.color }}>{zone.label}</span>
          </div>
          {confidence_score != null && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {(confidence_score * 100).toFixed(0)}% confidence
            </span>
          )}
        </div>
      </div>

      <div className="card fade-up delay-2" style={{ padding: '18px 20px' }}>
        <div className="label" style={{ marginBottom: 10 }}>Market Sentiment</div>
        <div style={{ marginTop: 4 }}>
          <span className={pc(sentiment_label)} style={{ fontSize: 13 }}>{fl(sentiment_label)}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 10 }}>
          Based on {signal_count} deduplicated signals
        </div>
      </div>

      <div className="card fade-up delay-3" style={{ padding: '18px 20px' }}>
        <div className="label" style={{ marginBottom: 10 }}>Signal Volume</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 38, fontWeight: 700, color: 'var(--text)', lineHeight: 1, letterSpacing: '-0.03em' }}>
          {signal_count}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8 }}>After deduplication</div>
      </div>

      <div className="card fade-up delay-4" style={{ padding: '18px 20px' }}>
        <div className="label" style={{ marginBottom: 10 }}>Event Detection</div>
        {event_flags.length > 0 ? (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
              {event_flags.slice(0, 2).map(f => {
                const { label, className } = eventPillClass(f)
                return <span key={f} className={className} style={{ fontSize: 10 }}>{label}</span>
              })}
            </div>
            {event_adjustment != null && (
              <div style={{ fontSize: 12, fontWeight: 600, marginTop: 8, color: event_adjustment >= 0 ? 'var(--up)' : 'var(--down)' }}>
                {event_adjustment >= 0 ? '+' : ''}{event_adjustment} pts adjustment
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>No events detected</div>
        )}
      </div>
    </div>
  )
}