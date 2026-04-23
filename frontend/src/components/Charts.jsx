import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts'
import { shortDate, scoreColor, scoreLabel } from '../utils/format.js'

function ChartTT({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const val = payload[0].value
  return (
    <div style={{
      background: 'rgba(10,17,40,0.95)',
      border: '1px solid rgba(99,126,255,0.3)',
      borderRadius: 10,
      padding: '10px 16px',
      backdropFilter: 'blur(20px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
    }}>
      <div style={{ fontSize: 11, color: 'rgba(139,154,200,0.7)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 22, fontWeight: 700, color: scoreColor(val) }}>
        {val}<span style={{ fontSize: 12, color: 'rgba(139,154,200,0.5)', fontWeight: 400 }}>/100</span>
      </div>
      <div style={{ fontSize: 11, color: scoreColor(val), marginTop: 2, fontWeight: 600 }}>
        {scoreLabel(val)}
      </div>
    </div>
  )
}

export function SentimentTrendChart({ history = [] }) {
  const data = history.map(h => ({ date: shortDate(h.date), score: Math.round(h.score ?? 0) }))

  if (data.length < 1) return (
    <div className="card fade-up delay-2" style={{ padding: '24px', display: 'flex', flexDirection: 'column', minHeight: 260 }}>
      <div className="label" style={{ marginBottom: 16 }}>Sentiment Trend</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: 'rgba(99,126,255,0.08)',
          border: '1px solid rgba(99,126,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(99,126,255,0.6)" strokeWidth="1.5">
            <path d="M3 3v18h18" strokeLinecap="round"/>
            <path d="M7 16l4-4 4 4 5-5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>No trend data yet</p>
          <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.7 }}>
            History saves automatically each run.<br/>Run again tomorrow to start your trend.
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="card fade-up delay-2" style={{ padding: '24px', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="label">Sentiment Trend</div>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 500 }}>
          {data.length} day{data.length !== 1 ? 's' : ''} of history
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#637eff" stopOpacity={0.4}/>
                <stop offset="50%"  stopColor="#06d6e0" stopOpacity={0.15}/>
                <stop offset="100%" stopColor="#00f5a0" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,126,255,0.08)" vertical={false}/>
            <XAxis dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--text-3)', fontFamily: 'Space Mono' }}
              axisLine={false} tickLine={false}/>
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]}
              tick={{ fontSize: 11, fill: 'var(--text-3)', fontFamily: 'Space Mono' }}
              axisLine={false} tickLine={false}/>
            <Tooltip content={<ChartTT />}/>
            <ReferenceLine y={50} stroke="rgba(99,126,255,0.2)" strokeDasharray="4 3"
              label={{ value: 'Neutral', position: 'insideTopRight', fontSize: 10, fill: 'var(--text-3)' }}/>
            <Area type="monotone" dataKey="score"
              stroke="url(#trendStroke)"
              strokeWidth={3}
              fill="url(#trendGrad)"
              dot={{ r: 5, fill: '#06d6e0', strokeWidth: 2, stroke: 'rgba(10,17,40,0.95)' }}
              activeDot={{ r: 7, fill: '#00f5a0', strokeWidth: 2, stroke: 'rgba(10,17,40,0.95)' }}/>
            <defs>
              <linearGradient id="trendStroke" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#637eff"/>
                <stop offset="50%"  stopColor="#06d6e0"/>
                <stop offset="100%" stopColor="#00f5a0"/>
              </linearGradient>
            </defs>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function BarTT({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'rgba(10,17,40,0.95)', border: '1px solid rgba(99,126,255,0.3)',
      borderRadius: 8, padding: '8px 14px', backdropFilter: 'blur(20px)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontFamily: 'Space Mono, monospace', fontSize: 16, fontWeight: 700, color: scoreColor(payload[0].value) }}>
        {payload[0].value}/100
      </div>
    </div>
  )
}

export function SourceBreakdownChart({ sourceBreakdown }) {
  if (!sourceBreakdown) return null
  const sourceColors = {
    News:       '#06d6e0',
    Reddit:     '#ff7eb3',
    StockTwits: '#c77dff',
    Filings:    '#00f5a0',
    Financial:  '#ffb830',
    Momentum:   '#637eff',
  }
  const data = [
    { name: 'News',       score: sourceBreakdown.news },
    { name: 'Reddit',     score: sourceBreakdown.reddit },
    { name: 'StockTwits', score: sourceBreakdown.stocktwits },
    { name: 'Filings',    score: sourceBreakdown.filings },
    { name: 'Financial',  score: sourceBreakdown.financial },
    { name: 'Momentum',   score: sourceBreakdown.momentum },
  ].filter(d => d.score != null)

  return (
    <div className="card fade-up delay-2" style={{ padding: '20px 24px' }}>
      <div className="label" style={{ marginBottom: 16 }}>Source Score Breakdown</div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 16, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="rgba(99,126,255,0.08)"/>
          <XAxis type="number" domain={[0, 100]}
            tick={{ fontSize: 11, fill: 'var(--text-3)', fontFamily: 'Space Mono' }}
            axisLine={false} tickLine={false}/>
          <YAxis type="category" dataKey="name" width={76}
            tick={{ fontSize: 12, fill: 'var(--text-2)', fontFamily: 'Plus Jakarta Sans' }}
            axisLine={false} tickLine={false}/>
          <Tooltip content={<BarTT />} cursor={{ fill: 'rgba(99,126,255,0.05)' }}/>
          <ReferenceLine x={50} stroke="rgba(99,126,255,0.2)" strokeDasharray="4 3"/>
          <Bar dataKey="score" radius={[0, 8, 8, 0]} maxBarSize={16}>
            {data.map((e, i) => (
              <Cell key={i} fill={sourceColors[e.name] ?? '#637eff'} opacity={0.85}/>
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}