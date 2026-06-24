export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { ticker } = req.query;
  if (!ticker) return res.status(400).json({ error: 'ticker requerido' });

  const t = ticker.toUpperCase();

  try {
    // 1. Buscar CEDEAR en pesos (ticker.BA en BYMA vía Yahoo)
    let url = `https://query2.finance.yahoo.com/v8/finance/chart/${t}.BA?interval=1d&range=1d`;
    let r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    let d = await r.json();
    let meta = d?.chart?.result?.[0]?.meta;

    // 2. Si no existe .BA, buscar el subyacente en USD
    if (!meta?.regularMarketPrice) {
      url = `https://query2.finance.yahoo.com/v8/finance/chart/${t}?interval=1d&range=1d`;
      r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      d = await r.json();
      meta = d?.chart?.result?.[0]?.meta;
    }

    if (!meta?.regularMarketPrice) {
      return res.status(404).json({ error: 'no encontrado', ticker: t });
    }

    return res.status(200).json({
      ticker: t,
      precio: meta.regularMarketPrice,
      moneda: meta.currency,
      variacion: meta.regularMarketChangePercent ?? 0,
      nombre: meta.shortName ?? t,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message, ticker: t });
  }
}
