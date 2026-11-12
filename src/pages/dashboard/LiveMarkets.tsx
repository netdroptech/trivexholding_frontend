import { useState } from 'react'
import { TrendingUp, TrendingDown, Search, Star } from 'lucide-react'
import { useLiveMarkets, fmtPrice, fmtCompact, type CoinDef } from '@/hooks/useLiveMarkets'

const COINS: CoinDef[] = [
  { id: 'bitcoin',       binance: 'BTCUSDT',  name: 'Bitcoin',   symbol: 'BTC/USDT',  color: '#f59e0b' },
  { id: 'ethereum',      binance: 'ETHUSDT',  name: 'Ethereum',  symbol: 'ETH/USDT',  color: '#60a5fa' },
  { id: 'solana',        binance: 'SOLUSDT',  name: 'Solana',    symbol: 'SOL/USDT',  color: '#60a5fa' },
  { id: 'binancecoin',   binance: 'BNBUSDT',  name: 'BNB',       symbol: 'BNB/USDT',  color: '#fbbf24' },
  { id: 'ripple',        binance: 'XRPUSDT',  name: 'XRP',       symbol: 'XRP/USDT',  color: '#60a5fa' },
  { id: 'cardano',       binance: 'ADAUSDT',  name: 'Cardano',   symbol: 'ADA/USDT',  color: '#60a5fa' },
  { id: 'dogecoin',      binance: 'DOGEUSDT', name: 'Dogecoin',  symbol: 'DOGE/USDT', color: '#fde68a' },
  { id: 'avalanche-2',   binance: 'AVAXUSDT', name: 'Avalanche', symbol: 'AVAX/USDT', color: '#fb923c' },
  { id: 'polkadot',      binance: 'DOTUSDT',  name: 'Polkadot',  symbol: 'DOT/USDT',  color: '#38bdf8' },
  { id: 'chainlink',     binance: 'LINKUSDT', name: 'Chainlink', symbol: 'LINK/USDT', color: '#38bdf8' },
]

const TABS = ['All', 'Favourites', 'Top Gainers', 'Top Losers']

/** Pure SVG sparkline — zero dependencies */
function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return <div style={{ width: 80, height: 32 }} />
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const W = 80, H = 32
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W
    const y = H - ((v - min) / range) * (H - 6) - 3
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: 'hsl(222 60% 5%)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0.875rem', ...style }}>{children}</div>
}

