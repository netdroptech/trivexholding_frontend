import { useEffect, useRef, useState } from 'react'

/**
 * Live crypto market data — no API keys required.
 *
 *  • CoinGecko REST  → market cap, volume, 7-day sparkline, logo (polled every 60s)
 *  • Binance WebSocket (public market-data mirror) → tick-by-tick price & 24h change
 *  • CoinGecko /global + alternative.me → overview strip (market cap, dominance, volume, Fear & Greed)
 *
 * If the WebSocket is unavailable, prices still refresh from CoinGecko every 60s.
 */

export interface CoinDef {
  id: string        // CoinGecko id
  binance: string   // Binance pair, e.g. BTCUSDT
  name: string
  symbol: string    // display, e.g. BTC/USDT
  color: string
}

export interface LiveCoin extends CoinDef {
  price: number | null
  change: number | null     // 24h %
  volume: number | null     // 24h USD
  marketCap: number | null
  sparkline: number[]
  image?: string
  flash?: 'up' | 'down'
}

export interface MarketOverview {
  totalMarketCap: number | null
  marketCapChange: number | null
  btcDominance: number | null
  totalVolume: number | null
  fearGreed: { value: number; label: string } | null
}

const CG = 'https://api.coingecko.com/api/v3'
const WS_HOSTS = [
  'wss://data-stream.binance.vision/stream',   // market-data only mirror, works in more regions
  'wss://stream.binance.com:9443/stream',
]

async function getJSON<T>(url: string): Promise<T> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`${r.status} ${url}`)
  return r.json()
}

/** Downsample CoinGecko's ~168 hourly points to keep the SVG light. */
function downsample(arr: number[], n = 42) {
  if (arr.length <= n) return arr
  const step = arr.length / n
  return Array.from({ length: n }, (_, i) => arr[Math.floor(i * step)]).concat(arr[arr.length - 1])
}

export function useLiveMarkets(coins: CoinDef[]) {
  const [data, setData] = useState<LiveCoin[]>(() =>
    coins.map(c => ({ ...c, price: null, change: null, volume: null, marketCap: null, sparkline: [] })),
  )
  const [overview, setOverview] = useState<MarketOverview>({
    totalMarketCap: null, marketCapChange: null, btcDominance: null, totalVolume: null, fearGreed: null,
  })
  const [status, setStatus] = useState<'loading' | 'live' | 'polling' | 'error'>('loading')
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)
  const coinsKey = coins.map(c => c.id).join(',')
  const flashTimers = useRef<Record<string, number>>({})

  // ── CoinGecko: market details + sparkline ────────────────────────────────
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const rows = await getJSON<any[]>(
          `${CG}/coins/markets?vs_currency=usd&ids=${coinsKey}&sparkline=true&price_change_percentage=24h&per_page=250`,
        )
        if (!alive) return
        const byId = new Map(rows.map(r => [r.id, r]))
        setData(prev => prev.map(c => {
          const r = byId.get(c.id)
          if (!r) return c
          return {
            ...c,
            // keep the fresher WebSocket price if we already have one
            price: c.price ?? r.current_price,
            change: c.change ?? r.price_change_percentage_24h,
            volume: r.total_volume,
            marketCap: r.market_cap,
            sparkline: downsample(r.sparkline_in_7d?.price ?? []),
            image: r.image,
          }
        }))
        setUpdatedAt(new Date())
        setStatus(s => (s === 'loading' || s === 'error' ? 'polling' : s))
      } catch {
        if (alive) setStatus(s => (s === 'loading' ? 'error' : s))
      }
    }
    load()
    const t = window.setInterval(load, 60_000)
    return () => { alive = false; clearInterval(t) }
  }, [coinsKey])

  // ── Overview strip ────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true
    const loadGlobal = async () => {
      try {
        const { data: g } = await getJSON<any>(`${CG}/global`)
        if (!alive) return
        setOverview(o => ({
          ...o,
          totalMarketCap: g.total_market_cap?.usd ?? null,
          marketCapChange: g.market_cap_change_percentage_24h_usd ?? null,
          btcDominance: g.market_cap_percentage?.btc ?? null,
          totalVolume: g.total_volume?.usd ?? null,
        }))
      } catch { /* keep last value */ }
    }
    const loadFng = async () => {
      try {
        const j = await getJSON<any>('https://api.alternative.me/fng/?limit=1')
        const d = j.data?.[0]
        if (alive && d) setOverview(o => ({ ...o, fearGreed: { value: Number(d.value), label: d.value_classification } }))
      } catch { /* keep last value */ }
    }
    loadGlobal(); loadFng()
    const t1 = window.setInterval(loadGlobal, 120_000)
    const t2 = window.setInterval(loadFng, 600_000)
    return () => { alive = false; clearInterval(t1); clearInterval(t2) }
  }, [])

  // ── Binance WebSocket: real-time ticks ───────────────────────────────────
  useEffect(() => {
    let ws: WebSocket | null = null
    let closed = false
    let hostIdx = 0
    let retry = 0
    let retryTimer: number | undefined
    const streams = coins.map(c => `${c.binance.toLowerCase()}@miniTicker`).join('/')
    const byPair = new Map(coins.map(c => [c.binance.toUpperCase(), c.id]))

    const connect = () => {
      ws = new WebSocket(`${WS_HOSTS[hostIdx]}?streams=${streams}`)
      ws.onopen = () => { retry = 0; setStatus('live') }
      ws.onmessage = ev => {
        const t = JSON.parse(ev.data)?.data
        if (!t?.s) return
        const id = byPair.get(t.s)
        if (!id) return
        const price = parseFloat(t.c)
        const open = parseFloat(t.o)
        const change = open ? ((price - open) / open) * 100 : null
        setData(prev => prev.map(c => {
          if (c.id !== id) return c
          if (c.price == null || price === c.price) return { ...c, price, change }
          return { ...c, price, change, flash: price > c.price ? 'up' : 'down' }
        }))
        clearTimeout(flashTimers.current[id])
        flashTimers.current[id] = window.setTimeout(() => {
          setData(p => p.map(x => (x.id === id && x.flash ? { ...x, flash: undefined } : x)))
        }, 700)
        setUpdatedAt(new Date())
      }
      ws.onclose = () => {
        if (closed) return
        setStatus(s => (s === 'live' ? 'polling' : s))
        hostIdx = (hostIdx + 1) % WS_HOSTS.length
        retryTimer = window.setTimeout(connect, Math.min(30_000, 1000 * 2 ** retry++))
      }
      ws.onerror = () => ws?.close()
    }
    connect()
    return () => {
      closed = true
      clearTimeout(retryTimer)
      Object.values(flashTimers.current).forEach(clearTimeout)
      ws?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coinsKey])

  return { coins: data, overview, status, updatedAt }
}

