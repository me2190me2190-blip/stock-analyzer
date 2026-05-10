import { useState, useEffect } from "react";

const L={bg:"#F0F5FF",card:"#FFF",cardBorder:"#E0E8F5",shadow:"0 2px 8px rgba(37,99,235,.07),0 1px 3px rgba(0,0,0,.05)",accent:"#2563EB",accentBg:"#EFF6FF",accentBorder:"#BFDBFE",text:"#0F172A",textSub:"#475569",textFaint:"#94A3B8",mono:"#1D4ED8",track:"#E2E8F0",inputBg:"#F8FAFC",inputBorder:"#CBD5E1",tableHead:"#F1F5F9",divider:"#EEF2FA",pos:"#059669",posBg:"#ECFDF5",posBdr:"#A7F3D0",neg:"#DC2626",negBg:"#FEF2F2",negBdr:"#FECACA",warn:"#D97706",warnBg:"#FFFBEB",warnBdr:"#FDE68A",neu:"#64748B",neuBg:"#F1F5F9",neuBdr:"#CBD5E1"};
const D={bg:"#07090E",card:"#0D1219",cardBorder:"#1A2535",shadow:"none",accent:"#38BDF8",accentBg:"#051219",accentBorder:"#0C2A3C",text:"#F1F5F9",textSub:"#A8B5C5",textFaint:"#6B7280",mono:"#38BDF8",track:"#1A2535",inputBg:"#0D1219",inputBorder:"#1A2535",tableHead:"#060A10",divider:"#1A2535",pos:"#34D399",posBg:"#022C22",posBdr:"#064E3B",neg:"#F87171",negBg:"#1C0404",negBdr:"#7F1D1D",warn:"#FBBF24",warnBg:"#1C1000",warnBdr:"#92400E",neu:"#94A3B8",neuBg:"#111827",neuBdr:"#1F2937"};
const GC={light:{S:{c:"#7C3AED",bg:"#F5F3FF",tx:"#4C1D95",bd:"#C4B5FD",d:"최우량"},A:{c:"#059669",bg:"#ECFDF5",tx:"#064E3B",bd:"#6EE7B7",d:"우량"},B:{c:"#D97706",bg:"#FFFBEB",tx:"#78350F",bd:"#FCD34D",d:"양호"},C:{c:"#EA580C",bg:"#FFF7ED",tx:"#7C2D12",bd:"#FDBA74",d:"보통"},D:{c:"#DC2626",bg:"#FEF2F2",tx:"#7F1D1D",bd:"#FCA5A5",d:"주의"}},dark:{S:{c:"#8B5CF6",bg:"#1E0A3C",tx:"#DDD6FE",bd:"#5B21B6",d:"최우량"},A:{c:"#10B981",bg:"#022C22",tx:"#A7F3D0",bd:"#065F46",d:"우량"},B:{c:"#F59E0B",bg:"#1C1400",tx:"#FDE68A",bd:"#92400E",d:"양호"},C:{c:"#F97316",bg:"#1C0A00",tx:"#FFEDD5",bd:"#9A3412",d:"보통"},D:{c:"#EF4444",bg:"#200606",tx:"#FECACA",bd:"#991B1B",d:"주의"}}};
const CAT=[{key:"value",label:"가치 지표",max:20,color:"#2563EB"},{key:"growth",label:"성장성",max:20,color:"#059669"},{key:"financial",label:"재무건전성",max:20,color:"#7C3AED"},{key:"momentum",label:"기술적 모멘텀",max:20,color:"#D97706"}];
const IND=[{key:"value",label:"가치 지표",color:"#2563EB"},{key:"growth",label:"성장성 지표",color:"#059669"},{key:"financial",label:"재무건전성",color:"#7C3AED"},{key:"momentum",label:"기술적 모멘텀·이평선",color:"#D97706"}];

