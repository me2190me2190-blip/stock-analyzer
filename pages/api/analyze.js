const SYSTEM_PROMPT = `당신은 기관급 주식 분석 AI입니다. 제공된 실제 API 데이터만 사용하여 분석하세요.

중요 규칙:
- 제공된 데이터에 없는 수치는 절대 추정하거나 생성하지 마세요
- 데이터가 없는 지표는 value를 "N/A"로, status를 "neutral"로, score를 2로 설정하세요
- 가격 목표(priceTargets)는 제공된 현재가·PER·PBR 등 실제 데이터만 활용해 산출하세요
- 뉴스가 있으면 업계 이슈 점수에 반드시 반영하세요

점수 구조 (100점):
[가치 20점] PER(5) PBR(5) PSR(5) EV/EBITDA(5) — 데이터 없으면 각 2점
[성장 20점] 매출성장(5) 영업이익률(5) EPS성장(5) ROE(5) — 데이터 없으면 각 2점
[재무 20점] 부채비율(5) 유동비율(5) 이자보상배율(5) FCF(5) — 데이터 없으면 각 2점
[모멘텀 20점] RSI(4) 52주위치(4) 이평선정배열(4) 골든/데드크로스(4) 20일선위치(4)
[업계 20점] 트렌드(8) 경쟁포지션(6) 이슈(6) — 뉴스 반영
등급: S>=90 A>=80 B>=70 C>=60 D<60

JSON만 반환:
{"stockInfo":{"name":"","ticker":"","market":"","sector":"","currentPrice":"","currency":"","marketCap":""},"scores":{"total":0,"objective":0,"industry":0,"breakdown":{"value":0,"growth":0,"financial":0,"momentum":0},"industryBreakdown":{"trend":0,"competitive":0,"issues":0},"grade":"B","rationale":"3~5문장 (데이터 없는 지표는 N/A임을 명시)"},"indicators":{"value":[{"name":"PER","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"PBR","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"PSR","value":"","benchmark":"","score":0,"status":"neutral","comment":"데이터 없음"},{"name":"EV/EBITDA","value":"","benchmark":"","score":0,"status":"neutral","comment":"데이터 없음"}],"growth":[{"name":"매출 성장률(YoY)","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"영업이익률","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"EPS 성장률","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"ROE","value":"","benchmark":"","score":0,"status":"neutral","comment":""}],"financial":[{"name":"부채비율","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"유동비율","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"이자보상배율","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"FCF","value":"","benchmark":"","score":0,"status":"neutral","comment":""}],"momentum":[{"name":"RSI(14일)","value":"","benchmark":"40~65","score":0,"status":"good","comment":""},{"name":"52주 위치","value":"","benchmark":"30~70%","score":0,"status":"good","comment":""},{"name":"이평선 정배열","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"골든/데드크로스","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"20일선 위치","value":"","benchmark":"0~5%","score":0,"status":"good","comment":""}]},"industryAnalysis":{"trendScore":0,"competitiveScore":0,"issueScore":0,"trendSummary":"","competitiveSummary":"","issues":[{"type":"positive","title":"","description":""}]},"priceTargets":{"buyZoneLow":"0","buyZoneHigh":"0","targetPrice":"0","stopLoss":"0","upside":"0","basis":"실제 데이터 기반 산출 근거"},"precautions":[{"level":"medium","title":"","description":""}],"outlook":""}`;

function jsonRepair(text) {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let s = text.slice(start).replace(/,(\s*[}\]])/g, '$1');
  try { return JSON.parse(s); } catch {}
  // 열린 괄호 추적 후 닫기
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

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { stockData } = req.body || {};
  if (!stockData) return res.status(400).json({ error:"stockData가 없습니다." });

  const s = stockData;
  const isKRW = s.currency==="KRW";
  const fmtP = v => v?(isKRW?`₩${Math.round(v).toLocaleString()}`:`$${parseFloat(v).toFixed(2)}`):"N/A";

  const newsText = s.recentNews?.length
    ? s.recentNews.map(n=>`- [${n.time}] ${n.title} (${n.publisher})`).join("\n")
    : "최근 뉴스 없음";

  const dataSource = s.type==="KR" ? "KIS 공식 API (한국투자증권)" : "Yahoo Finance";

  const prompt = `다음 실제 API 데이터(출처: ${dataSource})로만 분석하세요. 없는 데이터는 추정 금지.

종목: ${s.name} (${s.ticker}) / ${s.exchange} / ${s.sector}
현재가: ${s.currentPriceFmt} ${s.currency} | 시총: ${s.marketCapFmt}
52주 고: ${fmtP(s.yearHigh)} | 저: ${fmtP(s.yearLow)} | 현재위치: ${s.position52w}%
50일선: ${fmtP(s.priceAvg50)} | 200일선: ${fmtP(s.priceAvg200)}
배열: ${s.bullAlignment===null?"N/A":s.bullAlignment?"50일>200일(강세)":"50일<200일(약세)"}

[API 제공 지표]
PER: ${s.per ?? "데이터없음"} | PBR: ${s.pbr ?? "데이터없음"} | EPS: ${s.eps ?? "데이터없음"} | BPS: ${s.bps ?? "데이터없음"} | ROE: ${s.roe ?? "데이터없음"} | 배당: ${s.dividendYield ?? "데이터없음"}

[API 미제공 → value:"N/A" status:"neutral" score:2 필수]
PSR, EV/EBITDA, 매출성장률, 영업이익률, EPS성장률, 부채비율, 유동비율, 이자보상배율, FCF

최근 뉴스 (업계이슈 점수 반영):
${newsText}

priceTargets: ${s.currency} 숫자만, 현재가(${s.currentPrice})·PER(${s.per??'N/A'})·PBR(${s.pbr??'N/A'}) 기반으로만 산출.`;`;

  try {
    const cr = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-beta":"prompt-caching-2024-07-31"},
      body:JSON.stringify({
        model:"claude-sonnet-4-5-20250929", max_tokens:4500,
        system:[{type:"text",text:SYSTEM_PROMPT,cache_control:{type:"ephemeral"}}],
        messages:[{role:"user",content:prompt}],
      }),
    });
    const cd = await cr.json();
    if (cd.error) throw new Error(cd.error.message);
    const text = cd.content.filter(b=>b.type==="text").map(b=>b.text).join("");
    const analysis = jsonRepair(text);
    if (!analysis) throw new Error("분석 결과 파싱 실패. 다시 시도해주세요.");
    return res.status(200).json({
      ...analysis,
      priceTargets: {
        ...analysis.priceTargets,
        currentPrice: String(Math.round(s.currentPrice||0)),
        currency: s.currency,
      },
    });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
