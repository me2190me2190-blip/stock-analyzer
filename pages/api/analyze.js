const FMP = "https://financialmodelingprep.com/api/v3";

const SYSTEM_PROMPT = `당신은 기관급 주식 분석 AI입니다. 제공된 실제 재무 데이터를 기반으로 100점 만점 점수를 산출하세요. 웹 검색 없이 주어진 데이터만 사용합니다.

점수 구조 (100점):
[가치 20점] PER(5) PBR(5) PSR(5) EV/EBITDA(5) — 섹터 평균 대비
[성장 20점] 매출성장(5) 영업이익률(5) EPS성장(5) ROE(5)
[재무 20점] 부채비율(5) 유동비율(5) 이자보상배율(5) FCF(5)
[모멘텀 20점] RSI(4) 52주위치(4) 이평선정배열(4) 골든/데드크로스(4) 20일선위치(4)
[업계 20점] 트렌드(8) 경쟁포지션(6) 이슈(6) — 학습 데이터 기반
등급: S≥90 A≥80 B≥70 C≥60 D<60 / null 지표는 neutral 2~3점

JSON만 반환:
{"stockInfo":{"name":"","ticker":"","market":"","sector":"","currentPrice":"","currency":"","marketCap":""},"scores":{"total":0,"objective":0,"industry":0,"breakdown":{"value":0,"growth":0,"financial":0,"momentum":0},"industryBreakdown":{"trend":0,"competitive":0,"issues":0},"grade":"B","rationale":"3~5문장 강점약점업계영향"},"indicators":{"value":[{"name":"PER","value":"","benchmark":"","score":0,"status":"good|neutral|bad","comment":""},{"name":"PBR","value":"","benchmark":"","score":0,"status":"good|neutral|bad","comment":""},{"name":"PSR","value":"","benchmark":"","score":0,"status":"good|neutral|bad","comment":""},{"name":"EV/EBITDA","value":"","benchmark":"","score":0,"status":"good|neutral|bad","comment":""}],"growth":[{"name":"매출 성장률(YoY)","value":"","benchmark":"","score":0,"status":"good|neutral|bad","comment":""},{"name":"영업이익률","value":"","benchmark":"","score":0,"status":"good|neutral|bad","comment":""},{"name":"EPS 성장률","value":"","benchmark":"","score":0,"status":"good|neutral|bad","comment":""},{"name":"ROE","value":"","benchmark":"","score":0,"status":"good|neutral|bad","comment":""}],"financial":[{"name":"부채비율","value":"","benchmark":"","score":0,"status":"good|neutral|bad","comment":""},{"name":"유동비율","value":"","benchmark":"","score":0,"status":"good|neutral|bad","comment":""},{"name":"이자보상배율","value":"","benchmark":"","score":0,"status":"good|neutral|bad","comment":""},{"name":"FCF","value":"","benchmark":"","score":0,"status":"good|neutral|bad","comment":""}],"momentum":[{"name":"RSI(14일)","value":"","benchmark":"40~65","score":0,"status":"good|neutral|bad","comment":""},{"name":"52주 위치","value":"","benchmark":"30~70%","score":0,"status":"good|neutral|bad","comment":""},{"name":"이평선 정배열","value":"","benchmark":"","score":0,"status":"good|neutral|bad","comment":""},{"name":"골든/데드크로스","value":"","benchmark":"","score":0,"status":"good|neutral|bad","comment":""},{"name":"20일선 위치","value":"","benchmark":"0~5%","score":0,"status":"good|neutral|bad","comment":""}]},"industryAnalysis":{"trendScore":0,"competitiveScore":0,"issueScore":0,"trendSummary":"","competitiveSummary":"","issues":[{"type":"positive|negative|neutral","title":"","description":""}]},"priceTargets":{"currentPrice":"숫자만","currency":"USD|KRW","buyZoneLow":"숫자만","buyZoneHigh":"숫자만","targetPrice":"숫자만","stopLoss":"숫자만","upside":"숫자만","basis":"1~2문장"},"precautions":[{"level":"high|medium|low","title":"","description":""}],"outlook":"2~3문장"}`;

