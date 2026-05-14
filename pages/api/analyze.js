const SYSTEM_PROMPT = `당신은 기관급 주식 분석 AI입니다. 제공된 KIS API 데이터를 기반으로 분석하되, 누락된 재무지표(ROE·매출성장률·영업이익률·부채비율 등)와 최신 뉴스는 웹서치로 보완하세요.

웹서치 전략 (최대 2회):
1. "{종목명} 재무제표 ROE 영업이익률 부채비율 2024 2025" 검색 → 누락 재무지표 보완
2. "{종목명} 최근 뉴스 이슈 2025" 검색 → 최신 업계 동향·뉴스 반영

중요 규칙:
- KIS API 제공 수치(PER·PBR·EPS·BPS·현재가 등)는 절대 변경하지 마세요
- 웹서치로 찾은 재무지표는 출처를 comment에 "(검색 기반)" 표기
- 찾지 못한 지표만 N/A로 표시
- 가격 목표는 원(KRW) 단위 숫자만, 현재가와 같은 자릿수로

점수 구조 (100점):
[가치 20점] PER(5) PBR(5) PSR(5) EV/EBITDA(5)
[성장 20점] 매출성장(5) 영업이익률(5) EPS성장(5) ROE(5)
[재무 20점] 부채비율(5) 유동비율(5) 이자보상배율(5) FCF(5)
[모멘텀 20점] RSI(4) 52주위치(4) 이평선정배열(4) 골든/데드크로스(4) 20일선위치(4)
[업계 20점] 트렌드(8) 경쟁포지션(6) 이슈(6)
등급: S>=90 A>=80 B>=70 C>=60 D<60

JSON만 반환:
{"stockInfo":{"name":"","ticker":"","market":"","sector":"","currentPrice":"","currency":"","marketCap":""},"scores":{"total":0,"objective":0,"industry":0,"breakdown":{"value":0,"growth":0,"financial":0,"momentum":0},"industryBreakdown":{"trend":0,"competitive":0,"issues":0},"grade":"B","rationale":"3~5문장"},"indicators":{"value":[{"name":"PER","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"PBR","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"PSR","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"EV/EBITDA","value":"","benchmark":"","score":0,"status":"neutral","comment":""}],"growth":[{"name":"매출 성장률(YoY)","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"영업이익률","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"EPS 성장률","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"ROE","value":"","benchmark":"","score":0,"status":"neutral","comment":""}],"financial":[{"name":"부채비율","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"유동비율","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"이자보상배율","value":"","benchmark":"","score":0,"status":"neutral","comment":""},{"name":"FCF","value":"","benchmark":"","score":0,"status":"neutral","comment":""}],"momentum":[{"name":"RSI(14일)","value":"","benchmark":"40~65","score":0,"status":"good","comment":""},{"name":"52주 위치","value":"","benchmark":"30~70%","score":0,"status":"good","comment":""},{"name":"이평선 정배열","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"골든/데드크로스","value":"","benchmark":"","score":0,"status":"good","comment":""},{"name":"20일선 위치","value":"","benchmark":"0~5%","score":0,"status":"good","comment":""}]},"industryAnalysis":{"trendScore":0,"competitiveScore":0,"issueScore":0,"trendSummary":"","competitiveSummary":"","issues":[{"type":"positive","title":"","description":""}]},"priceTargets":{"buyZoneLow":"0","buyZoneHigh":"0","targetPrice":"0","stopLoss":"0","upside":"0","basis":""},"precautions":[{"level":"medium","title":"","description":""}],"outlook":""}`;

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

  const prompt = `다음 KIS API 실제 데이터로 분석하세요. KIS에서 제공하지 않는 지표(ROE·매출성장·영업이익률·부채비율·유동비율 등)는 반드시 웹서치로 찾아서 채워주세요.

종목: ${s.name} (${s.ticker}) / ${s.exchange} / ${s.sector}
현재가: ${s.currentPriceFmt} ${s.currency} | 시총: ${s.marketCapFmt}
52주 고: ${fmtP(s.yearHigh)} | 저: ${fmtP(s.yearLow)} | 현재위치: ${s.position52w}%
50일선: ${fmtP(s.priceAvg50)} | 200일선: ${fmtP(s.priceAvg200)}
배열: ${s.bullAlignment===null?"N/A":s.bullAlignment?"50일>200일(강세)":"50일<200일(약세)"}

[KIS 공식 지표 - 변경 금지]
PER: ${s.per ?? "없음"} | PBR: ${s.pbr ?? "없음"} | EPS: ${s.eps ?? "없음"} | BPS: ${s.bps ?? "없음"} | ROE: ${s.roe ?? "없음"} | 배당: ${s.dividendYield ?? "없음"}

[웹서치로 보완 필요한 지표]
매출성장률, 영업이익률, 부채비율, 유동비율, PSR, EV/EBITDA, FCF, 최신 뉴스·이슈

priceTargets: ${s.currency} 원 단위 숫자. 현재가=${s.currentPrice}(${s.currentPriceFmt}) 기준. 같은 자릿수로.`;

  try {
    const cr = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{"Content-Type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","anthropic-beta":"prompt-caching-2024-07-31"},
      body:JSON.stringify({
        model:"claude-sonnet-4-5-20250929", max_tokens:5000,
        tools:[{ type:"web_search_20250305", name:"web_search" }],
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
