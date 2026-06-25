const rateLimit = new Map() // ip -> { count, resetAt }
const LIMIT = 30
const WINDOW_MS = 60_000

function checkRateLimit(ip) {
  const now = Date.now()
  const entry = rateLimit.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (entry.count >= LIMIT) return false
  entry.count++
  return true
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown'
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many requests' })
  }

  const ticker = req.query.ticker
  if (!ticker) return res.status(400).json({ error: 'ticker requerido' })
  try {
    const r = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${ticker}.BA?interval=1d&range=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const d = await r.json()
    const meta = d?.chart?.result?.[0]?.meta
    if (meta?.regularMarketPrice) {
      return res.status(200).json({ precio: meta.regularMarketPrice, moneda: meta.currency, variacion: meta.regularMarketChangePercent })
    }
    const r2 = await fetch(`https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    const d2 = await r2.json()
    const meta2 = d2?.chart?.result?.[0]?.meta
    if (meta2?.regularMarketPrice) {
      return res.status(200).json({ precio: meta2.regularMarketPrice, moneda: meta2.currency, variacion: meta2.regularMarketChangePercent })
    }
    return res.status(404).json({ error: 'sin datos para ' + ticker })
  } catch(e) {
    return res.status(500).json({ error: e.message })
  }
}
