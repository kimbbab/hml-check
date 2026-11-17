/* HML AI 눈검수 2026-11-17 10:27 */
window.__hmlAi3Build='2026-11-17 10:27';
// AI 눈검수(ver3): 바로 검사(ver2) 옆 칸에 'AI 눈검수' 칸을 붙임.
// 버튼을 누르면 이 문항의 HML 캡처(문제·해답)와 HTML 내용을 AI(기본 Claude Haiku 5.5)에 보내 비교하고, 원하면 문제풀이·메타정보도 판단함.
// API 키와 캡처 이미지는 확장(배경)에서만 다룸: 이 페이지 코드는 키를 볼 수 없음. CMS는 읽기만 함.
(function(){
  const Q=String.fromCharCode(63);
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const A=window.__hmlAI3=window.__hmlAI3||{cache:{}};
  const LS=(k,v)=>{ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){} };
  const itemIdOf=()=>(String(location.search).match(/itemId=(\d+)/)||[])[1];
  const K=()=>window.__hmlQuick||{};

  // ---------- 확장(배경)과 주고받기: 페이지 ↔ bridge.js ↔ sw.js ----------
  let seq=0; const wait={};
  window.addEventListener('message',e=>{ const d=e.data; if(e.source!==window||!d||d.__hmlAI3!=='res') return; const w=wait[d.rid]; if(!w) return; delete wait[d.rid]; clearTimeout(w.t); d.ok?w.ok(d.data):w.no(new Error(d.error||'실패')); });
  function rpc(op,payload,ms){ return new Promise((ok,no)=>{ const rid='r'+(++seq)+'_'+Date.now(); wait[rid]={ok,no,t:setTimeout(()=>{ delete wait[rid]; no(new Error(op==='ping'?'AI 눈검수 확장이 없습니다':'응답 시간 초과')); },ms||180000)}; window.postMessage({__hmlAI3:'req',rid,op,payload},'*'); }); }

  // ---------- 이 문항의 자료 모으기 ----------
  const htmlToText=h=>{ if(!h) return ''; const d=document.createElement('div'); d.innerHTML=String(h)
      .replace(/<\/(p|div|li|tr|h\d)>/gi,'\n').replace(/<br\s*\/?>/gi,'\n').replace(/<\/t[dh]>/gi,' | ').replace(/<img[^>]*>/gi,' [그림] ');
    return d.textContent.replace(/\n{3,}/g,'\n\n').trim(); };
  function itemText(data){ const c=(data&&data.content)||{}; const out=[];
    out.push('[문제]\n'+(c.promptText||htmlToText(c.questionHtml)));
    if(Array.isArray(c.choices)&&c.choices.length) out.push('[선지]\n'+c.choices.map((x,i)=>'①②③④⑤⑥⑦⑧'[i]+' '+(typeof x==='string'?htmlToText(x):htmlToText(x.html||x.text||x.content||JSON.stringify(x)))).join('\n'));
    out.push('[정답]\n'+(c.answerText||htmlToText(c.correctHtml)));
    const ex=c.explanationText||htmlToText(c.explanationHtml); if(ex) out.push('[풀이]\n'+ex);
    const ma=htmlToText(c.modelAnswerHtml); if(ma) out.push('[모범 답안]\n'+ma);
    return out.join('\n\n'); }
  async function getDoc(url){ const r=await fetch(url,{credentials:'include'}); if(/login/.test(r.url)) throw new Error('CMS 로그인이 풀렸습니다');
    return new DOMParser().parseFromString(await r.text(),'text/html'); }
  const panelEl=()=>document.getElementById('hmlQuick');
  async function itemData(id){ const L=K().last; if(L&&L.id===String(id)&&L.data) return L.data;
    const pick=root=>{ for(const sc of root.querySelectorAll('.qv-item script')){ const p=panelEl(); if(p&&p.contains(sc)) continue; if(sc.textContent.includes(String(id))) try{ return JSON.parse(sc.textContent); }catch(e){} } return null; };
    return pick(document)||pick(await getDoc('/item/all/detail.donga'+Q+'itemId='+id)); }
  function autoDiffs(id){ const L=K().last; if(L&&L.id===String(id)) return (L.rows||[]).map(r=>({kind:r[2],type:r[3],detail:r[4]}));
    const p=panelEl(); if(!p) return []; return [...p.querySelectorAll('[data-b] li')].map(li=>({kind:(li.querySelector('span')||{}).textContent||'',type:(li.querySelector('b')||{}).textContent||'',detail:(li.querySelector('div')||{}).textContent||''})); }
  const META_KEYS=['문항 형태','난이도','단원코드','단원','성취기준','내용영역','행동영역','유형정보','세트 문항'];
  async function metaOf(id){ A.meta=A.meta||{}; if(A.meta[id]) return A.meta[id];
    const read=d=>{ const m={}; d.querySelectorAll('dl.dl-detail dt').forEach(dt=>{ const dd=dt.nextElementSibling; if(dd&&dd.tagName==='DD') m[dt.textContent.trim()]=dd.textContent.replace(/\s+/g,' ').replace(/\s*(다운로드|목록 조회)\s*/g,' ').trim(); }); return m; };
    let m=/detail\.donga/.test(location.pathname)?read(document):{}; if(!Object.keys(m).length) m=read(await getDoc('/item/all/detail.donga'+Q+'itemId='+id));
    const out={}; for(const k of Object.keys(m)) if(META_KEYS.some(x=>k.includes(x))) out[k]=m[k]; return A.meta[id]=out; }

  // ---------- 칸 그리기 ----------
  const opt=()=>({model:LS('hmlAi3Model')||'claude-haiku-5-5',solve:LS('hmlAi3Solve')!=='0',meta:LS('hmlAi3Meta')!=='0',auto:LS('hmlAi3Auto')==='1'});
  function box(){ const p=panelEl(); if(!p) return null; let b=p.querySelector('[data-ai3]'); if(b) return b;
    const body=p.querySelector('[data-b]'); if(!body) return null; const o=opt();
    b=document.createElement('div'); b.setAttribute('data-ai3','');
    b.style.cssText='border-bottom:1px solid #ddd;background:#f8f3fb;padding:8px 10px;font-size:13px;max-height:45%;overflow:auto;flex:none';
    b.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center"><b style="color:#7b1fa2">AI 눈검수</b>'+
      '<button data-go style="border:0;padding:4px 10px;border-radius:4px;color:#fff;background:#7b1fa2;cursor:pointer;font-weight:bold">이 문항 AI 검사</button>'+
      '<select data-model title="모델"><option value="claude-haiku-5-5">Haiku 5.5 (빠름·저렴)</option><option value="claude-sonnet-5-5">Sonnet 5.5 (정확)</option></select>'+
      '<label><input type="checkbox" data-solve> 문제풀이</label><label><input type="checkbox" data-meta> 메타정보</label><label title="문항을 넘길 때마다 자동으로 AI 검사(문항마다 비용이 듭니다)"><input type="checkbox" data-auto> 넘길 때 자동</label>'+
      '<span style="flex:1"></span><button data-key title="API 키 넣기·바꾸기">API 키</button></div>'+
      '<div data-out style="margin-top:6px;color:#666">버튼을 누르면 HML 캡처와 HTML을 AI가 비교합니다.</div>';
    p.insertBefore(b,body);
    const $=q=>b.querySelector(q);
    $('[data-model]').value=o.model; $('[data-solve]').checked=o.solve; $('[data-meta]').checked=o.meta; $('[data-auto]').checked=o.auto;
    $('[data-model]').onchange=e=>LS('hmlAi3Model',e.target.value);
    $('[data-solve]').onchange=e=>LS('hmlAi3Solve',e.target.checked?'1':'0');
    $('[data-meta]').onchange=e=>LS('hmlAi3Meta',e.target.checked?'1':'0');
    $('[data-auto]').onchange=e=>{ LS('hmlAi3Auto',e.target.checked?'1':'0'); if(e.target.checked) run(); };
    $('[data-go]').onclick=()=>run(true);
    $('[data-key]').onclick=()=>rpc('openOptions',{},5000).catch(e=>out('<span style="color:#d93025">'+esc(e.message)+'</span>'));
    return b; }
  const out=h=>{ const b=box(); if(b) b.querySelector('[data-out]').innerHTML=h; };

  const krw=d=>Math.max(1,Math.round(d*1450));
  function render(id,r){ const x=r.result||{}; const diffs=x.content_diffs||[], cap=x.capture_issues||[], ver=x.auto_verdicts||[], meta=(x.meta||[]).filter(m=>!m.ok), s=x.solve;
    const red=diffs.length||ver.some(v=>v.real)||(s&&s.match==='불일치')||meta.length;
    const tag=(t,c)=>'<span style="display:inline-block;padding:0 6px;border-radius:4px;color:#fff;font-size:12px;margin-right:6px;background:'+c+'">'+esc(t)+'</span>';
    let h='<div style="padding:6px 8px;border-radius:4px;font-weight:bold;'+(red?'background:#fce8e6;color:#d93025':'background:#e6f4ea;color:#188038')+'">'+(red?'✗ ':'✓ ')+esc(x.summary||(red?'확인할 것이 있습니다':'원본과 같습니다'))+'</div>';
    if(diffs.length) h+='<div style="margin-top:6px"><b>내용 차이 '+diffs.length+'건</b><ul style="margin:4px 0;padding-left:18px">'+diffs.map(d=>'<li>'+tag(d.where,'#d93025')+'HML <b>'+esc(d.hml)+'</b> → HTML <b>'+esc(d.html)+'</b>'+(d.note?' <span style="color:#666">('+esc(d.note)+')</span>':'')+'</li>').join('')+'</ul></div>';
    if(ver.length){ const ad=autoDiffs(id); h+='<div style="margin-top:6px"><b>바로 검사가 찾은 차이 판정</b><ul style="margin:4px 0;padding-left:18px">'+ver.map(v=>{ const a=ad[v.no-1]; return '<li>'+tag(v.real?'고칠 것':'표기만 다름',v.real?'#d93025':'#5f6368')+(a?esc(a.type)+' ':'#'+v.no+' ')+'<span style="color:#666">'+esc(v.reason)+'</span></li>'; }).join('')+'</ul></div>'; }
    if(s&&s.match&&s.match!=='안 함') h+='<div style="margin-top:6px"><b>문제풀이</b> '+tag(s.match,s.match==='일치'?'#188038':s.match==='불일치'?'#d93025':'#5f6368')+'AI 답 <b>'+esc(s.ai_answer)+'</b> · HTML 정답 <b>'+esc(s.html_answer)+'</b>'+(s.note?'<div style="color:#666">'+esc(s.note)+'</div>':'')+'</div>';
    if(x.meta&&x.meta.length) h+='<div style="margin-top:6px"><b>메타정보</b> '+(meta.length?'':'<span style="color:#188038">✓ 맞아 보임</span>')+(meta.length?'<ul style="margin:4px 0;padding-left:18px">'+meta.map(m=>'<li>'+tag(m.field,'#e37400')+esc(m.note)+(m.suggest?' <span style="color:#666">→ 제안: '+esc(m.suggest)+'</span>':'')+'</li>').join('')+'</ul>':'')+'</div>';
    if(cap.length) h+='<div style="margin-top:6px;color:#b06000"><b>캡처 이미지 자체 문제</b> (HTML은 정상, CMS에서 다시 저장하면 해결되는 경우가 많음): '+cap.map(c=>esc(c.detail)).join(' / ')+'</div>';
    const u=r.usage||{}; h+='<div style="margin-top:6px;font-size:11px;color:#888">'+esc(r.model)+' · '+(r.sec||0).toFixed(0)+'초 · 이 문항 $'+(r.cost||0).toFixed(4)+'(약 '+krw(r.cost||0)+'원) · 누적 $'+(r.total||0).toFixed(3)+' · 이미지 '+(r.tiles||0)+'장 · 토큰 '+(u.input_tokens||0)+'/'+(u.output_tokens||0)+(r.warn?' · '+esc(r.warn):'')+'</div>';
    out(h); }

  async function run(force){ const id=itemIdOf(); if(!id||!box()) return; if(A.busy) return;
    if(!force&&A.cache[id]){ render(id,A.cache[id]); return; }
    A.busy=true; const o=opt(); const t0=Date.now();
    try{
      out('자료를 모으는 중…');
      try{ await rpc('ping',{},2500); }catch(e){ out('<span style="color:#d93025">AI 눈검수 확장이 설치돼 있지 않습니다. 설치 페이지에서 ver3 확장을 설치해 주세요.</span>'); return; }
      const data=await itemData(id); if(!data) throw new Error('이 문항의 HTML 내용을 찾지 못했습니다');
      const meta=o.meta?await metaOf(id).catch(()=>({})):null;
      const diffs=autoDiffs(id).filter(d=>d.kind!=='화면');
      out('AI가 보는 중… (보통 10~40초)');
      const r=await rpc('check',{itemId:id,html:itemText(data),diffs,meta,solve:o.solve,model:o.model});
      r.sec=(Date.now()-t0)/1000; A.cache[id]=r; if(itemIdOf()===id) render(id,r);
    }catch(e){ out('<span style="color:#d93025">AI 검사를 하지 못했습니다: '+esc(e.message)+'</span>'); }
    finally{ A.busy=false; } }
  A.run=run;

  // ---------- 바로 검사 칸이 생기거나 문항이 바뀌면 붙이기 ----------
  let lastId=null, tm=null;
  function tick(){ if(!box()) return; const id=itemIdOf(); if(K().busy) return;
    if(id!==lastId){ lastId=id; if(A.cache[id]) render(id,A.cache[id]); else if(opt().auto) run(); else out('버튼을 누르면 HML 캡처와 HTML을 AI가 비교합니다.'); } }
  if(!A.obs){ A.obs=new MutationObserver(()=>{ clearTimeout(tm); tm=setTimeout(tick,600); }); A.obs.observe(document.body,{childList:true,subtree:true}); }
  tick();
})();
