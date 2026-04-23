import { useState as us2 } from 'react'
import { pillClass as pc2, timeAgo as ta, truncate as tr } from '../utils/format.js'

const TABS = [
  { key: 'news',    label: 'News'    },
  { key: 'reddit',  label: 'Reddit'  },
  { key: 'filings', label: 'Filings' },
]

const SOURCE_COLORS = { news: 'var(--blue)', reddit: '#f97316', filings: 'var(--green)' }

function EvidenceItem({ item, source }) {
  return (
    <div style={{ borderLeft: `3px solid ${SOURCE_COLORS[source] ?? 'var(--border)'}`, paddingLeft: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        {item.outlet && <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{item.outlet}</span>}
        {item.subreddit && <span style={{ fontSize: 12, fontWeight: 600, color: '#f97316' }}>r/{item.subreddit}</span>}
        {item.published_at && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{ta(item.published_at)}</span>}
        {item.upvotes > 0 && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>↑ {item.upvotes.toLocaleString()}</span>}
        <span className={pc2(item.sentiment)} style={{ fontSize: 11 }}>{item.sentiment.replace('_', ' ')}</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65 }}>{tr(item.text, 220)}</p>
      {item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer"
          style={{ fontSize: 11, color: 'var(--text-3)', textDecoration: 'none', marginTop: 6, display: 'inline-block' }}>
          View source →
        </a>
      )}
    </div>
  )
}

export function EvidencePanel({ evidence = {} }) {
  const [active, setActive] = us2('news')
  const items = evidence[active] ?? []

  return (
    <div className="card fade-up delay-6" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div className="label">Signal Evidence</div>
        <div style={{ display: 'flex', gap: 4 }}>
          {TABS.map(tab => {
            const count = evidence[tab.key]?.length ?? 0
            const isActive = active === tab.key
            return (
              <button key={tab.key} onClick={() => setActive(tab.key)} style={{
                padding: '5px 14px',
                fontSize: 12, fontWeight: isActive ? 600 : 400,
                background: isActive ? 'rgba(34,197,94,0.1)' : 'var(--bg-elevated)',
                border: `1px solid ${isActive ? 'rgba(34,197,94,0.4)' : 'var(--border)'}`,
                borderRadius: 20,
                color: isActive ? 'var(--green)' : 'var(--text-3)',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {tab.label}
                {count > 0 && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, opacity: 0.7 }}>{count}</span>}
              </button>
            )
          })}
        </div>
      </div>

      <div className="thin-scroll" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: 320, overflowY: 'auto', paddingRight: 4 }}>
        {items.length > 0
          ? items.map((item, i) => <EvidenceItem key={i} item={item} source={active} />)
          : <p style={{ fontSize: 13, color: 'var(--text-3)', textAlign: 'center', padding: '32px 0' }}>No {active} signals available</p>
        }
      </div>
    </div>
  )
}