// ── Single-pair live ticker (Trade detail page) ───────────────────────────
export interface PairTicker {
  price: number
  change: number   // 24h %
  high: number
  low: number
  volume: number   // 24h quote (USDT) volume
}

const REST_HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com']

/** Streams one Binance pair's 24h ticker over WebSocket, with a REST fallback every 10s. */
export function useBinanceTicker(pair: string) {
  const [ticker, setTicker] = useState<PairTicker | null>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    let alive = true
    let ws: WebSocket | null = null
    let hostIdx = 0
    let retry = 0
    let retryTimer: number | undefined
    let pollTimer: number | undefined
    setTicker(null)
    setLive(false)

    const poll = async () => {
      for (const host of REST_HOSTS) {
        try {
          const t = await getJSON<any>(`${host}/api/v3/ticker/24hr?symbol=${pair}`)
          if (!alive) return
          setTicker({
            price: +t.lastPrice, change: +t.priceChangePercent,
            high: +t.highPrice, low: +t.lowPrice, volume: +t.quoteVolume,
          })
          return
        } catch { /* try next host */ }
      }
    }
    const startPolling = () => {
      if (pollTimer) return
      poll()
      pollTimer = window.setInterval(poll, 10_000)
    }
    const stopPolling = () => { clearInterval(pollTimer); pollTimer = undefined }

    const connect = () => {
      ws = new WebSocket(`${WS_HOSTS[hostIdx]}?streams=${pair.toLowerCase()}@ticker`)
      ws.onopen = () => { retry = 0; setLive(true); stopPolling() }
      ws.onmessage = ev => {
        const t = JSON.parse(ev.data)?.data
        if (!t?.c) return
        setTicker({ price: +t.c, change: +t.P, high: +t.h, low: +t.l, volume: +t.q })
      }
      ws.onclose = () => {
        if (!alive) return
        setLive(false)
        startPolling()
        hostIdx = (hostIdx + 1) % WS_HOSTS.length
        retryTimer = window.setTimeout(connect, Math.min(30_000, 1000 * 2 ** retry++))
      }
      ws.onerror = () => ws?.close()
    }

    poll()       // show something immediately
    connect()
    return () => { alive = false; clearTimeout(retryTimer); stopPolling(); ws?.close() }
  }, [pair])

  return { ticker, live }
}

// ── Formatting helpers ─────────────────────────────────────────────────────
export function fmtPrice(p: number | null) {
  if (p == null) return '—'
  if (p >= 1) return '$' + p.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (p >= 0.01) return '$' + p.toFixed(4)
  return '$' + p.toPrecision(4)
}

export function fmtCompact(n: number | null) {
  if (n == null) return '—'
  const abs = Math.abs(n)
  if (abs >= 1e12) return `$${(n / 1e12).toFixed(2)}T`
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  return '$' + n.toLocaleString('en')
}
