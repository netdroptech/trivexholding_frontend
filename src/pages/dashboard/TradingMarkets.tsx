import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, TrendingDown, ChevronRight, Search, Star, BarChart2, Wifi, WifiOff } from 'lucide-react'

import { useLiveMarkets } from '@/hooks/useLiveMarkets'
import { TRADE_MARKETS } from '@/lib/markets'

// ── Formatters ────────────────────────────────────────────────────────────
function fmtPrice(p: number | null) {
  if (p == null) return '—'
  if (p >= 1000)  return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (p >= 10)    return p.toFixed(2)
  if (p >= 1)     return p.toFixed(4)
  return p.toFixed(4)
}

function fmtVolume(v: number) {
  if (!v) return '—'
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(3)}B`
  if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(3)}M`
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`
}

// ── Sub-components ────────────────────────────────────────────────────────
function CoinIcon({ symbol, color, image }: { symbol: string; color: string; image?: string }) {
  if (image) return <img src={image} alt={symbol} width={38} height={38} style={{ borderRadius: '50%', flexShrink: 0 }} />
  const letter = symbol.replace('USDT', '').charAt(0)
  return (
    <div style={{
      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${color}55 0%, ${color}22 100%)`,
      border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 800, color,
    }}>
      {letter}
    </div>
  )
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <div style={{ width: 80, height: 18 }} />
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * 80).toFixed(1)},${(16 - ((v - min) / range) * 14).toFixed(1)}`).join(' ')
  const up = data[data.length - 1] >= data[0]
  return (
    <svg width={80} height={18} viewBox="0 0 80 18" fill="none">
      <polyline
        points={pts}
        stroke={up ? '#60a5fa' : '#f87171'}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// ── Flash animation styles ─────────────────────────────────────────────────
const FLASH_CSS = `
@keyframes flashGreen { 0%,100%{background:transparent} 30%{background:rgba(96,165,250,0.12)} }
@keyframes flashRed   { 0%,100%{background:transparent} 30%{background:rgba(248,113,113,0.12)} }
.flash-green { animation: flashGreen 0.7s ease; }
.flash-red   { animation: flashRed   0.7s ease; }
`

// ── Main component ─────────────────────────────────────────────────────────
export function TradingMarkets() {
  const navigate = useNavigate()
  const { coins, status, updatedAt } = useLiveMarkets(TRADE_MARKETS)
  const online = status !== 'error'
  const [search, setSearch]       = useState('')
  const [watchlist, setWatchlist] = useState<string[]>(['BTCUSDT', 'ETHUSDT'])
  const [tab, setTab]             = useState<'all' | 'watchlist'>('all')
  const [activePair, setActivePair] = useState<string | null>(null)

  // Merge live data with static metadata for rendering
  const display = coins.map(c => ({
    ...c,
    symbol: c.binance,
    pair: c.symbol,
    change: c.change ?? 0,
    volume: c.volume ?? 0,
    hasData: c.price != null,
  }))

  const filtered = display.filter(p =>
    (tab === 'watchlist' ? watchlist.includes(p.symbol) : true) &&
    (search === '' ||
      p.symbol.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase()))
  )

  const withData  = display.filter(p => p.hasData)
  const topGainer = [...withData].sort((a, b) => b.change - a.change)[0]
  const topLoser  = [...withData].sort((a, b) => a.change - b.change)[0]
  const totalVol  = display.reduce((s, p) => s + p.volume, 0)


  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto overflow-x-hidden">
      <style>{FLASH_CSS}</style>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
              color: '#60a5fa', background: 'rgba(96,165,250,0.1)',
              padding: '3px 10px', borderRadius: 999,
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <span style={{
                width: 5, height: 5, borderRadius: '50%', background: '#60a5fa',
                animation: 'liveBlink 1.2s ease-in-out infinite', display: 'inline-block',
              }} />
              {status === 'live' ? 'LIVE PRICES' : status === 'loading' ? 'CONNECTING…' : 'PRICES (1-MIN DELAY)'}
            </span>
            {!online && (
              <span style={{
                fontSize: 11, fontWeight: 600, color: '#f87171',
                background: 'rgba(248,113,113,0.1)', padding: '3px 10px', borderRadius: 999,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                <WifiOff size={11} /> Price feed unavailable — retrying
              </span>
            )}
          </div>
          <h1 style={{
            fontSize: 26, fontWeight: 700, color: 'hsl(40 10% 96%)',
            letterSpacing: '-0.02em', lineHeight: 1.2,
          }}>Trade</h1>
          <p style={{ fontSize: 13, color: 'hsl(240 5% 55%)', marginTop: 4 }}>
            Binance spot markets — prices stream in real time.
          </p>
        </div>

      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Pairs',      value: `${display.length}`,  sub: 'Active markets',     color: '#93c5fd' },
          { label: 'Top Gainer',       value: topGainer ? topGainer.symbol.replace('USDT','') : '—',
            sub: topGainer ? `+${topGainer.change.toFixed(2)}% today` : '',   color: '#60a5fa' },
          { label: 'Top Loser',        value: topLoser ? topLoser.symbol.replace('USDT','') : '—',
            sub: topLoser ? `${topLoser.change.toFixed(2)}% today` : '',      color: '#f87171' },
          { label: '24h Total Volume', value: fmtVolume(totalVol),  sub: 'Across all pairs',   color: '#38bdf8' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: '16px 18px',
          }}>
            <p style={{ fontSize: 11, color: 'hsl(240 5% 50%)', fontWeight: 500, marginBottom: 5, letterSpacing: '0.04em' }}>
              {stat.label}
            </p>
            <p style={{ fontSize: 20, fontWeight: 700, color: stat.color, lineHeight: 1, letterSpacing: '-0.01em' }}>
              {stat.value}
            </p>
            <p style={{ fontSize: 11, color: 'hsl(240 5% 45%)', marginTop: 4 }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Last refresh + connection status ── */}
      {updatedAt && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 16, fontSize: 12, color: 'hsl(240 5% 45%)',
        }}>
          {online
            ? <Wifi size={12} style={{ color: '#60a5fa' }} />
            : <WifiOff size={12} style={{ color: '#f87171' }} />}
          {status === 'live' ? 'Streaming live from Binance' : 'Refreshing every 60s'} · last update {updatedAt.toLocaleTimeString()}
        </div>
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div style={{
          display: 'flex', gap: 4,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 10, padding: 4,
        }}>
          {(['all', 'watchlist'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 16px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                background: tab === t ? 'rgba(96,165,250,0.25)' : 'transparent',
                color: tab === t ? '#93c5fd' : 'hsl(240 5% 50%)',
              }}
            >
              {t === 'all' ? 'All Markets' : '⭐ Watchlist'}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{
            position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
            color: 'hsl(240 5% 45%)', pointerEvents: 'none',
          }} />
          <input
            type="text"
            placeholder="Search pair or coin name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', height: 38, paddingLeft: 32, paddingRight: 12,
              borderRadius: 10, fontSize: 13,
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'hsl(40 6% 95%)', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* ── Loading skeleton or cards ── */}
      {status === 'loading' && withData.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} style={{
              height: 200, borderRadius: 16,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.07)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(pair => {
            const up        = pair.change >= 0
            const isActive  = activePair === pair.symbol
            const isWatched = watchlist.includes(pair.symbol)
            const flashClass = pair.flash === 'up' ? 'flash-green' : pair.flash === 'down' ? 'flash-red' : ''

            return (
              <div
                key={pair.symbol}
                className={flashClass}
                onClick={() => setActivePair(isActive ? null : pair.symbol)}
                style={{
                  background: isActive ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.028)',
                  border: isActive
                    ? '1px solid rgba(96,165,250,0.45)'
                    : '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 16, padding: '18px 18px 0',
                  cursor: 'pointer', transition: 'all 0.18s',
                  position: 'relative', overflow: 'hidden',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'rgba(96,165,250,0.3)'
                    el.style.background  = 'rgba(255,255,255,0.045)'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'rgba(255,255,255,0.07)'
                    el.style.background  = 'rgba(255,255,255,0.028)'
                  }
                }}
              >
                {/* Color stripe top */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                  background: isActive ? `linear-gradient(90deg, ${pair.color}, transparent)` : 'transparent',
                  transition: 'background 0.2s',
                }} />

                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <CoinIcon symbol={pair.symbol} color={pair.color} image={pair.image} />
                    <div>
                      <p style={{ fontSize: 13.5, fontWeight: 700, color: 'hsl(40 10% 94%)', lineHeight: 1.2 }}>
                        {pair.symbol}
                      </p>
                      <p style={{ fontSize: 11, color: 'hsl(240 5% 50%)', lineHeight: 1 }}>{pair.pair}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setWatchlist(prev =>
                          prev.includes(pair.symbol)
                            ? prev.filter(x => x !== pair.symbol)
                            : [...prev, pair.symbol]
                        )
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
                    >
                      <Star size={13} style={{
                        fill: isWatched ? '#f59e0b' : 'none',
                        color: isWatched ? '#f59e0b' : 'hsl(240 5% 40%)',
                      }} />
                    </button>
                    <ChevronRight size={15} style={{
                      color: 'hsl(240 5% 40%)',
                      transform: isActive ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s',
                    }} />
                  </div>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <p style={{ fontSize: 11, color: 'hsl(240 5% 48%)', marginBottom: 2 }}>Price</p>
                    <p style={{
                      fontSize: 17, fontWeight: 800, color: 'hsl(40 6% 94%)',
                      letterSpacing: '-0.015em', lineHeight: 1,
                    }}>
                      {pair.hasData ? `$${fmtPrice(pair.price)}` : '—'}
                    </p>
                  </div>
                  <Sparkline data={pair.sparkline} />
                </div>

                {/* 24h Change */}
                <div className="flex items-center justify-between mb-2">
                  <p style={{ fontSize: 12, color: 'hsl(240 5% 48%)' }}>24h Change</p>
                  <span style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 13, fontWeight: 700,
                    color: up ? '#60a5fa' : '#f87171',
                  }}>
                    {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {pair.hasData ? `${up ? '+' : ''}${pair.change.toFixed(2)}%` : '—'}
                  </span>
                </div>

                {/* 24h Volume */}
                <div className="flex items-center justify-between mb-4">
                  <p style={{ fontSize: 12, color: 'hsl(240 5% 48%)' }}>24h Volume</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'hsl(240 5% 70%)' }}>
                    {fmtVolume(pair.volume)}
                  </p>
                </div>

                {/* CTA */}
                <div style={{ margin: '0 -18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/dashboard/trade/${pair.symbol}`) }}
                    style={{
                      width: '100%', height: 42,
                      background: 'transparent', border: 'none', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      fontSize: 13, fontWeight: 600,
                      color: isActive ? '#93c5fd' : 'hsl(240 5% 55%)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.color = '#93c5fd'
                      el.style.background = 'rgba(96,165,250,0.08)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLButtonElement
                      el.style.color = isActive ? '#93c5fd' : 'hsl(240 5% 55%)'
                      el.style.background = 'transparent'
                    }}
                  >
                    <BarChart2 size={14} />
                    Start Trading
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty watchlist */}
      {tab === 'watchlist' && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 24px', color: 'hsl(240 5% 50%)' }}>
          <Star size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: 'hsl(240 5% 65%)', marginBottom: 6 }}>
            Your watchlist is empty
          </p>
          <p style={{ fontSize: 13 }}>Click the ★ on any market card to add it.</p>
        </div>
      )}

      {/* ── Disclaimer ── */}
      <p style={{
        marginTop: 40, fontSize: 11, color: 'hsl(240 5% 40%)',
        lineHeight: 1.7, textAlign: 'center',
      }}>
        Live prices sourced from Binance and CoinGecko public market data. Cryptocurrency trading involves substantial risk of loss.
        Past performance does not guarantee future results.
      </p>
    </div>
  )
}