const KR_STOCKS = {
  "삼성전자":"005930.KS","sk하이닉스":"000660.KS","hynix":"000660.KS",
  "lg에너지솔루션":"373220.KS","삼성바이오로직스":"207940.KS",
  "현대차":"005380.KS","현대자동차":"005380.KS","기아":"000270.KS",
  "포스코홀딩스":"005490.KS","posco":"005490.KS",
  "삼성sdi":"006400.KS","lg화학":"051910.KS","카카오":"035720.KS",
  "네이버":"035420.KS","셀트리온":"068270.KS","kb금융":"105560.KS",
  "신한지주":"055550.KS","하나금융지주":"086790.KS","우리금융":"316140.KS",
  "삼성물산":"028260.KS","lg전자":"066570.KS","sk이노베이션":"096770.KS",
  "현대모비스":"012330.KS","삼성생명":"032830.KS","sk텔레콤":"017670.KS",
  "kt":"030200.KS","롯데케미칼":"011170.KS","한국전력":"015760.KS",
  "두산에너빌리티":"034020.KS","고려아연":"010130.KS","크래프톤":"259960.KS",
  "카카오뱅크":"323410.KS","카카오페이":"377300.KS","하이브":"352820.KS",
  "엔씨소프트":"036570.KS","넷마블":"251270.KS","펄어비스":"263750.KS",
  "에코프로비엠":"247540.KS","에코프로":"086520.KS","포스코퓨처엠":"003670.KS",
  "lg이노텍":"011070.KS","삼성전기":"009150.KS","삼성에스디에스":"018260.KS",
};

async function resolveTicker(query, apiKey) {
  const q = query.trim();

  // 숫자 6자리 → 한국 코드
  if (/^\d{6}$/.test(q)) return q + ".KS";

  // 영문 티커 형태
  if (/^[A-Z0-9.]{1,12}$/.test(q.toUpperCase())) return q.toUpperCase();

  // 한국 종목명 매핑
  const mapped = KR_STOCKS[q.toLowerCase().replace(/\s/g,"")];
  if (mapped) return mapped;

  // FMP 검색 (영문 검색도 시도)
  const res  = await fetch(`${FMP}/search?query=${encodeURIComponent(q)}&limit=5&apikey=${apiKey}`);
  const data = await res.json();
  if (data?.length) return data[0].symbol;

  throw new Error(`"${q}" 종목을 찾을 수 없습니다. 티커를 직접 입력해보세요. (예: 005930.KS)`);
}

