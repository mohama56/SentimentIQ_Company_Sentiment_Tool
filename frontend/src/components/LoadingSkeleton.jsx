import { useEffect, useState } from 'react'

const STAGES = [
  'Fetching Reddit posts and comments...',
  'Pulling Google News articles...',
  'Querying Yahoo Finance news...',
  'Fetching StockTwits stream...',
  'Querying SEC EDGAR filings...',
  'Loading quarterly financials...',
  'Deduplicating signal corpus...',
  'Running FinBERT inference...',
  'Running VADER sentiment analysis...',
  'Classifying aspect sentiment via DeBERTa...',
  'Detecting market events...',
  'Extracting BERTopic clusters...',
  'Computing temperature score...',
]

function Sk({ h = 12, w = '100%', r = 10, mb = 0 }) {
  return <div className="skeleton" style={{ height: h, width: w, borderRadius: r, marginBottom: mb }}/>
}

export function LoadingSkeleton({ ticker }) {
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStage(s => Math.min(s + 1, STAGES.length - 1)), 2000)
    return () => clearInterval(id)
  }, [])

  const pct = Math.round(((stage + 1) / STAGES.length) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div className="card" style={{ padding: '24px 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 5 }}>
              Analysing{' '}
              <span style={{
                background: 'linear-gradient(135deg, var(--blue-light), var(--cyan))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontFamily: 'Space Mono, monospace',
              }}>{ticker}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{STAGES[stage]}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, opacity: 0.7 }}>
              Running multi-model NLP pipeline — this may take 30–90 seconds. Please be patient.
            </div>
          </div>
          <div style={{
            fontFamily: 'Space Mono, monospace',
            fontSize: 28, fontWeight: 700,
            background: 'linear-gradient(135deg, var(--blue-light), var(--cyan))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>{pct}%</div>
        </div>

        <div style={{ height: 6, background: 'rgba(99,126,255,0.1)', borderRadius: 3, overflow: 'hidden', marginBottom: 12, border: '1px solid var(--border)' }}>
          <div style={{
            height: '100%',
            width: pct + '%',
            background: 'linear-gradient(90deg, var(--blue), var(--cyan), var(--green))',
            borderRadius: 3,
            transition: 'width 0.4s ease',
            boxShadow: '0 0 12px rgba(6,214,224,0.5)',
          }}/>
        </div>

        <div style={{ display: 'flex', gap: 3 }}>
          {STAGES.map((_, i) => (
            <div key={i} style={{
              flex: 1, height: 3, borderRadius: 2,
              background: i <= stage
                ? (i < 4 ? 'var(--blue)' : i < 8 ? 'var(--cyan)' : 'var(--green)')
                : 'var(--border)',
              transition: 'background 0.3s',
            }}/>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 18 }}>
        <div className="card" style={{ padding: 24 }}>
          <Sk h={10} w={120} mb={20}/>
          <Sk h={180} r={100} mb={20}/>
          <Sk h={4} mb={16}/>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <Sk h={10} w={55}/>
              <div style={{ flex: 1 }}><Sk h={4} r={4}/></div>
              <Sk h={10} w={20}/>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card" style={{ padding: 20 }}>
                <Sk h={10} w={80} mb={14}/>
                <Sk h={32} w={70} mb={8}/>
                <Sk h={10} w={100}/>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding: 24 }}>
            <Sk h={10} w={120} mb={20}/>
            <Sk h={180}/>
          </div>
        </div>
      </div>

      {[...Array(4)].map((_, i) => (
        <div key={i} className="card" style={{ padding: 20 }}>
          <Sk h={10} w={140} mb={16}/>
          <Sk h={100}/>
        </div>
      ))}
    </div>
  )
}