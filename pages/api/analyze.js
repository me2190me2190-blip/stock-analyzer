function jsonRepair(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let s = text.slice(start).replace(/,(\s*[}\]])/g, '$1');
  try { return JSON.parse(s); } catch {}
  let opens=[], inStr=false, esc=false, lastSafe=0;
  for (let i=0;i<s.length;i++) {
    const c=s[i];
    if(esc){esc=false;continue;} if(c==='\\'&&inStr){esc=true;continue;}
    if(c==='"'){inStr=!inStr;continue;} if(inStr)continue;
    if(c==='{'||c==='[')opens.push(c);
    else if(c==='}'||c===']'){opens.pop();if(opens.length===0)lastSafe=i;}
  }
  try { return JSON.parse(s.slice(0,lastSafe+1)); } catch {}
  let t = s.replace(/,\s*"[^"]*"?\s*:\s*[^,}\]]*$/s,'').replace(/,\s*"[^"]*"?\s*$/s,'').replace(/,\s*$/s,'');
  opens=[];inStr=false;esc=false;
  for(const c of t){if(esc){esc=false;continue;}if(c==='\\'&&inStr){esc=true;continue;}if(c==='"'){inStr=!inStr;continue;}if(inStr)continue;if(c==='{'||c==='[')opens.push(c);else if(c==='}'||c===']')opens.pop();}
  const closing=opens.reverse().map(b=>b==='{'?'}':']').join('');
  try { return JSON.parse(t+closing); } catch {}
  return null;
}

// 1단계: 웹서치로 재무데이터 + 뉴스 수집
async function fetchWebData(name, ticker, apiKey) {
  try {
    const searchPrompt = `다음 두 가지를 웹서치로 찾아서 JSON만 반환하세요. 다른 텍스트 없이 JSON만.

1. "${name}" 최신 재무지표 (2024-2025 기준)
2. "${name}" 최근 주요 뉴스·이슈

반환 형식 (숫자는 순수 숫자, 없으면 null):
{"roe": null, "operatingMargin": null, "revenueGrowth": null, "debtToEquity": null, "currentRatio": null, "interestCoverage": null, "psr": null, "evEbitda": null, "news": ["뉴스1", "뉴스2", "뉴스3"]}`;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: searchPrompt }],
      }),
    });
    const d = await r.json();
    if (d.error) return {};
    const text = d.content.filter(b => b.type === "text").map(b => b.text).join("");
    return jsonRepair(text) || {};
  } catch { return {}; }
}