function Ring({score,grade,dark}){const g=GC[dark?"dark":"light"][grade]||GC[dark?"dark":"light"].C;const r=72,c2=2*Math.PI*r,f=(score/100)*c2;return(<div style={{position:"relative",width:190,height:190,margin:"0 auto"}}><svg width="190" height="190" style={{transform:"rotate(-90deg)"}}><circle cx="95" cy="95" r={r} fill="none" stroke={dark?"#1A2535":"#E2E8F0"} strokeWidth="12"/><circle cx="95" cy="95" r={r} fill="none" stroke={g.c} strokeWidth="12" strokeDasharray={c2} strokeDashoffset={c2-f} strokeLinecap="round" style={{filter:`drop-shadow(0 0 8px ${g.c}60)`,transition:"stroke-dashoffset 1.4s cubic-bezier(.4,0,.2,1)"}}/></svg><div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:44,fontWeight:800,color:dark?"#F1F5F9":"#0F172A",fontFamily:"'IBM Plex Mono',monospace",lineHeight:1}}>{score}</span><span style={{fontSize:9,color:dark?"#4B5563":"#94A3B8",letterSpacing:2,marginTop:2}}>/100점</span><span style={{marginTop:7,background:g.bg,color:g.tx,border:`1px solid ${g.bd}`,padding:"3px 12px",borderRadius:20,fontSize:11,fontWeight:700}}>{grade}등급·{g.d}</span></div></div>);}
function Bar({label,score,max,color,T}){return(<div style={{marginBottom:11}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:T.textSub}}>{label}</span><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:700,color}}>{score}<span style={{color:T.textFaint,fontWeight:400}}>/{max}</span></span></div><div style={{height:5,background:T.track,borderRadius:3,overflow:"hidden"}}><div style={{width:`${(score/max)*100}%`,height:"100%",background:color,borderRadius:3,transition:"width 1.2s cubic-bezier(.4,0,.2,1)"}}/></div></div>);}
function Dots({score,max,T}){const p=score/max,c=p>=.8?T.pos:p>=.5?T.warn:T.neg;return <div style={{display:"inline-flex",gap:3}}>{Array.from({length:max}).map((_,i)=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:i<score?c:T.track}}/>)}</div>;}
function Bdg({status,T}){const m={good:{l:"양호",c:T.pos,bg:T.posBg,b:T.posBdr},neutral:{l:"중립",c:T.neu,bg:T.neuBg,b:T.neuBdr},bad:{l:"주의",c:T.neg,bg:T.negBg,b:T.negBdr}};const c=m[status]||m.neutral;return <span style={{background:c.bg,border:`1px solid ${c.b}`,color:c.c,padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:600}}>{c.l}</span>;}
function ICard({type,title,description,T}){const m={positive:{i:"▲",c:T.pos,bg:T.posBg,b:T.posBdr},negative:{i:"▼",c:T.neg,bg:T.negBg,b:T.negBdr},neutral:{i:"◆",c:T.neu,bg:T.neuBg,b:T.neuBdr}};const c=m[type]||m.neutral;return <div style={{background:c.bg,border:`1px solid ${c.b}`,borderRadius:8,padding:"11px 13px",marginBottom:7}}><div style={{display:"flex",gap:7,marginBottom:4}}><span style={{color:c.c,fontSize:11,fontWeight:700}}>{c.i}</span><span style={{fontSize:12,fontWeight:700,color:c.c}}>{title}</span></div><p style={{fontSize:12,color:T.textSub,margin:0,lineHeight:1.6}}>{description}</p></div>;}
function PCard({level,title,description,T}){const m={high:{i:"⚠",c:T.neg,bg:T.negBg,b:T.negBdr,l:"높음"},medium:{i:"◉",c:T.warn,bg:T.warnBg,b:T.warnBdr,l:"중간"},low:{i:"◎",c:T.accent,bg:T.accentBg,b:T.accentBorder,l:"낮음"}};const c=m[level]||m.low;return <div style={{background:c.bg,border:`1px solid ${c.b}`,borderRadius:9,padding:"13px 15px",marginBottom:9}}><div style={{display:"flex",gap:7,alignItems:"center",marginBottom:6}}><span style={{color:c.c}}>{c.i}</span><span style={{fontWeight:700,fontSize:13,color:c.c,flex:1}}>{title}</span><span style={{fontSize:9,color:c.c,background:`${c.c}18`,border:`1px solid ${c.c}40`,padding:"1px 8px",borderRadius:20}}>위험 {c.l}</span></div><p style={{fontSize:12,color:T.textSub,margin:0,lineHeight:1.65}}>{description}</p></div>;}