async function fetchFMPData(ticker, apiKey) {
  const [quotes, profiles, ratios, metrics, income] = await Promise.all([
    fetch(`${FMP}/quote/${ticker}?apikey=${apiKey}`).then(r=>r.json()).catch(()=>[]),
    fetch(`${FMP}/profile/${ticker}?apikey=${apiKey}`).then(r=>r.json()).catch(()=>[]),
    fetch(`${FMP}/ratios-ttm/${ticker}?apikey=${apiKey}`).then(r=>r.json()).catch(()=>[]),
    fetch(`${FMP}/key-metrics-ttm/${ticker}?apikey=${apiKey}`).then(r=>r.json()).catch(()=>[]),
    fetch(`${FMP}/income-statement/${ticker}?limit=2&apikey=${apiKey}`).then(r=>r.json()).catch(()=>[]),
  ]);

  // FMP API 키 오류 감지
  if (quotes?.["Error Message"] || quotes?.error) {
    throw new Error(`FMP API 오류: ${quotes["Error Message"] || quotes.error}`);
  }
  if (!Array.isArray(quotes) || quotes.length === 0) {
    throw new Error(`${ticker} 데이터가 없습니다. FMP API 키를 확인해주세요.`);
  }

  const q=quotes?.[0]||{}, p=profiles?.[0]||{}, ra=ratios?.[0]||{}, m=metrics?.[0]||{}, i0=income?.[0]||{}, i1=income?.[1]||{};
  const revGrowth = i0.revenue && i1.revenue ? (((i0.revenue-i1.revenue)/Math.abs(i1.revenue))*100).toFixed(1) : null;
  const pos52w    = q.yearHigh && q.yearLow && q.price ? (((q.price-q.yearLow)/(q.yearHigh-q.yearLow))*100).toFixed(1) : null;

  return {
    ticker,
    name:            p.companyName || q.name || ticker,
    exchange:        p.exchangeShortName || q.exchange || "",
    sector:          p.sector || "",
    currency:        p.currency || (ticker.includes(".KS") ? "KRW" : "USD"),
    currentPrice:    q.price,
    marketCap:       q.marketCap,
    yearHigh:        q.yearHigh,
    yearLow:         q.yearLow,
    priceAvg50:      q.priceAvg50,
    priceAvg200:     q.priceAvg200,
    position52w:     pos52w,
    bullAlignment:   q.priceAvg50 && q.priceAvg200 ? q.priceAvg50 > q.priceAvg200 : null,
    per:             ra.peRatioTTM ?? q.pe,
    pbr:             ra.priceToBookRatioTTM,
    psr:             ra.priceToSalesRatioTTM,
    evEbitda:        m.evToEbitdaTTM ?? m.enterpriseValueOverEBITDA,
    revenueGrowth:   revGrowth,
    operatingMargin: ra.operatingProfitMarginTTM != null ? (ra.operatingProfitMarginTTM*100).toFixed(1) : null,
    epsGrowth:       ra.epsGrowth != null ? (ra.epsGrowth*100).toFixed(1) : null,
    roe:             ra.returnOnEquityTTM  != null ? (ra.returnOnEquityTTM *100).toFixed(1) : null,
    roa:             ra.returnOnAssetsTTM != null ? (ra.returnOnAssetsTTM*100).toFixed(1) : null,
    debtEquity:      ra.debtEquityRatioTTM != null ? (ra.debtEquityRatioTTM*100).toFixed(1) : null,
    currentRatio:    ra.currentRatioTTM,
    interestCoverage:ra.interestCoverageTTM,
    fcf:             m.freeCashFlowPerShareTTM != null ? (m.freeCashFlowPerShareTTM*(q.sharesOutstanding||0)).toFixed(0) : null,
    dividendYield:   ra.dividendYielTTM != null ? (ra.dividendYielTTM*100).toFixed(2) : null,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { query } = req.body || {};
  if (!query?.trim()) return res.status(400).json({ error: "종목을 입력해주세요." });

  try {
    const ticker    = await resolveTicker(query, process.env.FMP_API_KEY);
    const stockData = await fetchFMPData(ticker, process.env.FMP_API_KEY);

    const prompt = `다음 실제 재무 데이터를 기반으로 분석:
종목: ${stockData.name} (${stockData.ticker}) / ${stockData.exchange} / ${stockData.sector}
현재가: ${stockData.currentPrice} ${stockData.currency} | 시총: ${stockData.marketCap}
52주 고: ${stockData.yearHigh} | 저: ${stockData.yearLow} | 현재위치: ${stockData.position52w}%
50일선: ${stockData.priceAvg50} | 200일선: ${stockData.priceAvg200}
배열: ${stockData.bullAlignment === null ? "N/A" : stockData.bullAlignment ? "50일>200일(강세)" : "50일<200일(약세)"}

[가치] PER:${stockData.per??'N/A'} | PBR:${stockData.pbr??'N/A'} | PSR:${stockData.psr??'N/A'} | EV/EBITDA:${stockData.evEbitda??'N/A'} | 배당:${stockData.dividendYield??'0'}%
[성장] 매출성장:${stockData.revenueGrowth??'N/A'}% | 영업이익률:${stockData.operatingMargin??'N/A'}% | EPS성장:${stockData.epsGrowth??'N/A'}% | ROE:${stockData.roe??'N/A'}% | ROA:${stockData.roa??'N/A'}%
[재무] 부채비율:${stockData.debtEquity??'N/A'}% | 유동비율:${stockData.currentRatio??'N/A'} | 이자보상:${stockData.interestCoverage??'N/A'} | FCF:${stockData.fcf??'N/A'}

priceTargets 가격은 ${stockData.currency} 숫자만.`;

    const claudeRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta":    "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-5-20250929",
        max_tokens: 4500,
        system: [{ type:"text", text:SYSTEM_PROMPT, cache_control:{ type:"ephemeral" } }],
        messages: [{ role:"user", content:prompt }],
      }),
    });

    const cd = await claudeRes.json();
    if (cd.error) throw new Error(cd.error.message);

    const text  = cd.content.filter(b=>b.type==="text").map(b=>b.text).join("");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("분석 결과 파싱 실패. 다시 시도해주세요.");

    const analysis = JSON.parse(match[0]);
    return res.status(200).json({ ...analysis, stockInfo: { ...analysis.stockInfo, ...stockData } });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
