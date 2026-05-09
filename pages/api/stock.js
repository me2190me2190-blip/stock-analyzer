const YF_SUMMARY = "https://query2.finance.yahoo.com/v10/finance/quoteSummary";
const YF_SEARCH  = "https://query2.finance.yahoo.com/v1/finance/search";
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
  "하이브":"352820.KS","엔씨소프트":"036570.KS","에코프로비엠":"247540.KS",
  "에코프로":"086520.KS","lg이노텍":"011070.KS","삼성전기":"009150.KS",
  "엘앤에프":"066970.KS","l&f":"066970.KS","lf":"066970.KS",
  "포스코퓨처엠":"003670.KS","두산에너빌리티":"034020.KS","고려아연":"010130.KS",
  "카카오페이":"377300.KS","넷마블":"251270.KS","펄어비스":"263750.KS",
};

let _session = null, _sessionTime = 0;

async function getYFSession() {
  if (_session && Date.now() - _sessionTime < 50*60*1000) return _session;
  const r1 = await fetch("https://finance.yahoo.com/", { headers:{"User-Agent":UA,"Accept":"text/html"}, redirect:"follow" });
  const ch = typeof r1.headers.getSetCookie==="function" ? r1.headers.getSetCookie() : [r1.headers.get("set-cookie")].filter(Boolean);
  const cookies = ch.map(c=>c.split(";")[0]).join("; ");
  const r2 = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", { headers:{"User-Agent":UA,"Cookie":cookies} });
  const crumb = await r2.text();
  _session = { cookies, crumb };
  _sessionTime = Date.now();
  return _session;
}

async function resolveTicker(query) {
  const q = query.trim();
  if (/^\d{6}$/.test(q)) {
    // 6자리 코드: KS 먼저 시도, 실패하면 KQ
    return q + ".KS"; // fetchStockData에서 실패 시 KQ 재시도
  }
  // 영문 티커 (& 포함 허용)
  if (/^[A-Z0-9.&-]{1,12}$/.test(q.toUpperCase()) && /[A-Z]/.test(q.toUpperCase())) return q.toUpperCase();
  const mapped = KR_STOCKS[q.toLowerCase().replace(/\s/g,"")];
  if (mapped) return mapped;
  // Yahoo 검색
  const { cookies, crumb } = await getYFSession();
  const res = await fetch(`${YF_SEARCH}?q=${encodeURIComponent(q)}&lang=ko-KR&region=KR&crumb=${encodeURIComponent(crumb)}`, { headers:{"User-Agent":UA,"Cookie":cookies} });
  const data = await res.json();
  const hit = data?.quotes?.find(r=>r.quoteType==="EQUITY");
  if (hit) return hit.symbol;
  throw new Error(`"${q}" 종목을 찾을 수 없습니다. 티커를 직접 입력하세요. (예: AAPL, 066970)`);
}

async function fetchWithFallback(ticker, cookies, crumb) {
  const modules = "summaryDetail,financialData,defaultKeyStatistics,incomeStatementHistory,price";
  const tryFetch = async (t) => {
    const url = `${YF_SUMMARY}/${t}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;
    const r = await fetch(url, { headers:{"User-Agent":UA,"Cookie":cookies} });
    const json = await r.json();
    if (json.quoteSummary?.error || !json.quoteSummary?.result?.[0]) return null;
    return { ticker: t, data: json.quoteSummary.result[0] };
  };

  let result = await tryFetch(ticker);

  // KOSPI(.KS) 실패 시 KOSDAQ(.KQ) 재시도
  if (!result && ticker.endsWith(".KS")) {
    result = await tryFetch(ticker.replace(".KS", ".KQ"));
  }

  if (!result) throw new Error(`${ticker} 데이터를 가져올 수 없습니다.`);
  return result;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { query } = req.body || {};
  if (!query?.trim()) return res.status(400).json({ error:"종목을 입력해주세요." });
  try {
    const ticker = await resolveTicker(query);
    const { cookies, crumb } = await getYFSession();
    const { ticker: finalTicker, data: d } = await fetchWithFallback(ticker, cookies, crumb);

    const pr=d.price||{}, sd=d.summaryDetail||{}, fd=d.financialData||{}, ks=d.defaultKeyStatistics||{};
    const is0=d.incomeStatementHistory?.incomeStatementHistory?.[0]||{};
    const is1=d.incomeStatementHistory?.incomeStatementHistory?.[1]||{};
    const cur=pr.regularMarketPrice?.raw, hi52=sd.fiftyTwoWeekHigh?.raw, lo52=sd.fiftyTwoWeekLow?.raw;
    const ma50=sd.fiftyDayAverage?.raw, ma200=sd.twoHundredDayAverage?.raw;
    const pos52w = hi52&&lo52&&cur ? (((cur-lo52)/(hi52-lo52))*100).toFixed(1) : null;
    const rev0=is0.totalRevenue?.raw, rev1=is1.totalRevenue?.raw;
    const revGrowth = rev0&&rev1 ? (((rev0-rev1)/Math.abs(rev1))*100).toFixed(1) : null;
    const currency = pr.currency||"USD";
    const isKRW = currency==="KRW";
    const fmtP = v => v?(isKRW?`₩${Math.round(v).toLocaleString()}`:`$${parseFloat(v).toFixed(2)}`):"N/A";
    const fmtCap = v => { if(!v)return"-"; if(isKRW)return`${(v/1e12).toFixed(1)}조원`; if(v>=1e12)return`$${(v/1e12).toFixed(2)}T`; return`$${(v/1e9).toFixed(1)}B`; };

    return res.status(200).json({
      ticker: finalTicker, currency, isKRW,
      name: pr.longName||pr.shortName||ticker,
      exchange: pr.exchangeName||"",
      sector: pr.sector||"",
      currentPrice: cur, currentPriceFmt: fmtP(cur),
      marketCap: pr.marketCap?.raw, marketCapFmt: fmtCap(pr.marketCap?.raw),
      yearHigh: hi52, yearLow: lo52, yearHighFmt: fmtP(hi52), yearLowFmt: fmtP(lo52),
      priceAvg50: ma50, priceAvg200: ma200,
      position52w: pos52w,
      bullAlignment: ma50&&ma200?ma50>ma200:null,
      per: sd.trailingPE?.raw??ks.forwardPE?.raw,
      pbr: ks.priceToBook?.raw,
      psr: ks.priceToSalesTrailing12Months?.raw,
      evEbitda: ks.enterpriseToEbitda?.raw,
      dividendYield: sd.dividendYield?.raw!=null?(sd.dividendYield.raw*100).toFixed(2):null,
      revenueGrowth: revGrowth??(fd.revenueGrowth?.raw!=null?(fd.revenueGrowth.raw*100).toFixed(1):null),
      operatingMargin: fd.operatingMargins?.raw!=null?(fd.operatingMargins.raw*100).toFixed(1):null,
      epsGrowth: ks.earningsGrowth?.raw!=null?(ks.earningsGrowth.raw*100).toFixed(1):null,
      roe: fd.returnOnEquity?.raw!=null?(fd.returnOnEquity.raw*100).toFixed(1):null,
      roa: fd.returnOnAssets?.raw!=null?(fd.returnOnAssets.raw*100).toFixed(1):null,
      debtEquity: fd.debtToEquity?.raw,
      currentRatio: fd.currentRatio?.raw,
      fcf: fd.freeCashflow?.raw,
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
