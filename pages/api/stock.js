const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const KR_STOCKS = {
  "삼성전자":"005930.KS","sk하이닉스":"000660.KS","lg에너지솔루션":"373220.KS",
  "삼성바이오로직스":"207940.KS","현대차":"005380.KS","현대자동차":"005380.KS",
  "기아":"000270.KS","포스코홀딩스":"005490.KS","삼성sdi":"006400.KS",
  "lg화학":"051910.KS","카카오":"035720.KS","네이버":"035420.KS",
  "셀트리온":"068270.KS","kb금융":"105560.KS","신한지주":"055550.KS",
  "하나금융지주":"086790.KS","삼성물산":"028260.KS","lg전자":"066570.KS",
  "sk이노베이션":"096770.KS","현대모비스":"012330.KS","sk텔레콤":"017670.KS",
  "한국전력":"015760.KS","크래프톤":"259960.KS","카카오뱅크":"323410.KS",
  "하이브":"352820.KS","엔씨소프트":"036570.KS","에코프로비엠":"247540.KQ",
  "에코프로":"086520.KQ","lg이노텍":"011070.KS","삼성전기":"009150.KS",
  "엘앤에프":"066970.KQ","l&f":"066970.KQ","lf":"066970.KQ",
  "포스코퓨처엠":"003670.KS","두산에너빌리티":"034020.KS","고려아연":"010130.KS",
  "카카오페이":"377300.KQ","넷마블":"251270.KQ","펄어비스":"263750.KQ",
  "카카오게임즈":"293490.KQ","한미약품":"128940.KS","셀트리온헬스케어":"091990.KQ",
  "파마리서치":"214450.KQ","알테오젠":"196170.KQ","리가켐바이오":"141080.KQ",
};

// KOSDAQ 종목 코드 목록 (주요)
const KOSDAQ_CODES = new Set([
  "247540","086520","066970","377300","251270","263750","293490",
  "091990","214450","196170","141080","035420","035720",
]);

async function fetchV7Quote(ticker) {
  const fields = "regularMarketPrice,marketCap,trailingPE,priceToBook,fiftyTwoWeekHigh,fiftyTwoWeekLow,fiftyDayAverage,twoHundredDayAverage,dividendYield,longName,shortName,currency,exchange,sector,industry,regularMarketChangePercent";
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}&fields=${fields}`;
  const r = await fetch(url, { headers:{"User-Agent":UA,"Accept":"application/json"} });
  const json = await r.json();
  const result = json?.quoteResponse?.result?.[0];
  return result || null;
}

async function fetchV10Summary(ticker) {
  // crumb 없이 시도 (일부 경우 동작)
  const modules = "financialData,defaultKeyStatistics,incomeStatementHistory";
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${modules}`;
  try {
    const r = await fetch(url, { headers:{"User-Agent":UA,"Accept":"application/json"} });
    const json = await r.json();
    if (json.quoteSummary?.error) return null;
    return json.quoteSummary?.result?.[0] || null;
  } catch { return null; }
}