const ANALYSIS_PROMPT = `기관급 주식 분석 AI. 제공된 데이터로 100점 점수 산출.

점수(100점): 가치20(PER5·PBR5·PSR5·EV5) 성장20(매출5·영업5·EPS5·ROE5) 재무20(부채5·유동5·이자5·FCF5) 모멘텀20(RSI4·52주4·정배열4·크로스4·20일4) 업계20(트렌드8·경쟁6·이슈6)
등급: S>=90 A>=80 B>=70 C>=60 D<60. null지표: score=2 status="neutral" value="N/A"

JSON만 반환:
{"stockInfo":{"name":"","ticker":"","market":"","sector":"","currentPrice":"","currency":"","marketCap":""},"scores":{"total":0,"objective":0,"industry":0,"breakdown":{"value":0,"growth":0,"financial":0,"momentum":0},"industryBreakdown":{"trend":0,"competitive":0,"issues":0},"grade":"B","rationale":""},"indicators":{"value":[{"name":"PER","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"PBR","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"PSR","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"EV/EBITDA","value":"","benchmark":"","score":0,"status":"neutral","comment":""}],"growth":[{"name":"매출 성장률(YoY)","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"영업이익률","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"EPS 성장률","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"ROE","value":"","benchmark":"","score":0,"status":"neutral","comment":""}],"financial":[{"name":"부채비율","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"유동비율","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"이자보상배율","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"FCF","value":"","benchmark":"","score":0,"status":"neutral","comment":""}],"momentum":[{"name":"RSI(14일)","value":"","benchmark":"40~65","score":0,"status":"good","comment":""},{"name":"52주 위치","value":"","benchmark":"30~70%","score":0,"status":"good","comment":""},{"name":"이평선 정배열","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"골든/데드크로스","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"20일선 위치","value":"","benchmark":"0~5%","score":0,"status":"good","comment":""}]},"industryAnalysis":{"trendScore":0,"competitiveScore":0,"issueScore":0,"trendSummary":"","competitiveSummary":"","issues":[{"type":"positive","title":"","description":""}]},"priceTargets":{"buyZoneLow":"0","buyZoneHigh":"0","targetPrice":"0","stopLoss":"0","upside":"0","basis":""},"precautions":[{"level":"medium","title":"","description":""}],"outlook":""}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { stockData } = req.body || {};
  if (!stockData) return res.status(400).json({ error: "stockData가 없습니다." });

  const s = stockData;
  const isKRW = s.currency === "KRW";
  const fmtP = v => v ? (isKRW ? `₩${Math.round(v).toLocaleString()}` : `$${parseFloat(v).toFixed(2)}`) : "N/A";

  try {
    // 1단계: 웹서치로 재무데이터 수집
    const webData = await fetchWebData(s.name, s.ticker, process.env.ANTHROPIC_API_KEY);

    // KIS + 웹서치 데이터 병합
    const merged = {
      per:             s.per,
      pbr:             s.pbr,
      eps:             s.eps,
      bps:             s.bps,
      roe:             s.roe             ?? webData.roe,
      operatingMargin: s.operatingMargin  ?? webData.operatingMargin,
      revenueGrowth:   s.revenueGrowth    ?? webData.revenueGrowth,
      debtEquity:      s.debtEquity       ?? webData.debtToEquity,
      currentRatio:    s.currentRatio     ?? webData.currentRatio,
      interestCoverage: webData.interestCoverage,
      psr:             webData.psr,
      evEbitda:        webData.evEbitda,
      dividendYield:   s.dividendYield,
    };

    const newsText = webData.news?.length
      ? webData.news.map(n => `- ${n}`).join("\n")
      : (s.recentNews?.length ? s.recentNews.map(n => `- [${n.time}] ${n.title}`).join("\n") : "없음");

    // 2단계: Claude 분석
    const prompt = `다음 데이터로 분석하세요.

종목: ${s.name} (${s.ticker}) / ${s.exchange} / ${s.sector}
현재가: ${s.currentPriceFmt} ${s.currency} | 시총: ${s.marketCapFmt}
52주 고: ${fmtP(s.yearHigh)} | 저: ${fmtP(s.yearLow)} | 현재위치: ${s.position52w}%
50일선: ${fmtP(s.priceAvg50)} | 200일선: ${fmtP(s.priceAvg200)}
배열: ${s.bullAlignment===null?"N/A":s.bullAlignment?"50일>200일(강세)":"50일<200일(약세)"}

[재무지표]
PER: ${merged.per??'N/A'} | PBR: ${merged.pbr??'N/A'} | PSR: ${merged.psr??'N/A'} | EV/EBITDA: ${merged.evEbitda??'N/A'}
매출성장: ${merged.revenueGrowth??'N/A'}% | 영업이익률: ${merged.operatingMargin??'N/A'}% | ROE: ${merged.roe??'N/A'}%
부채비율: ${merged.debtEquity??'N/A'} | 유동비율: ${merged.currentRatio??'N/A'} | 이자보상: ${merged.interestCoverage??'N/A'}
EPS: ${merged.eps??'N/A'} | BPS: ${merged.bps??'N/A'} | 배당: ${merged.dividendYield??'N/A'}%

[최근 뉴스·이슈]
${newsText}

priceTargets: ${s.currency} 원 단위. 현재가=${s.currentPrice}(${s.currentPriceFmt}).`;

    const cr = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 5000,
        system: [{ type: "text", text: ANALYSIS_PROMPT, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const cd = await cr.json();
    if (cd.error) throw new Error(cd.error.message);
    const text = cd.content.filter(b => b.type === "text").map(b => b.text).join("");
    const analysis = jsonRepair(text);
    if (!analysis) throw new Error("분석 결과 파싱 실패. 다시 시도해주세요.");

    return res.status(200).json({
      ...analysis,
      priceTargets: {
        ...analysis.priceTargets,
        currentPrice: String(Math.round(s.currentPrice || 0)),
        currency: s.currency,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
