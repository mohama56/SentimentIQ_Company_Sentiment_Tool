export const SCORE_ZONES = [
  { from: 0,  to: 25,  label: 'Very Negative', color: '#ff5000' },
  { from: 25, to: 45,  label: 'Negative',       color: '#ff8c42' },
  { from: 45, to: 60,  label: 'Neutral',         color: '#f5a623' },
  { from: 60, to: 75,  label: 'Positive',        color: '#00c805' },
  { from: 75, to: 100, label: 'Very Positive',   color: '#00c805' },
]

export function scoreZone(score) {
  return SCORE_ZONES.find(z => score >= z.from && score < z.to) ?? SCORE_ZONES[SCORE_ZONES.length - 1]
}
export function scoreColor(score) { return scoreZone(score).color }
export function scoreLabel(score) { return scoreZone(score).label }

export function pillClass(label = 'neutral') {
  const map = {
    very_positive: 'pill pill-green',
    positive:      'pill pill-green',
    neutral:       'pill pill-amber',
    negative:      'pill pill-red',
    very_negative: 'pill pill-red',
  }
  return map[label] ?? 'pill pill-gray'
}

export function formatLabel(label = '') {
  return label.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export function formatRevenue(bn) {
  if (bn == null) return '—'
  if (bn >= 1000) return `$${(bn / 1000).toFixed(2)}T`
  if (bn >= 1)    return `$${bn.toFixed(2)}B`
  return `$${(bn * 1000).toFixed(0)}M`
}

export function formatPct(value) {
  if (value == null) return '—'
  return `${(value * 100).toFixed(1)}%`
}

export function truncate(text = '', maxLen = 240) {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

export function shortDate(isoString) {
  if (!isoString) return ''
  try {
    return new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch { return isoString.slice(0, 10) }
}

export function timeAgo(isoString) {
  if (!isoString) return ''
  try {
    const h = (Date.now() - new Date(isoString).getTime()) / 3_600_000
    if (h < 1)  return 'just now'
    if (h < 24) return `${Math.floor(h)}h ago`
    return `${Math.floor(h / 24)}d ago`
  } catch { return '' }
}

export function eventPillClass(flag) {
  const pos = new Set(['earnings_beat', 'guidance_raised', 'acquisition_announced'])
  return { label: formatLabel(flag), className: pos.has(flag) ? 'pill pill-green' : 'pill pill-red' }
}

// "2025-12" → "Dec 2025"
export function formatQuarter(q = '') {
  if (!q || q.length < 7) return q
  try {
    const [year, month] = q.split('-')
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    const m = parseInt(month, 10)
    return `${months[m - 1] ?? month} ${year}`
  } catch { return q }
}

// Returns { open: bool, label: string }
export function marketStatus() {
  const now = new Date()
  const et  = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const day = et.getDay()   // 0=Sun, 6=Sat
  const h   = et.getHours()
  const m   = et.getMinutes()
  const mins = h * 60 + m

  // Weekend
  if (day === 0 || day === 6) return { open: false, label: 'Market closed' }
  // Pre-market 4:00–9:30
  if (mins >= 240 && mins < 570) return { open: true, label: 'Pre-market' }
  // Regular 9:30–16:00
  if (mins >= 570 && mins < 960) return { open: true, label: 'Market open' }
  // After-hours 16:00–20:00
  if (mins >= 960 && mins < 1200) return { open: true, label: 'After hours' }
  return { open: false, label: 'Market closed' }
}