export function LiveMarkets() {
  const [tab, setTab] = useState('All')
  const [search, setSearch] = useState('')
  const [starred, setStarred] = useState<string[]>(['BTC/USDT', 'ETH/USDT'])
  const { coins, overview, status, updatedAt } = useLiveMarkets(COINS)

  const fg = overview.fearGreed
  const OVERVIEW = [
    { label: 'Total Market Cap', value: fmtCompact(overview.totalMarketCap),
      change: overview.marketCapChange == null ? '—' : `${overview.marketCapChange >= 0 ? '+' : ''}${overview.marketCapChange.toFixed(2)}%`,
      up: (overview.marketCapChange ?? 0) >= 0 },
    { label: 'BTC Dominance', value: overview.btcDominance == null ? '—' : `${overview.btcDominance.toFixed(1)}%`, change: 'of total cap', up: true },
    { label: '24h Volume', value: fmtCompact(overview.totalVolume), change: 'all markets', up: true },
    { label: 'Fear & Greed', value: fg ? `${fg.value} — ${fg.label}` : '—', change: fg ? (fg.value >= 50 ? 'Bullish' : 'Bearish') : '—', up: fg ? fg.value >= 50 : true },
  ]

  const filtered = coins.filter(m => {
    const ch = m.change ?? 0
    if (tab === 'Favourites' && !starred.includes(m.symbol)) return false
    if (tab === 'Top Gainers' && ch <= 0) return false
    if (tab === 'Top Losers'  && ch >= 0) return false
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.symbol.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto overflow-x-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'hsl(40 6% 95%)' }}>Live Markets</h1>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, letterSpacing: '0.05em',
              background: status === 'error' ? 'rgba(248,113,113,0.15)' : 'rgba(96,165,250,0.15)',
              color: status === 'error' ? '#f87171' : status === 'live' ? '#60a5fa' : 'hsl(240 5% 60%)' }}>
              {status === 'live' ? '● LIVE' : status === 'polling' ? '● DELAYED' : status === 'loading' ? '○ CONNECTING' : '● OFFLINE'}
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'hsl(240 5% 55%)' }}>
            Real-time cryptocurrency prices and market data
            {updatedAt && <span style={{ color: 'hsl(240 5% 42%)' }}> · updated {updatedAt.toLocaleTimeString()}</span>}
          </p>
        </div>
      </div>

      {/* Overview strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {OVERVIEW.map(o => (
          <Card key={o.label} style={{ padding: '1rem 1.25rem' }}>
            <p style={{ fontSize: 11, color: 'hsl(240 5% 50%)', marginBottom: 5 }}>{o.label}</p>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'hsl(40 6% 95%)', letterSpacing: '-0.01em', marginBottom: 3 }}>{o.value}</p>
            <span style={{ fontSize: 11, fontWeight: 600, color: o.up ? '#60a5fa' : '#f87171' }}>{o.change}</span>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex gap-1">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '0.3rem 0.75rem', borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', background: tab === t ? 'rgba(96,165,250,0.2)' : 'transparent', color: tab === t ? '#93c5fd' : 'hsl(240 5% 55%)', transition: 'all 0.15s' }}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.6rem', padding: '0.4rem 0.75rem', width: '100%', maxWidth: 220 }}>
            <Search size={13} style={{ color: 'hsl(240 5% 50%)', flexShrink: 0 }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search markets…" style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12, color: 'hsl(40 6% 88%)', width: '100%' }} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {['','#','Asset','Price','24h Change','Volume','Market Cap','7d',''].map((h, i) => (
                  <th key={i} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'hsl(240 5% 50%)', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={m.symbol} style={{ borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.75rem 0.5rem 0.75rem 1rem', width: 32 }}>
                    <button onClick={() => setStarred(s => s.includes(m.symbol) ? s.filter(x => x !== m.symbol) : [...s, m.symbol])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: starred.includes(m.symbol) ? '#f59e0b' : 'hsl(240 5% 40%)', padding: 0 }}>
                      <Star size={13} fill={starred.includes(m.symbol) ? '#f59e0b' : 'none'} />
                    </button>
                  </td>
                  <td style={{ padding: '0.75rem 0.5rem', color: 'hsl(240 5% 45%)', fontSize: 12 }}>{i + 1}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div className="flex items-center gap-2.5">
                      {m.image ? <img src={m.image} alt={m.name} width={30} height={30} style={{ borderRadius: '50%', flexShrink: 0 }} /> :
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${m.color}22`, border: `1px solid ${m.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: m.color, flexShrink: 0 }}>
                        {m.symbol.slice(0, 3)}
                      </div>}
                      <div>
                        <p style={{ fontWeight: 600, color: 'hsl(40 6% 92%)', fontSize: 13 }}>{m.name}</p>
                        <p style={{ fontSize: 11, color: 'hsl(240 5% 50%)' }}>{m.symbol}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: 700, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', transition: 'color 0.3s',
                    color: m.flash === 'up' ? '#60a5fa' : m.flash === 'down' ? '#f87171' : 'hsl(40 6% 92%)' }}>
                    {fmtPrice(m.price)}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    {m.change == null ? <span style={{ color: 'hsl(240 5% 50%)' }}>—</span> :
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: m.change >= 0 ? '#60a5fa' : '#f87171', fontWeight: 600 }}>
                      {m.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {m.change >= 0 ? '+' : ''}{m.change.toFixed(2)}%
                    </span>}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', color: 'hsl(240 5% 65%)' }}>{fmtCompact(m.volume)}</td>
                  <td style={{ padding: '0.75rem 1rem', color: 'hsl(240 5% 65%)' }}>{fmtCompact(m.marketCap)}</td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <Sparkline data={m.sparkline} color={m.sparkline.length > 1 && m.sparkline[m.sparkline.length - 1] >= m.sparkline[0] ? '#60a5fa' : '#f87171'} />
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <button style={{ padding: '0.3rem 0.75rem', borderRadius: '0.5rem', background: 'linear-gradient(135deg, #60a5fa 0%, #22d3ee 100%)', color: '#050505', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Trade
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
