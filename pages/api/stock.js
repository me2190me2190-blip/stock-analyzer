const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const KIS_BASE = "https://openapi.koreainvestment.com:9443";

/* ── KR 종목명 매핑 ── */
const KR_STOCKS = {
  "삼성전자":"005930","sk하이닉스":"000660","lg에너지솔루션":"373220",
  "삼성바이오로직스":"207940","현대차":"005380","현대자동차":"005380",
  "기아":"000270","포스코홀딩스":"005490","삼성sdi":"006400",
  "lg화학":"051910","카카오":"035720","네이버":"035420",
  "셀트리온":"068270","kb금융":"105560","신한지주":"055550",
  "하나금융지주":"086790","삼성물산":"028260","lg전자":"066570",
  "sk이노베이션":"096770","현대모비스":"012330","sk텔레콤":"017670",
  "한국전력":"015760","크래프톤":"259960","카카오뱅크":"323410",
  "하이브":"352820","엔씨소프트":"036570","에코프로비엠":"247540",
  "에코프로":"086520","lg이노텍":"011070","삼성전기":"009150",
  "엘앤에프":"066970","l&f":"066970","포스코퓨처엠":"003670",
  "두산에너빌리티":"034020","고려아연":"010130","카카오페이":"377300",
  "넷마블":"251270","펄어비스":"263750","카카오게임즈":"293490",
  "한미약품":"128940","셀트리온헬스케어":"091990",
};

/* ── KIS 토큰 캐시 ── */
let _kisToken = null, _kisTokenExp = 0;

async function getKISToken() {
  if (_kisToken && Date.now() < _kisTokenExp) return _kisToken;
  const r = await fetch(`${KIS_BASE}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
    }),
  });
  const d = await r.json();
  if (!d.access_token) throw new Error("KIS 토큰 발급 실패");
  _kisToken = d.access_token;
  _kisTokenExp = Date.now() + (d.expires_in - 300) * 1000;
  return _kisToken;
}

function kisHeaders(token, trId) {
  return {
    "Authorization": `Bearer ${token}`,
    "appkey": process.env.KIS_APP_KEY,
    "appsecret": process.env.KIS_APP_SECRET,
    "tr_id": trId,
    "custtype": "P",
    "Content-Type": "application/json",
  };
}

/* ── KIS 현재가 + 기본 지표 ── */
async function fetchKISQuote(code, token) {
  const params = new URLSearchParams({
    FID_COND_MRKT_DIV_CODE: "J",
    FID_INPUT_ISCD: code,
  });
  const r = await fetch(`${KIS_BASE}/uapi/domestic-stock/v1/quotations/inquire-price?${params}`, {
    headers: kisHeaders(token, "FHKST01010100"),
  });
  const d = await r.json();
  return d.output || null;
}

/* ── KIS 일봉 → MA50·MA200 계산 ── */
async function fetchKISMAs(code, token, mktCode="J") {
  const now = new Date();
  const end = now.toISOString().slice(0,10).replace(/-/g,"");
  const start = new Date(now - 365*24*60*60*1000).toISOString().slice(0,10).replace(/-/g,"");
  const params = new URLSearchParams({
    FID_COND_MRKT_DIV_CODE: mktCode,
    FID_INPUT_ISCD: code,
    FID_INPUT_DATE_1: start,
    FID_INPUT_DATE_2: end,
    FID_PERIOD_DIV_CODE: "D",
    FID_ORG_ADJ_PV: "0",
  });
  const r = await fetch(`${KIS_BASE}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?${params}`, {
    headers: kisHeaders(token, "FHKST03010100"),
  });
  const d = await r.json();
  const rows = d.output2 || [];
  const closes = rows.map(row => parseFloat(row.stck_clpr)).filter(v => !isNaN(v) && v > 0);
  const avg = (arr, n) => arr.length >= n ? arr.slice(0,n).reduce((a,b)=>a+b,0)/n : null;
  return { ma50: avg(closes,50), ma200: avg(closes,200), closes };
}

/* ── KIS 재무비율 (ROE, 영업이익률 등) ── */
async function fetchKISFinancial(code, token) {
  try {
    const params = new URLSearchParams({
      FID_DIV_CLS_CODE: "0",
      fid_cond_mrkt_div_code: "J",
      fid_input_iscd: code,
    });
    const r = await fetch(`${KIS_BASE}/uapi/domestic-stock/v1/quotations/inquire-financial-ratiods?${params}`, {
      headers: kisHeaders(token, "FHKST66430300"),
    });
    const d = await r.json();
    const o = d.output || {};
    return {
      roe:            parseFloat(o.roe_val)   || null,
      operatingMargin:parseFloat(o.bsop_prfr) || null,
      debtEquity:     parseFloat(o.lblt_rate) || null,
      currentRatio:   parseFloat(o.crnt_rate) || null,
    };
  } catch { return {}; }
}


async function fetchNews(query) {
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&newsCount=5&lang=ko-KR`;
    const r = await fetch(url, { headers:{"User-Agent":UA} });
    const d = await r.json();
    return (d.news||[]).slice(0,5).map(n=>({
      title: n.title,
      publisher: n.publisher,
      time: n.providerPublishTime ? new Date(n.providerPublishTime*1000).toLocaleDateString("ko-KR") : "",
    }));
  } catch { return []; }
}

