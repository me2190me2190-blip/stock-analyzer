const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const SYSTEM_PROMPT = `당신은 기관급 주식 분석 AI입니다. 제공된 실제 재무 데이터를 기반으로 100점 만점 점수를 산출하세요. 웹 검색 없이 주어진 데이터만 사용합니다.

점수 구조 (100점):
[가치 20점] PER(5) PBR(5) PSR(5) EV/EBITDA(5) — 섹터 평균 대비
[성장 20점] 매출성장(5) 영업이익률(5) EPS성장(5) ROE(5)
[재무 20점] 부채비율(5) 유동비율(5) 이자보상배율(5) FCF(5)
[모멘텀 20점] RSI(4) 52주위치(4) 이평선정배열(4) 골든/데드크로스(4) 20일선위치(4)
[업계 20점] 트렌드(8) 경쟁포지션(6) 이슈(6) — 학습 데이터 기반
등급: S>=90 A>=80 B>=70 C>=60 D<60 / null 지표는 neutral 2~3점

JSON만 반환:
{"stockInfo":{"name":"","ticker":"","market":"","sector":"","currentPrice":"","currency":"","marketCap":""},"scores":{"total":0,"objective":0,"industry":0,"breakdown":{"value":0,"growth":0,"financial":0,"momentum":0},"industryBreakdown":{"trend":0,"competitive":0,"issues":0},"grade":"B","rationale":"3~5문장"},"indicators":{"value":[{"name":"PER","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"PBR","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"PSR","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"EV/EBITDA","value":"","benchmark":"","score":0,"status":"good","comment":""}],"growth":[{"name":"매출 성장률(YoY)","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"영업이익률","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"EPS 성장률","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"ROE","value":"","benchmark":"","score":0,"status":"good","comment":""}],"financial":[{"name":"부채비율","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"유동비율","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"이자보상배율","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"FCF","value":"","benchmark":"","score":0,"status":"good","comment":""}],"momentum":[{"name":"RSI(14일)","value":"","benchmark":"40~65","score":0,"status":"good","comment":""},{"name":"52주 위치","value":"","benchmark":"30~70%","score":0,"status":"good","comment":""},{"name":"이평선 정배열","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"골든/데드크로스","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"20일선 위치","value":"","benchmark":"0~5%","score":0,"status":"good","comment":""}]},"industryAnalysis":{"trendScore":0,"competitiveScore":0,"issueScore":0,"trendSummary":"","competitiveSummary":"","issues":[{"type":"positive","title":"","description":""}]},"priceTargets":{"currentPrice":"0","currency":"USD","buyZoneLow":"0","buyZoneHigh":"0","targetPrice":"0","stopLoss":"0","upside":"0","basis":""},"precautions":[{"level":"medium","title":"","description":""}],"outlook":""}`;

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
};

/* Yahoo Finance crumb 취득 */
async function getYFSession() {
  const r1 = await fetch("https://finance.yahoo.com/", {
    headers: { "User-Agent": UA, "Accept": "text/html" },
    redirect: "follow",
  });
  const cookieHeaders = typeof r1.headers.getSetCookie === "function"
    ? r1.headers.getSetCookie()
    : [r1.headers.get("set-cookie")].filter(Boolean);
  const cookies = cookieHeaders.map(c => c.split(";")[0]).join("; ");

  const r2 = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
    headers: { "User-Agent": UA, "Cookie": cookies },
  });
  const crumb = await r2.text();
  return { cookies, crumb };
}

function resolveTicker(query) {
  const q = query.trim();
  if (/^\d{6}$/.test(q)) return q + ".KS";
  if (/^[A-Z0-9.]{1,12}$/.test(q.toUpperCase())) return q.toUpperCase();
  const mapped = KR_STOCKS[q.toLowerCase().replace(/\s/g, "")];
  if (mapped) return mapped;
  throw new Error(`"${q}" 종목을 찾을 수 없습니다. 티커를 직접 입력하세요. (예: AAPL, 005930.KS)`);
}

