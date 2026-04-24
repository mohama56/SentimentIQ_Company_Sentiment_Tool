import { useState, useRef, useEffect } from 'react'

const LOGO_TOKEN = import.meta.env.VITE_LOGO_DEV_TOKEN
export function logoUrl(domain) {
  return `https://img.logo.dev/${domain}?token=${LOGO_TOKEN}&size=40`
}

export const TICKERS = [
  // Mega-cap tech
  { ticker: 'AAPL',  name: 'Apple Inc.',              sector: 'Technology',     domain: 'apple.com'        },
  { ticker: 'MSFT',  name: 'Microsoft Corporation',   sector: 'Technology',     domain: 'microsoft.com'    },
  { ticker: 'GOOGL', name: 'Alphabet Inc.',            sector: 'Technology',     domain: 'google.com'       },
  { ticker: 'AMZN',  name: 'Amazon.com Inc.',          sector: 'Consumer',       domain: 'amazon.com'       },
  { ticker: 'META',  name: 'Meta Platforms Inc.',      sector: 'Technology',     domain: 'meta.com'         },
  { ticker: 'TSLA',  name: 'Tesla Inc.',               sector: 'Automotive',     domain: 'tesla.com'        },
  { ticker: 'NVDA',  name: 'NVIDIA Corporation',       sector: 'Semiconductors', domain: 'nvidia.com'       },
  { ticker: 'AMD',   name: 'Advanced Micro Devices',   sector: 'Semiconductors', domain: 'amd.com'          },
  { ticker: 'NFLX',  name: 'Netflix Inc.',             sector: 'Entertainment',  domain: 'netflix.com'      },
  // Finance
  { ticker: 'JPM',   name: 'JPMorgan Chase',           sector: 'Finance',        domain: 'jpmorganchase.com'},
  { ticker: 'GS',    name: 'Goldman Sachs',            sector: 'Finance',        domain: 'goldmansachs.com' },
  { ticker: 'MS',    name: 'Morgan Stanley',           sector: 'Finance',        domain: 'morganstanley.com'},
  { ticker: 'BAC',   name: 'Bank of America',          sector: 'Finance',        domain: 'bankofamerica.com'},
  { ticker: 'V',     name: 'Visa Inc.',                sector: 'Finance',        domain: 'visa.com'         },
  { ticker: 'MA',    name: 'Mastercard Inc.',          sector: 'Finance',        domain: 'mastercard.com'   },
  { ticker: 'COIN',  name: 'Coinbase Global',          sector: 'Finance',        domain: 'coinbase.com'     },
  { ticker: 'HOOD',  name: 'Robinhood Markets',        sector: 'Finance',        domain: 'robinhood.com'    },
  { ticker: 'PYPL',  name: 'PayPal Holdings',          sector: 'Finance',        domain: 'paypal.com'       },
  // Enterprise / Cloud
  { ticker: 'PLTR',  name: 'Palantir Technologies',    sector: 'Technology',     domain: 'palantir.com'     },
  { ticker: 'SNOW',  name: 'Snowflake Inc.',           sector: 'Technology',     domain: 'snowflake.com'    },
  { ticker: 'ADBE',  name: 'Adobe Inc.',               sector: 'Technology',     domain: 'adobe.com'        },
  { ticker: 'CRM',   name: 'Salesforce Inc.',          sector: 'Technology',     domain: 'salesforce.com'   },
  { ticker: 'NOW',   name: 'ServiceNow Inc.',          sector: 'Technology',     domain: 'servicenow.com'   },
  { ticker: 'DDOG',  name: 'Datadog Inc.',             sector: 'Technology',     domain: 'datadoghq.com'    },
  { ticker: 'CRWD',  name: 'CrowdStrike Holdings',     sector: 'Cybersecurity',  domain: 'crowdstrike.com'  },
  { ticker: 'ZS',    name: 'Zscaler Inc.',             sector: 'Cybersecurity',  domain: 'zscaler.com'      },
  { ticker: 'NET',   name: 'Cloudflare Inc.',          sector: 'Technology',     domain: 'cloudflare.com'   },
  { ticker: 'MDB',   name: 'MongoDB Inc.',             sector: 'Technology',     domain: 'mongodb.com'      },
  // AI / New tech
  { ticker: 'CRWV',  name: 'CoreWeave Inc.',           sector: 'AI/Cloud',       domain: 'coreweave.com'    },
  { ticker: 'SOUN',  name: 'SoundHound AI',            sector: 'AI',             domain: 'soundhound.com'   },
  { ticker: 'AI',    name: 'C3.ai Inc.',               sector: 'AI',             domain: 'c3.ai'            },
  { ticker: 'BBAI',  name: 'BigBear.ai Holdings',      sector: 'AI',             domain: 'bigbear.ai'       },
  { ticker: 'IONQ',  name: 'IonQ Inc.',                sector: 'Quantum',        domain: 'ionq.com'         },
  // Semiconductors
  { ticker: 'INTC',  name: 'Intel Corporation',        sector: 'Semiconductors', domain: 'intel.com'        },
  { ticker: 'AVGO',  name: 'Broadcom Inc.',            sector: 'Semiconductors', domain: 'broadcom.com'     },
  { ticker: 'ARM',   name: 'Arm Holdings',             sector: 'Semiconductors', domain: 'arm.com'          },
  { ticker: 'QCOM',  name: 'Qualcomm Inc.',            sector: 'Semiconductors', domain: 'qualcomm.com'     },
  { ticker: 'MU',    name: 'Micron Technology',        sector: 'Semiconductors', domain: 'micron.com'       },
  { ticker: 'AMAT',  name: 'Applied Materials',        sector: 'Semiconductors', domain: 'appliedmaterials.com'},
  { ticker: 'SMCI',  name: 'Super Micro Computer',     sector: 'Technology',     domain: 'supermicro.com'   },
  // Consumer / Retail
  { ticker: 'WMT',   name: 'Walmart Inc.',             sector: 'Retail',         domain: 'walmart.com'      },
  { ticker: 'COST',  name: 'Costco Wholesale',         sector: 'Retail',         domain: 'costco.com'       },
  { ticker: 'TGT',   name: 'Target Corporation',       sector: 'Retail',         domain: 'target.com'       },
  { ticker: 'NKE',   name: 'Nike Inc.',                sector: 'Consumer',       domain: 'nike.com'         },
  { ticker: 'SBUX',  name: 'Starbucks Corporation',    sector: 'Consumer',       domain: 'starbucks.com'    },
  { ticker: 'MCD',   name: "McDonald's Corporation",   sector: 'Consumer',       domain: 'mcdonalds.com'    },
  // Healthcare
  { ticker: 'JNJ',   name: 'Johnson & Johnson',        sector: 'Healthcare',     domain: 'jnj.com'          },
  { ticker: 'PFE',   name: 'Pfizer Inc.',              sector: 'Healthcare',     domain: 'pfizer.com'       },
  { ticker: 'LLY',   name: 'Eli Lilly',                sector: 'Healthcare',     domain: 'lilly.com'        },
  { ticker: 'ABBV',  name: 'AbbVie Inc.',              sector: 'Healthcare',     domain: 'abbvie.com'       },
  { ticker: 'UNH',   name: 'UnitedHealth Group',       sector: 'Healthcare',     domain: 'unitedhealthgroup.com'},
  // Energy / Industrial
  { ticker: 'XOM',   name: 'Exxon Mobil',              sector: 'Energy',         domain: 'exxonmobil.com'   },
  { ticker: 'CVX',   name: 'Chevron Corporation',      sector: 'Energy',         domain: 'chevron.com'      },
  { ticker: 'BA',    name: 'Boeing Company',           sector: 'Aerospace',      domain: 'boeing.com'       },
  { ticker: 'RTX',   name: 'RTX Corporation',          sector: 'Aerospace',      domain: 'rtx.com'          },
  // Transport / Mobility
  { ticker: 'UBER',  name: 'Uber Technologies',        sector: 'Transportation', domain: 'uber.com'         },
  { ticker: 'LYFT',  name: 'Lyft Inc.',                sector: 'Transportation', domain: 'lyft.com'         },
  { ticker: 'RIVN',  name: 'Rivian Automotive',        sector: 'Automotive',     domain: 'rivian.com'       },
  { ticker: 'LCID',  name: 'Lucid Group',              sector: 'Automotive',     domain: 'lucidmotors.com'  },
  // E-Commerce / Fintech
  { ticker: 'SHOP',  name: 'Shopify Inc.',             sector: 'E-Commerce',     domain: 'shopify.com'      },
  { ticker: 'MELI',  name: 'MercadoLibre Inc.',        sector: 'E-Commerce',     domain: 'mercadolibre.com' },
  { ticker: 'AFRM',  name: 'Affirm Holdings',          sector: 'Fintech',        domain: 'affirm.com'       },
  { ticker: 'SQ',    name: 'Block Inc.',               sector: 'Fintech',        domain: 'block.xyz'        },
  // Media / Entertainment
  { ticker: 'DIS',   name: 'Walt Disney Company',      sector: 'Entertainment',  domain: 'disney.com'       },
  { ticker: 'SPOT',  name: 'Spotify Technology',       sector: 'Entertainment',  domain: 'spotify.com'      },
  { ticker: 'RBLX',  name: 'Roblox Corporation',       sector: 'Gaming',         domain: 'roblox.com'       },
  { ticker: 'TTWO',  name: 'Take-Two Interactive',     sector: 'Gaming',         domain: 'take2games.com'   },
]