export default function StockAnalyzer() {
  const [dark,      setDark]     = useState(false);
  const [query,     setQuery]    = useState("");
  const [phase,     setPhase]    = useState("");
  const [stockData, setStockData]= useState(null);
  const [result,    setResult]   = useState(null);
  const [error,     setError]    = useState(null);
  const [tab,       setTab]      = useState("indicators");
  const [favorites, setFavorites]= useState([]);

  useEffect(() => {
    try { setFavorites(JSON.parse(localStorage.getItem("stock_favorites")||"[]")); } catch {}
  }, []);

  const addFav = () => {
    if (!stockData) return;
    const item = { name: stockData.name, query: stockData.ticker };
    setFavorites(prev => {
      if (prev.some(f=>f.query===item.query)) return prev;
      const next = [...prev, item];
      localStorage.setItem("stock_favorites", JSON.stringify(next));
      return next;
    });
  };
  const removeFav = (q) => {
    setFavorites(prev => {
      const next = prev.filter(f=>f.query!==q);
      localStorage.setItem("stock_favorites", JSON.stringify(next));
      return next;
    });
  };
  const runFav = (q) => { setQuery(q); };
  const T = dark ? D : L;
  const card = (e={}) => ({background:T.card,border:`1px solid ${T.cardBorder}`,borderRadius:12,padding:20,boxShadow:T.shadow,...e});

  const analyze = async () => {
    if (!query.trim() || phase) return;
    setError(null); setResult(null); setStockData(null); setTab("indicators");

    try {
      // ── 1단계: Yahoo Finance 데이터 (빠름, ~1초)
      setPhase("stock");
      const r1   = await fetch("/api/stock", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query})});
      const sd   = await r1.json();
      if (!r1.ok) throw new Error(sd.error || "데이터 수집 실패");
      setStockData(sd); // ← 주식 정보 카드 즉시 표시

      // ── 2단계: Claude 분석 (느림, ~8초)
      setPhase("ai");
      const r2   = await fetch("/api/analyze", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({stockData:sd})});
      const analysis = await r2.json();
      if (!r2.ok) throw new Error(analysis.error || "AI 분석 실패");
      setResult(analysis);
    } catch(e) { setError(e.message); }
    finally { setPhase(""); }
  };

  const r=result, s=r?.scores||{}, info=stockData||{}, bd=s.breakdown||{}, ibd=s.industryBreakdown||{};
  const loading = !!phase;
  const TABS=[{id:"indicators",label:"지표 상세"},{id:"industry",label:"업계 동향"},{id:"precautions",label:"유의사항"}];
  const isKRW=info.currency==="KRW";
  const fmt=v=>{if(!v||isNaN(v))return"-";const n=parseFloat(v);return isKRW?`₩${Math.round(n).toLocaleString()}`:`$${parseFloat(n).toFixed(2)}`;};
  const fmtCap=v=>{if(!v)return"-";if(isKRW)return`${(v/1e12).toFixed(1)}조원`;if(v>=1e12)return`$${(v/1e12).toFixed(2)}T`;return`$${(v/1e9).toFixed(1)}B`;};

  return (
    <div style={{minHeight:"100vh",background:T.bg,color:T.text,fontFamily:"'Sora',sans-serif",padding:"22px 16px",transition:"background .3s"}}>
      <style>{`*{box-sizing:border-box;}input::placeholder{color:${T.textFaint};}input:focus{outline:none;border-color:${T.accent}!important;}button{cursor:pointer;}button:hover:not(:disabled){opacity:.85;}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}.fade-1{animation:fadeUp .5s ease both}.fade-2{animation:fadeUp .5s .1s ease both}.fade-3{animation:fadeUp .5s .2s ease both}.fade-4{animation:fadeUp .5s .3s ease both}.fade-5{animation:fadeUp .5s .4s ease both}.fade-6{animation:fadeUp .5s .5s ease both}`}</style>
      <div style={{maxWidth:880,margin:"0 auto"}}>

        <div style={{display:"flex",alignItems:"center",gap:12,paddingBottom:18,marginBottom:22,borderBottom:`1px solid ${T.cardBorder}`}}>
          <div style={{width:32,height:32,background:T.accent,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:"#fff",fontWeight:800}}>◈</div>
          <div><h1 style={{fontSize:18,fontWeight:700,letterSpacing:-.3}}>주식 분석기</h1><p style={{fontSize:10,color:T.textFaint,marginTop:1}}>KIS 실시간 데이터 · Claude AI · 미국 & 한국 주식</p></div>
          <div style={{marginLeft:"auto",display:"flex",background:T.neuBg,border:`1px solid ${T.neuBdr}`,borderRadius:7,padding:2,gap:2}}>
            {[{v:false,i:"☀️",l:"라이트"},{v:true,i:"🌙",l:"다크"}].map(o=>(
              <button key={o.l} onClick={()=>setDark(o.v)} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",borderRadius:5,fontSize:11,fontWeight:600,fontFamily:"'Sora',sans-serif",border:"none",background:dark===o.v?T.card:T.neuBg,color:dark===o.v?T.text:T.textFaint,boxShadow:dark===o.v?"0 1px 3px rgba(0,0,0,.1)":"none",transition:"all .2s"}}>
                <span>{o.i}</span>{o.l}
              </button>
            ))}
          </div>
        </div>

        {/* 즐겨찾기 목록 */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:11,color:T.textFaint,marginBottom:8,fontWeight:600}}>⭐ 즐겨찾기</div>
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            {favorites.length===0 && (
              <span style={{fontSize:11,color:T.textFaint}}>분석 후 ☆ 버튼으로 저장하세요</span>
            )}
            {favorites.map(f=>(
              <div key={f.query} style={{display:"flex",alignItems:"center",gap:3,background:T.accentBg,border:`1px solid ${T.accentBorder}`,borderRadius:20,padding:"5px 8px 5px 13px",cursor:"pointer"}}
                onClick={()=>setQuery(f.query)}>
                <span style={{fontSize:12,color:T.accent,fontWeight:600}}>{f.name.length>8?f.name.slice(0,8)+"…":f.name}</span>
                <button onClick={e=>{e.stopPropagation();removeFav(f.query);}}
                  style={{background:"none",border:"none",color:T.textFaint,fontSize:16,lineHeight:1,padding:"0 4px",cursor:"pointer"}}>×</button>
              </div>
            ))}
          </div>
        </div>

        {/* 검색창 */}
        <div style={{display:"flex",gap:8,marginBottom:24}}>
          <div style={{flex:1,position:"relative"}}>
            <input style={{width:"100%",padding:"13px 16px 13px 44px",background:T.inputBg,border:`1px solid ${T.inputBorder}`,borderRadius:9,color:T.text,fontSize:14,fontFamily:"'Sora',sans-serif",transition:"all .2s"}}
              placeholder="종목명 또는 티커  (예: 삼성전자, NVDA, 005930, AAPL)"
              value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&analyze()}/>
            <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",fontSize:15,color:T.textFaint,pointerEvents:"none"}}>⌕</span>
          </div>
          <button onClick={analyze} disabled={loading} style={{padding:"13px 24px",background:loading?T.neuBg:T.accent,border:"none",borderRadius:9,color:loading?T.textFaint:"#fff",fontWeight:700,fontSize:13,fontFamily:"'Sora',sans-serif",whiteSpace:"nowrap",boxShadow:loading?"none":`0 2px 8px ${T.accent}40`}}>
            {loading?"분석 중…":"분석 →"}
          </button>
        </div>

        {phase==="stock"&&<div style={{...card(),padding:"28px 24px",textAlign:"center"}}><div style={{width:36,height:36,border:`3px solid ${T.accentBorder}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 12px"}}/><div style={{fontSize:14,fontWeight:700,color:T.accent}}>주식 데이터 수집 중...</div></div>}

        {/* 1단계 완료: 주식 정보 카드 즉시 표시 */}
        {stockData && (
          <div className="fade-1" style={{display:"flex",gap:12,marginBottom:12,flexWrap:"wrap"}}>
            <div style={{...card(),flex:"1 1 280px"}}>
              <div style={{fontSize:9,color:T.textFaint,letterSpacing:2,marginBottom:10}}>STOCK INFO</div>
              <div style={{fontSize:20,fontWeight:700,marginBottom:9,lineHeight:1.3}}>{info.name}</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
                <span style={{background:T.accentBg,color:T.accent,border:`1px solid ${T.accentBorder}`,padding:"2px 9px",borderRadius:5,fontSize:10,fontWeight:700}}>{info.ticker}</span>
                <span style={{background:T.neuBg,color:T.neu,border:`1px solid ${T.neuBdr}`,padding:"2px 9px",borderRadius:5,fontSize:10}}>{info.exchange}</span>
                <span style={{background:T.posBg,color:T.pos,border:`1px solid ${T.posBdr}`,padding:"2px 9px",borderRadius:5,fontSize:10}}>{info.sector}</span>
              </div>
              <div style={{fontSize:28,fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",color:T.accent,marginBottom:3}}>
                {info.currentPriceFmt || (info.currentPrice ? fmt(info.currentPrice) : "—")}
              </div>
              <div style={{fontSize:11,color:T.textSub,marginBottom:10}}>시가총액 · {fmtCap(info.marketCap)}</div>
              <div style={{display:"flex",gap:16,alignItems:"center",marginTop:4}}>
                <div style={{fontSize:10,color:T.textFaint}}>52주 고 <span style={{color:T.neg,fontWeight:600}}>{info.yearHighFmt}</span></div>
                <div style={{fontSize:10,color:T.textFaint}}>52주 저 <span style={{color:T.pos,fontWeight:600}}>{info.yearLowFmt}</span></div>
              </div>
              <button onClick={addFav}
                style={{marginTop:14,width:"100%",padding:"10px",borderRadius:8,border:`2px solid ${favorites.some(f=>f.query===info.ticker)?T.warnBdr:T.accentBorder}`,background:favorites.some(f=>f.query===info.ticker)?T.warnBg:T.accentBg,color:favorites.some(f=>f.query===info.ticker)?T.warn:T.accent,fontWeight:700,fontSize:13,fontFamily:"'Sora',sans-serif",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <span style={{fontSize:16}}>{favorites.some(f=>f.query===info.ticker)?"⭐":"☆"}</span>
                {favorites.some(f=>f.query===info.ticker)?"즐겨찾기 저장됨":"즐겨찾기에 추가"}
              </button>
            </div>
            {/* 2단계 로딩 중이면 AI 분석 대기 표시 */}
            {phase==="ai" && (
              <div style={{...card(),flex:"1 1 230px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
                <div style={{width:36,height:36,border:`3px solid ${T.accentBorder}`,borderTopColor:T.accent,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
                <div style={{textAlign:"center"}}>
                  <div style={{fontSize:13,fontWeight:700,color:T.accent,marginBottom:4}}>AI 분석 중...</div>
                  <div style={{fontSize:11,color:T.textFaint}}>점수 산출 & 리포트 생성</div>
                </div>
              </div>
            )}
            {/* 2단계 완료: 점수 카드 */}
            {r && (
              <div className="fade-2" style={{...card(),flex:"1 1 230px",display:"flex",flexDirection:"column"}}>
                <div style={{fontSize:9,color:T.textFaint,letterSpacing:2,marginBottom:14}}>TOTAL SCORE</div>
                <Ring score={s.total} grade={s.grade} dark={dark}/>
                <div style={{marginTop:16,display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                  <div style={{background:T.accentBg,border:`1px solid ${T.accentBorder}`,borderRadius:7,padding:"9px 10px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",color:T.accent}}>{s.objective}</div><div style={{fontSize:9,color:T.textFaint,marginTop:1}}>객관 /80</div></div>
                  <div style={{background:T.posBg,border:`1px solid ${T.posBdr}`,borderRadius:7,padding:"9px 10px",textAlign:"center"}}><div style={{fontSize:20,fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",color:T.pos}}>{s.industry}</div><div style={{fontSize:9,color:T.textFaint,marginTop:1}}>업계 /20</div></div>
                </div>
              </div>
            )}
          </div>
        )}

        {error&&<div style={{...card(),borderColor:T.negBdr,background:T.negBg,marginBottom:14}}><div style={{color:T.neg,fontWeight:700,marginBottom:4}}>✕ 오류</div><div style={{color:T.textSub,fontSize:13}}>{error}</div></div>}

        {r&&(()=>{
          const pt=r.priceTargets||{};
          const cur=parseFloat(info.currentPrice)||0; // 실제 데이터 사용
          const sl=parseFloat(pt.stopLoss)||0,bL=parseFloat(pt.buyZoneLow)||0,bH=parseFloat(pt.buyZoneHigh)||0,tgt=parseFloat(pt.targetPrice)||0;
          const allP=[sl,bL,cur,tgt].filter(Boolean),minP=Math.min(...allP)*.97,maxP=Math.max(...allP)*1.03;
          const pct=v=>`${Math.max(0,Math.min(100,((v-minP)/(maxP-minP))*100)).toFixed(1)}%`;
          return(<>
            <div className="fade-2" style={{...card(),marginBottom:12}}>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(280px, 1fr))",gap:"16px 36px"}}>
                <div><div style={{fontSize:9,color:T.textFaint,letterSpacing:2,marginBottom:12}}>객관적 지표 (80점)</div>{CAT.map(c=><Bar key={c.key} label={c.label} score={bd[c.key]??0} max={c.max} color={c.color} T={T}/>)}</div>
                <div><div style={{fontSize:9,color:T.textFaint,letterSpacing:2,marginBottom:12}}>업계동향 & 이슈 (20점)</div>
                  <Bar label="업계 성장성/트렌드" score={ibd.trend??0} max={8} color={T.pos} T={T}/>
                  <Bar label="경쟁 포지션/해자" score={ibd.competitive??0} max={6} color={T.pos} T={T}/>
                  <Bar label="최근 이슈 반영" score={ibd.issues??0} max={6} color={T.pos} T={T}/>
                </div>
              </div>
            </div>

            <div className="fade-3" style={{...card(),marginBottom:12,background:dark?"#060E1C":T.accentBg,borderColor:dark?"#0F2040":T.accentBorder}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}><div style={{width:3,height:14,background:T.accent,borderRadius:2}}/><span style={{fontSize:9,color:T.accent,letterSpacing:2,fontWeight:700}}>점수 산정 근거</span></div>
              <p style={{fontSize:13,color:T.text,lineHeight:1.8}}>{s.rationale}</p>
            </div>

            <div className="fade-4" style={{...card(),marginBottom:12}}><div style={{display:"flex",alignItems:"flex-start",gap:7,marginBottom:16}}><div style={{width:3,height:14,background:T.warn,borderRadius:2,marginTop:2,flexShrink:0}}/><span style={{fontSize:9,color:T.warn,letterSpacing:2,fontWeight:700,flexShrink:0}}>가격 목표</span>{pt.basis&&<span style={{marginLeft:"auto",fontSize:10,color:T.textFaint,maxWidth:320,textAlign:"right",lineHeight:1.6}}>{pt.basis}</span>}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))",gap:8,marginBottom:20}}>
                {[{label:"손절가",v:sl,c:T.neg,bg:T.negBg,b:T.negBdr,i:"▼",sub:null},{label:"매수존",v:null,c:T.pos,bg:T.posBg,b:T.posBdr,i:"◎",sub:`${fmt(bL)}~${fmt(bH)}`},{label:"현재가",v:cur,c:T.accent,bg:T.accentBg,b:T.accentBorder,i:"◆",sub:null},{label:"목표주가",v:tgt,c:T.warn,bg:T.warnBg,b:T.warnBdr,i:"▲",sub:pt.upside?`+${pt.upside}%`:null}].map(b=>(
                  <div key={b.label} style={{background:b.bg,border:`1px solid ${b.b}`,borderRadius:9,padding:"11px 12px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:b.c,fontWeight:700,letterSpacing:1,marginBottom:5}}>{b.i} {b.label}</div>
                    <div style={{fontSize:b.sub&&!b.v?10:14,fontWeight:800,fontFamily:"'IBM Plex Mono',monospace",color:b.c,lineHeight:1.3}}>{b.sub&&!b.v?b.sub:fmt(b.v)}</div>
                    {b.sub&&b.v&&<div style={{fontSize:9,color:T.pos,marginTop:3,fontWeight:600}}>{b.sub}</div>}
                  </div>
                ))}
              </div>
              <div style={{position:"relative",height:20,marginBottom:3}}>
                <div style={{position:"absolute",top:"50%",left:0,right:0,height:4,background:T.track,borderRadius:2,transform:"translateY(-50%)"}}>
                  {bL&&bH&&<div style={{position:"absolute",left:pct(bL),width:`calc(${pct(bH)} - ${pct(bL)})`,height:"100%",background:`${T.pos}40`,borderRadius:2}}/>}
                </div>
                {[{v:sl,c:T.neg},{v:bL,c:T.pos},{v:bH,c:T.pos},{v:cur,c:T.accent},{v:tgt,c:T.warn}].filter(m=>m.v>0).map((m,i)=>(
                  <div key={i} style={{position:"absolute",left:pct(m.v),transform:"translateX(-50%)",top:"50%",marginTop:-5}}>
                    <div style={{width:10,height:10,borderRadius:"50%",background:m.c,border:`2px solid ${dark?"#07090E":"#fff"}`,boxShadow:`0 0 4px ${m.c}80`}}/>
                  </div>
                ))}
              </div>
              <div style={{position:"relative",height:14}}>
                {[{v:sl,c:T.neg,l:"손절"},{v:cur,c:T.accent,l:"현재"},{v:tgt,c:T.warn,l:"목표"}].filter(m=>m.v>0).map((m,i)=>(
                  <span key={i} style={{position:"absolute",left:pct(m.v),transform:"translateX(-50%)",fontSize:8,color:m.c,fontWeight:700}}>{m.l}</span>
                ))}
              </div>
            </div>

            <div className="fade-5" style={{display:"flex",gap:5,marginBottom:12,flexWrap:"wrap"}}>
              {TABS.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{padding:"8px 18px",borderRadius:7,fontSize:12,border:`1px solid ${tab===t.id?T.accent:T.cardBorder}`,background:tab===t.id?T.accentBg:T.card,color:tab===t.id?T.accent:T.textSub,fontFamily:"'Sora',sans-serif",fontWeight:500,transition:"all .2s"}}>{t.label}</button>)}
            </div>

            {tab==="indicators"&&<div className="fade-6" style={card()}>{IND.map(g=>(<div key={g.key} style={{marginBottom:24}}><div style={{display:"flex",alignItems:"center",gap:7,marginBottom:10}}><div style={{width:3,height:11,background:g.color,borderRadius:2}}/><span style={{fontSize:9,color:g.color,letterSpacing:2,fontWeight:700}}>{g.label.toUpperCase()}</span></div><div style={{display:"grid",gridTemplateColumns:"1.8fr 0.9fr 1.5fr 55px 65px",gap:7,padding:"6px 9px",background:T.tableHead,borderRadius:5,marginBottom:2}}>{["지표명","수치","벤치마크","점수","평가"].map(h=><span key={h} style={{fontSize:9,color:T.textFaint,fontWeight:600}}>{h}</span>)}</div>{r.indicators?.[g.key]?.map((ind,i)=>(<div key={i} style={{display:"grid",gridTemplateColumns:"1.8fr 0.9fr 1.5fr 55px 65px",gap:7,padding:"10px 9px",borderBottom:`1px solid ${T.divider}`,alignItems:"center"}}><div><div style={{fontSize:12,fontWeight:500}}>{ind.name}</div><div style={{fontSize:10,color:T.textFaint,marginTop:1}}>{ind.comment}</div></div><div style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:12,fontWeight:700,color:ind.status==="good"?T.pos:ind.status==="bad"?T.neg:T.textSub}}>{ind.value}</div><div style={{fontSize:10,color:T.textFaint,lineHeight:1.4}}>{ind.benchmark}</div><Dots score={ind.score??0} max={5} T={T}/><Bdg status={ind.status} T={T}/></div>))}</div>))}</div>}

            {tab==="industry"&&<div className="fade-6" style={card()}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))",gap:12,marginBottom:16}}>{[{label:"업계 성장성/트렌드",score:ibd.trend,max:8,text:r.industryAnalysis?.trendSummary},{label:"경쟁 포지션/해자",score:ibd.competitive,max:6,text:r.industryAnalysis?.competitiveSummary}].map(item=>(<div key={item.label} style={{background:T.posBg,border:`1px solid ${T.posBdr}`,borderRadius:9,padding:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:9}}><span style={{fontSize:9,color:T.pos,letterSpacing:1.5,fontWeight:700}}>{item.label}</span><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:14,fontWeight:700,color:T.pos}}>{item.score}<span style={{fontSize:10,color:T.textFaint}}>/{item.max}</span></span></div><p style={{fontSize:12,color:T.textSub,lineHeight:1.65,margin:0}}>{item.text}</p></div>))}</div><div style={{marginBottom:16}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:9,color:T.textFaint,letterSpacing:2,fontWeight:700}}>최근 주요 이슈</span><span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:700,color:T.warn}}>{ibd.issues}<span style={{fontSize:10,color:T.textFaint}}>/6</span></span></div>{r.industryAnalysis?.issues?.map((issue,i)=><ICard key={i} {...issue} T={T}/>)}</div><div style={{background:T.tableHead,border:`1px solid ${T.divider}`,borderRadius:9,padding:14}}><div style={{fontSize:9,color:T.textFaint,letterSpacing:2,marginBottom:8,fontWeight:700}}>향후 전망 (3~6개월)</div><p style={{fontSize:12,color:T.textSub,lineHeight:1.7,margin:0}}>{r.outlook}</p></div></div>}

            {tab==="precautions"&&<div className="fade-6" style={card()}><div style={{fontSize:9,color:T.textFaint,letterSpacing:2,marginBottom:14,fontWeight:700}}>투자 유의사항</div>{r.precautions?.map((p2,i)=><PCard key={i} {...p2} T={T}/>)}<div style={{marginTop:16,background:T.tableHead,borderRadius:7,padding:"11px 14px",fontSize:10,color:T.textFaint,textAlign:"center",lineHeight:1.8}}>※ 본 분석은 AI 참고 정보이며 투자 권유가 아닙니다.</div></div>}
          </>);
        })()}

        {!phase&&!stockData&&!error&&<div style={{textAlign:"center",padding:"52px 0"}}><div style={{fontSize:44,marginBottom:12,opacity:.2,color:T.accent}}>◈</div><div style={{fontSize:13,color:T.textSub,marginBottom:5}}>종목명 또는 티커를 입력해 분석을 시작하세요</div><div style={{fontSize:11,color:T.textFaint}}>NVDA · AAPL · 삼성전자 · 005930 · TSLA · 현대차</div></div>}
      </div>
    </div>
  );
}
