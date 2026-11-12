import type { CoinDef } from '@/hooks/useLiveMarkets'

/**
 * Single source of truth for the tradable pairs.
 * `id` = CoinGecko id, `binance` = Binance spot pair (also used in URLs / TradingView).
 */
export const TRADE_MARKETS: CoinDef[] = [
  { id: 'bitcoin',                 binance: 'BTCUSDT',  name: 'Bitcoin',       symbol: 'BTC/USDT',  color: '#f7931a' },
  { id: 'ethereum',                binance: 'ETHUSDT',  name: 'Ethereum',      symbol: 'ETH/USDT',  color: '#627eea' },
  { id: 'binancecoin',             binance: 'BNBUSDT',  name: 'BNB',           symbol: 'BNB/USDT',  color: '#f3ba2f' },
  { id: 'cardano',                 binance: 'ADAUSDT',  name: 'Cardano',       symbol: 'ADA/USDT',  color: '#4a9eff' },
  { id: 'ripple',                  binance: 'XRPUSDT',  name: 'XRP',           symbol: 'XRP/USDT',  color: '#00aae4' },
  { id: 'solana',                  binance: 'SOLUSDT',  name: 'Solana',        symbol: 'SOL/USDT',  color: '#9945ff' },
  { id: 'polkadot',                binance: 'DOTUSDT',  name: 'Polkadot',      symbol: 'DOT/USDT',  color: '#e6007a' },
  { id: 'dogecoin',                binance: 'DOGEUSDT', name: 'Dogecoin',      symbol: 'DOGE/USDT', color: '#c2a633' },
  { id: 'avalanche-2',             binance: 'AVAXUSDT', name: 'Avalanche',     symbol: 'AVAX/USDT', color: '#e84142' },
  { id: 'polygon-ecosystem-token', binance: 'POLUSDT',  name: 'Polygon',       symbol: 'POL/USDT',  color: '#8247e5' },
  { id: 'chainlink',               binance: 'LINKUSDT', name: 'Chainlink',     symbol: 'LINK/USDT', color: '#375bd2' },
  { id: 'litecoin',                binance: 'LTCUSDT',  name: 'Litecoin',      symbol: 'LTC/USDT',  color: '#bfbbbb' },
  { id: 'uniswap',                 binance: 'UNIUSDT',  name: 'Uniswap',       symbol: 'UNI/USDT',  color: '#ff007a' },
  { id: 'cosmos',                  binance: 'ATOMUSDT', name: 'Cosmos',        symbol: 'ATOM/USDT', color: '#6f7390' },
  { id: 'near',                    binance: 'NEARUSDT', name: 'NEAR Protocol', symbol: 'NEAR/USDT', color: '#00ec97' },
  { id: 'aptos',                   binance: 'APTUSDT',  name: 'Aptos',         symbol: 'APT/USDT',  color: '#00bcd4' },
]

/** Old pair names that Binance has retired → their replacement. */
export const RENAMED_PAIRS: Record<string, string> = { MATICUSDT: 'POLUSDT' }

export const MARKET_BY_PAIR = Object.fromEntries(TRADE_MARKETS.map(m => [m.binance, m]))