export function domainForTicker(ticker) {
  const found = TICKERS.find(t => t.ticker === ticker?.toUpperCase())
  return found?.domain ?? null
}

const QUICK = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'META', 'AMZN']

export default function SearchBar({ onSearch, loading }) {
  const [val, setVal]   = useState('')
  const [open, setOpen] = useState(false)
  const [hi, setHi]     = useState(-1)
  const ref = useRef(null)

  const results = val.length > 0
    ? TICKERS.filter(t =>
        t.ticker.toLowerCase().startsWith(val.toLowerCase()) ||
        t.name.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 6)
    : []

  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  function select(t) { setVal(t.ticker); setOpen(false); onSearch(t.ticker) }

  function submit(e) {
    e.preventDefault()
    const v = val.trim().toUpperCase()
    if (!v) return
    if (hi >= 0 && results[hi]) { select(results[hi]); return }
    setOpen(false)
    onSearch(v)
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, -1)) }
    else if (e.key === 'Escape') setOpen(false)
  }

  const showDrop = open && results.length > 0 && !loading

  return (
    <div style={{ marginBottom: 24 }}>
      <form onSubmit={submit} style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
        <div ref={ref} style={{ flex: 1, position: 'relative' }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'rgba(13,21,53,0.8)',
            border: `1px solid ${open ? 'rgba(99,126,255,0.5)' : 'var(--border)'}`,
            borderRadius: showDrop ? '14px 14px 0 0' : 14,
            backdropFilter: 'blur(20px)',
            transition: 'all 0.2s',
            boxShadow: open ? '0 0 0 3px rgba(99,126,255,0.1), 0 0 30px rgba(99,126,255,0.15)' : 'none',
          }}>
            <svg style={{ marginLeft: 18, flexShrink: 0, color: open ? 'var(--blue-light)' : 'var(--text-3)', transition: 'color 0.2s' }}
              width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={val}
              onChange={e => { setVal(e.target.value.toUpperCase()); setOpen(true); setHi(-1) }}
              onFocus={() => setOpen(true)}
              onKeyDown={onKey}
              placeholder="Search by ticker or company — TSLA, Apple, NVIDIA..."
              disabled={loading}
              style={{
                flex: 1, padding: '14px 14px',
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: 14, fontWeight: 600,
                color: 'var(--text)',
                fontFamily: 'Space Mono, monospace',
                letterSpacing: '0.03em',
              }}
            />
            {val && !loading && (
              <button type="button" onClick={() => { setVal(''); setOpen(false) }}
                style={{ padding: '0 18px', background: 'none', border: 'none', color: 'var(--text-3)', fontSize: 20, cursor: 'pointer' }}>
                ×
              </button>
            )}
          </div>

          {/* Dropdown */}
          {showDrop && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: 'rgba(10,17,40,0.97)',
              border: '1px solid rgba(99,126,255,0.4)',
              borderTop: '1px solid var(--border)',
              borderRadius: '0 0 14px 14px',
              overflow: 'hidden',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.7)',
            }}>
              {results.map((t, i) => (
                <div key={t.ticker} onMouseDown={() => select(t)} onMouseEnter={() => setHi(i)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 20px', cursor: 'pointer',
                    background: i === hi ? 'rgba(99,126,255,0.1)' : 'transparent',
                    borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.1s',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img
                      src={logoUrl(t.domain)}
                      alt={t.name}
                      width={24} height={24}
                      style={{ borderRadius: 6, objectFit: 'contain', background: 'rgba(255,255,255,0.06)' }}
                      onError={e => { e.currentTarget.style.display = 'none' }}
                    />
                    <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 13, fontWeight: 700, color: 'var(--cyan)', width: 56 }}>
                      {t.ticker}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text)' }}>{t.name}</span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', padding: '2px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 20, border: '1px solid var(--border)' }}>
                    {t.sector}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={loading || !val.trim()} className="btn-primary"
          style={{ padding: '0 32px', opacity: !val.trim() && !loading ? 0.4 : 1 }}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.7s linear infinite' }}>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25"/>
                <path d="M12 3a9 9 0 019 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
              Analysing...
            </span>
          ) : 'Analyze'}
        </button>
      </form>

      {/* Quick picks */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontWeight: 600 }}>Quick:</span>
        {QUICK.map(t => (
          <button key={t} onClick={() => { setVal(t); onSearch(t) }} disabled={loading} style={{
            padding: '4px 14px',
            fontSize: 11, fontWeight: 700,
            fontFamily: 'Space Mono, monospace',
            border: '1px solid var(--border)',
            borderRadius: 8,
            background: 'transparent',
            color: 'var(--text-3)',
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--cyan)'; e.currentTarget.style.borderColor = 'var(--cyan)'; e.currentTarget.style.background = 'var(--cyan-soft)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'transparent' }}
          >{t}</button>
        ))}
      </div>
    </div>
  )
}