async function fetchStockData(ticker, cookies, crumb) {
  const modules = "summaryDetail,financialData,defaultKeyStatistics,incomeStatementHistory,price";
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${ticker}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;
  const res  = await fetch(url, { headers: { "User-Agent": UA, "Cookie": cookies } });
  const json = await res.json();

  if (json.quoteSummary?.error) throw new Error(`데이터 오류: ${json.quoteSummary.error.description}`);
  const d = json.quoteSummary?.result?.[0];
  if (!d) throw new Error(`${ticker} 데이터를 가져올 수 없습니다.`);

  const pr  = d.price || {};
  const sd  = d.summaryDetail || {};
  const fd  = d.financialData || {};
  const ks  = d.defaultKeyStatistics || {};
  const is0 = d.incomeStatementHistory?.incomeStatementHistory?.[0] || {};
  const is1 = d.incomeStatementHistory?.incomeStatementHistory?.[1] || {};

  const cur    = pr.regularMarketPrice?.raw;
  const hi52   = sd.fiftyTwoWeekHigh?.raw;
  const lo52   = sd.fiftyTwoWeekLow?.raw;
  const ma50   = sd.fiftyDayAverage?.raw;
  const ma200  = sd.twoHundredDayAverage?.raw;
  const pos52w = hi52 && lo52 && cur ? (((cur-lo52)/(hi52-lo52))*100).toFixed(1) : null;
  const rev0   = is0.totalRevenue?.raw, rev1 = is1.totalRevenue?.raw;
  const revGrowth = rev0 && rev1 ? (((rev0-rev1)/Math.abs(rev1))*100).toFixed(1) : null;
  const currency  = pr.currency || "USD";
  const isKRW     = currency === "KRW";
  const fmtP  = v => v ? (isKRW ? `₩${Math.round(v).toLocaleString()}` : `$${parseFloat(v).toFixed(2)}`) : "N/A";
  const fmtCap = v => {
    if (!v) return "-";
    if (isKRW) return `${(v/1e12).toFixed(1)}조원`;
    if (v>=1e12) return `$${(v/1e12).toFixed(2)}T`;
    return `$${(v/1e9).toFixed(1)}B`;
  };

  return {
    ticker, currency, fmtP, fmtCap,
    name:            pr.longName || pr.shortName || ticker,
    exchange:        pr.exchangeName || "",
    sector:          pr.sector || "",
    currentPrice:    cur,
    currentPriceFmt: fmtP(cur),
    marketCapFmt:    fmtCap(pr.marketCap?.raw),
    yearHigh: hi52, yearLow: lo52,
    priceAvg50: ma50, priceAvg200: ma200,
    position52w: pos52w,
    bullAlignment: ma50 && ma200 ? ma50 > ma200 : null,
    per:          sd.trailingPE?.raw ?? ks.forwardPE?.raw,
    pbr:          ks.priceToBook?.raw,
    psr:          ks.priceToSalesTrailing12Months?.raw,
    evEbitda:     ks.enterpriseToEbitda?.raw,
    dividendYield: sd.dividendYield?.raw != null ? (sd.dividendYield.raw*100).toFixed(2) : null,
    revenueGrowth: revGrowth ?? (fd.revenueGrowth?.raw != null ? (fd.revenueGrowth.raw*100).toFixed(1) : null),
    operatingMargin: fd.operatingMargins?.raw != null ? (fd.operatingMargins.raw*100).toFixed(1) : null,
    epsGrowth:    ks.earningsGrowth?.raw != null ? (ks.earningsGrowth.raw*100).toFixed(1) : null,
    roe:          fd.returnOnEquity?.raw != null ? (fd.returnOnEquity.raw*100).toFixed(1) : null,
    roa:          fd.returnOnAssets?.raw != null ? (fd.returnOnAssets.raw*100).toFixed(1) : null,
    debtEquity:   fd.debtToEquity?.raw,
    currentRatio: fd.currentRatio?.raw,
    fcf:          fd.freeCashflow?.raw,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { query } = req.body || {};
  if (!query?.trim()) return res.status(400).json({ error: "종목을 입력해주세요." });

  try {
    const ticker          = resolveTicker(query);
    const { cookies, crumb } = await getYFSession();
    const s               = await fetchStockData(ticker, cookies, crumb);

    const prompt = `다음 실제 재무 데이터를 기반으로 분석:
종목: ${s.name} (${s.ticker}) / ${s.exchange} / ${s.sector}
현재가: ${s.currentPriceFmt} ${s.currency} | 시총: ${s.marketCapFmt}
52주 고: ${s.fmtP(s.yearHigh)} | 저: ${s.fmtP(s.yearLow)} | 현재위치: ${s.position52w}%
50일선: ${s.fmtP(s.priceAvg50)} | 200일선: ${s.fmtP(s.priceAvg200)}
배열: ${s.bullAlignment===null?"N/A":s.bullAlignment?"50일>200일(강세)":"50일<200일(약세)"}
[가치] PER:${s.per??'N/A'} | PBR:${s.pbr??'N/A'} | PSR:${s.psr??'N/A'} | EV/EBITDA:${s.evEbitda??'N/A'} | 배당:${s.dividendYield??'0'}%
[성장] 매출성장:${s.revenueGrowth??'N/A'}% | 영업이익률:${s.operatingMargin??'N/A'}% | EPS성장:${s.epsGrowth??'N/A'}% | ROE:${s.roe??'N/A'}% | ROA:${s.roa??'N/A'}%
[재무] 부채비율:${s.debtEquity??'N/A'} | 유동비율:${s.currentRatio??'N/A'} | FCF:${s.fcf??'N/A'}
priceTargets 가격은 ${s.currency} 숫자만.`;

    const cr = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-beta":"prompt-caching-2024-07-31" },
      body: JSON.stringify({
        model:"claude-sonnet-4-5-20250929", max_tokens:4500,
        system:[{type:"text",text:SYSTEM_PROMPT,cache_control:{type:"ephemeral"}}],
        messages:[{role:"user",content:prompt}],
      }),
    });

    const cd = await cr.json();
    if (cd.error) throw new Error(cd.error.message);
    const text  = cd.content.filter(b=>b.type==="text").map(b=>b.text).join("");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("분석 결과 파싱 실패. 다시 시도해주세요.");

    const analysis = JSON.parse(match[0]);
    return res.status(200).json({
      ...analysis,
      stockInfo: {
        ...analysis.stockInfo,
        name: s.name, ticker: s.ticker, market: s.exchange,
        sector: s.sector, currentPrice: s.currentPriceFmt,
        currency: s.currency, marketCap: s.marketCapFmt,
        yearHigh: s.yearHigh, yearLow: s.yearLow,
      },
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