async function resolveTicker(query) {
  const q = query.trim();
  // 6자리 숫자 → KOSDAQ 먼저 체크
  if (/^\d{6}$/.test(q)) {
    return KOSDAQ_CODES.has(q) ? q + ".KQ" : q + ".KS";
  }
  if (/^[A-Z0-9.&-]{1,12}$/.test(q.toUpperCase()) && /[A-Z]/.test(q.toUpperCase())) return q.toUpperCase();
  const mapped = KR_STOCKS[q.toLowerCase().replace(/\s/g,"")];
  if (mapped) return mapped;

  // Yahoo 검색 (간단 버전)
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=ko-KR&region=KR`;
  try {
    const r = await fetch(url, { headers:{"User-Agent":UA} });
    const data = await r.json();
    const hit = data?.quotes?.find(r=>r.quoteType==="EQUITY");
    if (hit) return hit.symbol;
  } catch {}
  throw new Error(`"${q}" 종목을 찾을 수 없습니다. 티커를 직접 입력하세요. (예: AAPL, 066970)`);
}

async function fetchStockData(ticker) {
  // KS/KQ 자동 시도
  let q7 = await fetchV7Quote(ticker);

  // 실패 시 반대 시장 시도
  if (!q7 || !q7.regularMarketPrice) {
    const alt = ticker.endsWith(".KS") ? ticker.replace(".KS",".KQ") : ticker.replace(".KQ",".KS");
    q7 = await fetchV7Quote(alt);
    if (q7?.regularMarketPrice) ticker = alt;
  }
  if (!q7 || !q7.regularMarketPrice) throw new Error(`${ticker} 데이터를 가져올 수 없습니다.`);

  // 추가 재무 데이터
  const v10 = await fetchV10Summary(ticker);
  const fd = v10?.financialData || {};
  const ks = v10?.defaultKeyStatistics || {};
  const is0 = v10?.incomeStatementHistory?.incomeStatementHistory?.[0] || {};
  const is1 = v10?.incomeStatementHistory?.incomeStatementHistory?.[1] || {};

  const cur     = q7.regularMarketPrice;
  const hi52    = q7.fiftyTwoWeekHigh;
  const lo52    = q7.fiftyTwoWeekLow;
  const ma50    = q7.fiftyDayAverage;
  const ma200   = q7.twoHundredDayAverage;
  const pos52w  = hi52&&lo52&&cur ? (((cur-lo52)/(hi52-lo52))*100).toFixed(1) : null;
  const rev0    = is0.totalRevenue?.raw, rev1 = is1.totalRevenue?.raw;
  const revGrowth = rev0&&rev1 ? (((rev0-rev1)/Math.abs(rev1))*100).toFixed(1) : null;
  const currency  = q7.currency || "USD";
  const isKRW     = currency === "KRW";
  const fmtP  = v => v ? (isKRW ? `₩${Math.round(v).toLocaleString()}` : `$${parseFloat(v).toFixed(2)}`) : "N/A";
  const fmtCap = v => {
    if (!v) return "-";
    if (isKRW) return `${(v/1e12).toFixed(1)}조원`;
    if (v>=1e12) return `$${(v/1e12).toFixed(2)}T`;
    return `$${(v/1e9).toFixed(1)}B`;
  };

  return {
    ticker, currency, isKRW,
    name:            q7.longName || q7.shortName || ticker,
    exchange:        q7.exchange || "",
    sector:          q7.sector || q7.industry || "",
    currentPrice:    cur,
    currentPriceFmt: fmtP(cur),
    marketCap:       q7.marketCap,
    marketCapFmt:    fmtCap(q7.marketCap),
    yearHigh: hi52, yearLow: lo52,
    yearHighFmt: fmtP(hi52), yearLowFmt: fmtP(lo52),
    priceAvg50: ma50, priceAvg200: ma200,
    position52w: pos52w,
    bullAlignment: ma50&&ma200 ? ma50>ma200 : null,
    per:          q7.trailingPE ?? ks.forwardPE?.raw,
    pbr:          q7.priceToBook ?? ks.priceToBook?.raw,
    psr:          ks.priceToSalesTrailing12Months?.raw,
    evEbitda:     ks.enterpriseToEbitda?.raw,
    dividendYield: q7.dividendYield != null ? (q7.dividendYield*100).toFixed(2) : null,
    revenueGrowth: revGrowth ?? (fd.revenueGrowth?.raw!=null?(fd.revenueGrowth.raw*100).toFixed(1):null),
    operatingMargin: fd.operatingMargins?.raw!=null?(fd.operatingMargins.raw*100).toFixed(1):null,
    epsGrowth:    ks.earningsGrowth?.raw!=null?(ks.earningsGrowth.raw*100).toFixed(1):null,
    roe:          fd.returnOnEquity?.raw!=null?(fd.returnOnEquity.raw*100).toFixed(1):null,
    roa:          fd.returnOnAssets?.raw!=null?(fd.returnOnAssets.raw*100).toFixed(1):null,
    debtEquity:   fd.debtToEquity?.raw,
    currentRatio: fd.currentRatio?.raw,
    fcf:          fd.freeCashflow?.raw,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { query } = req.body || {};
  if (!query?.trim()) return res.status(400).json({ error:"종목을 입력해주세요." });
  try {
    const ticker = await resolveTicker(query);
    const data   = await fetchStockData(ticker);
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
