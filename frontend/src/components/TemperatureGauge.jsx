import { useEffect, useState } from 'react'
import { scoreColor as sc2, scoreLabel as sl, SCORE_ZONES as SZ } from '../utils/format.js'

const SOURCES = [
  { key: 'news',      label: 'News',      weight: '35%' },
  { key: 'reddit',    label: 'Reddit',    weight: '25%' },
  { key: 'filings',   label: 'Filings',   weight: '15%' },
  { key: 'financial', label: 'Financial', weight: '15%' },
  { key: 'momentum',  label: 'Momentum',  weight: '10%' },
]

const TUBE_H = 196

export function TemperatureGauge({ score, confidence, sourceBreakdown }) {
  const [disp, setDisp] = useState(0)

  useEffect(() => {
    if (score == null) { setDisp(0); return }
    const t0 = setTimeout(() => {
      const start = Date.now(), dur = 900
      const frame = () => {
        const t = Math.min((Date.now() - start) / dur, 1)
        setDisp((score) * (1 - Math.pow(1 - t, 3)))
        if (t < 1) requestAnimationFrame(frame)
      }
      requestAnimationFrame(frame)
    }, 80)
    return () => clearTimeout(t0)
  }, [score])

  const color = sc2(score ?? 0)
  const label = sl(score ?? 0)

  return (
    <div className="card fade-up delay-1" style={{ padding: '20px 24px' }}>
      <div className="label" style={{ marginBottom: 16 }}>Temperature Score</div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Thermometer */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 42, fontWeight: 700, color, lineHeight: 1, letterSpacing: '-0.03em' }}>
              {Math.round(disp)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color, marginTop: 4 }}>{label}</div>
          </div>

          <div style={{ position: 'relative', width: 42, height: TUBE_H + 36 }}>
            <div style={{
              position: 'absolute', left: '50%', transform: 'translateX(-50%)',
              top: 0, width: 18, height: TUBE_H,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '9px 9px 0 0',
              overflow: 'hidden',
            }}>
              {SZ.map(z => (
                <div key={z.label} style={{
                  position: 'absolute',
                  bottom: z.from + '%',
                  height: (z.to - z.from) + '%',
                  width: '100%',
                  background: z.color,
                  opacity: 0.15,
                }}/>
              ))}
              <div style={{
                position: 'absolute', bottom: 0, width: '100%',
                height: disp.toFixed(1) + '%',
                background: `linear-gradient(to top, ${color}dd, ${color})`,
                transition: 'height 0.9s cubic-bezier(0.4,0,0.2,1)',
                boxShadow: '0 0 10px ' + color + '50',
              }}/>
            </div>

            {[0, 25, 50, 75, 100].map(tick => (
              <div key={tick} style={{
                position: 'absolute',
                top: TUBE_H - (tick / 100) * TUBE_H,
                left: '50%',
                transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{ width: 5, height: 1, background: 'var(--border-hi)', marginLeft: 13 }}/>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--text-3)', marginLeft: 3 }}>
                  {tick}
                </span>
              </div>
            ))}

            {score != null && (
              <div style={{
                position: 'absolute',
                top: TUBE_H - (disp / 100) * TUBE_H,
                left: '50%',
                transform: 'translateY(-50%)',
                transition: 'top 0.9s cubic-bezier(0.4,0,0.2,1)',
                display: 'flex', alignItems: 'center',
                pointerEvents: 'none',
              }}>
                <div style={{
                  width: 0, height: 0,
                  borderTop: '5px solid transparent',
                  borderBottom: '5px solid transparent',
                  borderRight: '7px solid ' + color,
                  marginLeft: 19,
                  filter: 'drop-shadow(0 0 3px ' + color + ')',
                }}/>
              </div>
            )}

            <div style={{
              position: 'absolute', bottom: 0, left: '50%',
              transform: 'translateX(-50%)',
              width: 32, height: 32, borderRadius: '50%',
              background: color,
              boxShadow: '0 0 14px ' + color + '80',
              transition: 'background 0.4s',
            }}/>
          </div>
        </div>

        {/* Right panel */}
        <div style={{ flex: 1, paddingTop: 4, display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 16 }}>
            <div className="label" style={{ marginBottom: 10 }}>Score Zones</div>
            {[...SZ].reverse().map(z => {
              const isActive = score != null && score >= z.from && score < z.to
              return (
                <div key={z.label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: z.color, opacity: isActive ? 1 : 0.35, flexShrink: 0 }}/>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--text-3)', width: 40 }}>
                    {z.from}–{z.to}
                  </span>
                  <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, color: isActive ? z.color : 'var(--text-3)' }}>
                    {z.label}
                  </span>
                  {isActive && <div style={{ width: 5, height: 5, borderRadius: '50%', background: z.color, marginLeft: 'auto', flexShrink: 0, boxShadow: '0 0 4px ' + z.color }}/>}
                </div>
              )
            })}
          </div>

          <div className="divider" style={{ marginBottom: 14 }}/>

          {confidence != null && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: 'var(--text-3)' }}>Confidence</span>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>
                  {(confidence * 100).toFixed(0)}%
                </span>
              </div>
              <div style={{ height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div className="bar-fill" style={{ width: (confidence * 100).toFixed(0) + '%', background: 'var(--green)' }}/>
              </div>
            </div>
          )}

          <div className="divider" style={{ marginBottom: 14 }}/>

          <div className="label" style={{ marginBottom: 10 }}>Source Weights</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SOURCES.map(({ key, label: lbl, weight }) => {
              const val = sourceBreakdown ? sourceBreakdown[key] : null
              if (val == null) return null
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-2)', width: 60, flexShrink: 0 }}>{lbl}</span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-3)', width: 26, flexShrink: 0 }}>{weight}</span>
                  <div style={{ flex: 1, height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden', border: '1px solid var(--border)' }}>
                    <div className="bar-fill" style={{ width: val + '%', background: sc2(val) }}/>
                  </div>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: 'var(--text)', width: 22, textAlign: 'right' }}>
                    {Math.round(val)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}