/* ── Yahoo Finance v8/chart (미국 주식용) ── */
async function fetchYahooChart(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1mo`;
  try {
    const r = await fetch(url, { headers:{"User-Agent":UA} });
    const json = await r.json();
    if (json.chart?.error) return null;
    const result = json.chart?.result?.[0];
    if (!result) return null;
    const meta = result.meta || {};
    const isKRW = meta.currency==="KRW";
    const closes = (result.indicators?.quote?.[0]?.close||[]).filter(v=>v!=null&&v>0);
    const lastClose = closes[closes.length-1];
    let price = isKRW
      ? [meta.regularMarketPrice, meta.chartPreviousClose, lastClose].find(v=>v!=null&&v>=1000)
      : (meta.regularMarketPrice || lastClose);
    return { ...meta, reliablePrice: price };
  } catch { return null; }
}

/* ── 티커 해석 ── */
function resolveTicker(query) {
  const q = query.trim();

  // 6자리 숫자 → 한국 종목
  if (/^\d{6}$/.test(q)) {
    return { type:"KR", code: q };
  }

  // .KS/.KQ 형식
  const m = q.toUpperCase().match(/^(\d{6})\.(KS|KQ)$/);
  if (m) return { type:"KR", code: m[1] };

  // 한국 종목명 매핑
  const mapped = KR_STOCKS[q.toLowerCase().replace(/\s/g,"")];
  if (mapped) {
    const code = mapped.replace(/\.(KS|KQ)$/, "");
    return { type:"KR", code };
  }

  // 미국 주식 (영문 티커)
  if (/^[A-Z]{1,5}$/.test(q.toUpperCase())) {
    return { type:"US", ticker: q.toUpperCase() };
  }

  throw new Error(`"${q}" 종목을 찾을 수 없습니다. (예: 삼성전자, 005930, AAPL)`);
}

/* ── 한국 주식 데이터 조합 ── */
async function fetchKRStockData(code) {
  const token = await getKISToken();
  // 1단계: 종목 기본 정보 먼저
  const quote = await fetchKISQuote(code, token);
  if (!quote || !quote.stck_prpr) throw new Error(`${code} 데이터를 가져올 수 없습니다.`);

  const stockName = quote.hts_kor_isnm || code;

  // 2단계: 일봉 + 뉴스 병렬 (종목명으로 뉴스 검색)
  let mas = await fetchKISMAs(code, token, "J");
  if (!mas.closes?.length) {
    mas = await fetchKISMAs(code, token, "Q");
  }
  const [financial, news] = await Promise.all([
    fetchKISFinancial(code, token),
    fetchNews(stockName),
  ]);

  const hi52 = parseInt(quote.w52_hgpr);
  const lo52 = parseInt(quote.w52_lwpr);

  // KIS 일봉 closes는 천원(千원) 단위로 반환 → 원 단위로 보정
  const rawClose = mas.closes?.[0] || 0;
  const rawPrice = parseInt(quote.stck_prpr) || 0;
  const unitFactor = (lo52 > 0 && rawClose > 0 && lo52 / rawClose > 100) ? 1000 : 1;
  const cur = (rawClose || rawPrice) * unitFactor;
  if (!cur) throw new Error(`${code} 현재가를 가져올 수 없습니다.`);

  // 이동평균도 보정
  const ma50  = mas.ma50  ? mas.ma50  * unitFactor : null;
  const ma200 = mas.ma200 ? mas.ma200 * unitFactor : null;

  const pos52w = hi52&&lo52&&cur ? (((cur-lo52)/(hi52-lo52))*100).toFixed(1) : null;
  const mktCap = parseInt(quote.hts_avls) * 1e8;

  const fmtKRW = v => v ? `₩${Math.round(v).toLocaleString()}` : "N/A";
  const fmtCap = v => v ? `${(v/1e12).toFixed(1)}조원` : "-";

  // null-safe 파싱 (0도 null 처리)
  const safeFloat = (v, min=0.001) => { const n = parseFloat(v); return n > min ? n : null; };
  const safeInt   = (v)            => { const n = parseInt(v);   return n > 0 ? n : null; };

  return {
    type: "KR", ticker: `${code}.KS`, currency: "KRW", isKRW: true,
    name:            quote.hts_kor_isnm || code,
    exchange:        "KSE",
    sector:          quote.bstp_kor_isnm || "",
    currentPrice:    cur,
    currentPriceFmt: fmtKRW(cur),
    marketCap:       mktCap,
    marketCapFmt:    fmtCap(mktCap),
    yearHigh: hi52, yearLow: lo52,
    yearHighFmt: fmtKRW(hi52), yearLowFmt: fmtKRW(lo52),
    priceAvg50: ma50, priceAvg200: ma200,
    position52w: pos52w,
    bullAlignment: ma50&&ma200 ? ma50>ma200 : null,
    per:           safeFloat(quote.per),
    pbr:           safeFloat(quote.pbr),
    eps:           safeInt(quote.eps),
    bps:           safeInt(quote.bps),
    roe:           safeFloat(quote.roe_val) || financial.roe || null,
    dividendYield: safeFloat(quote.dvdn_yied_val),
    operatingMargin: financial.operatingMargin || null,
    debtEquity:    financial.debtEquity || null,
    currentRatio:  financial.currentRatio || null,
    revenueGrowth: null, operatingMargin: null,
    epsGrowth: null, roa: null,
    debtEquity: null, currentRatio: null, fcf: null,
    recentNews: news,
  };
}

/* ── 미국 주식 데이터 ── */
async function fetchUSStockData(ticker) {
  const [chart, news] = await Promise.all([
    fetchYahooChart(ticker),
    fetchNews(ticker),
  ]);
  if (!chart?.reliablePrice) throw new Error(`${ticker} 데이터를 가져올 수 없습니다.`);

  const cur = chart.reliablePrice;
  const hi52=chart.fiftyTwoWeekHigh, lo52=chart.fiftyTwoWeekLow;
  const ma50=chart.fiftyDayAverage, ma200=chart.twoHundredDayAverage;
  const pos52w = hi52&&lo52&&cur ? (((cur-lo52)/(hi52-lo52))*100).toFixed(1) : null;
  const fmtP = v => v ? `$${parseFloat(v).toFixed(2)}` : "N/A";
  const fmtCap = v => !v?"-":v>=1e12?`$${(v/1e12).toFixed(2)}T`:`$${(v/1e9).toFixed(1)}B`;

  return {
    type:"US", ticker, currency:"USD", isKRW:false,
    name: chart.longName||chart.shortName||ticker,
    exchange: chart.exchangeName||"",
    sector: chart.sector||"",
    currentPrice: cur, currentPriceFmt: fmtP(cur),
    marketCap: chart.marketCap, marketCapFmt: fmtCap(chart.marketCap),
    yearHigh: hi52, yearLow: lo52, yearHighFmt: fmtP(hi52), yearLowFmt: fmtP(lo52),
    priceAvg50: ma50, priceAvg200: ma200,
    position52w: pos52w, bullAlignment: ma50&&ma200?ma50>ma200:null,
    per: chart.trailingPE||null, pbr: null, eps: null, bps: null,
    dividendYield: chart.dividendYield?(chart.dividendYield*100).toFixed(2):null,
    revenueGrowth:null, operatingMargin:null, epsGrowth:null,
    roe:null, roa:null, debtEquity:null, currentRatio:null, fcf:null,
    recentNews: news,
  };
}

/* ── 메인 핸들러 ── */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { query } = req.body || {};
  if (!query?.trim()) return res.status(400).json({ error:"종목을 입력해주세요." });
  try {
    const resolved = resolveTicker(query);
    const data = resolved.type==="KR"
      ? await fetchKRStockData(resolved.code)
      : await fetchUSStockData(resolved.ticker);
    return res.status(200).json(data);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
