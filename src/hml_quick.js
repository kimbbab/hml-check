// 바로 검사(ver2): CMS 문항 수정·상세 화면에서 누르면, 그 문항의 HML 원본과 지금 저장된 HTML을 비교해 오른쪽 패널에 보여 줌.
// 미리 검수한 결과가 없어도 됨(API 필요 없음). CMS 데이터는 바꾸지 않음(읽기만).
(function(){
  const Q=String.fromCharCode(63);
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const CAP=id=>'https://items.dongahub.com/itembank/item/'+String(id).slice(0,3)+'/'+id+'/1/image/'+id;
  const K=window.__hmlQuick=window.__hmlQuick||{};
  const LSs=(k,v)=>{ try{ if(v===undefined) return localStorage.getItem(k); localStorage.setItem(k,v); }catch(e){} };

  const itemIdOf=()=>(String(location.search).match(/itemId=(\d+)/)||[])[1];
  async function getDoc(url){ const r=await fetch(url,{credentials:'include'}); if(/login/.test(r.url)) throw new Error('CMS 로그인이 풀렸습니다. 다시 로그인해 주세요.');
    return new DOMParser().parseFromString(await r.text(),'text/html'); }
  // 문항이 들어 있는 시험지(examDocumentId) 찾기: 지금 화면 → 문항 상세 화면 순서로 링크·글자에서 찾음
  function findSid(doc){ for(const a of doc.querySelectorAll('[href],[data-href],[onclick],[data-url]')){ const t=[a.getAttribute('href'),a.getAttribute('data-href'),a.getAttribute('onclick'),a.getAttribute('data-url')].join(' '); const m=t.match(/examDocumentId=(\d+)/); if(m) return m[1]; }
    const m=doc.documentElement.innerHTML.match(/examDocumentId["'\s:=]+(\d+)/); return m&&m[1]; }
  // 화면의 '원본 파일' 이름 → CMS HML 목록(22·15개정)에서 같은 이름의 시험지 ID. 목록은 이 브라우저에 기억해 둠
  const fileName=doc=>{ for(const dt of doc.querySelectorAll('dt,th,strong,b,span,div,label')){ if(dt.children.length>2||dt.textContent.trim()!=='원본 파일') continue;
      const dd=dt.nextElementSibling; if(dd){ const t=dd.textContent.replace(/다운로드|목록 조회/g,'').replace(/\s+/g,' ').trim(); if(t) return t; } }
    return (((doc.body||doc.documentElement).innerText||'').match(/원본 파일\s*\n?\s*([^\n]+)/)||[])[1]?.replace(/다운로드|목록 조회/g,'').trim()||''; };
  const base=n=>String(n||'').replace(/\.(hml|hwp|hwpx)$/i,'').replace(/\s+/g,'').trim();
  async function listAll(msg){ const all=[];
    for(const cur of ['22','15']){ const u=new URLSearchParams('curriculum='+cur); u.set('pageSize','100');
      for(let p=1;p<200;p++){ u.set('pageNum',String(p)); const d=await getDoc('/item/hml/list.donga'+Q+u);
        const got=[...d.querySelectorAll('a')].filter(a=>/examDocumentId\D\d+/.test(a.getAttribute('href')||'')).map(a=>({id:a.getAttribute('href').match(/examDocumentId\D(\d+)/)[1],name:a.textContent.trim()})).filter(x=>!all.some(y=>y.id===x.id));
        if(!got.length) break; all.push(...got); if(msg) msg('시험지 목록 읽는 중… '+all.length+'건 (처음 한 번만)'); } }
    try{ localStorage.setItem('hmlSheetList',JSON.stringify({at:Date.now(),all})); }catch(e){}
    return all; }
  async function hasItem(sid,id){ const d=await getDoc('/item/hml/detail.donga'+Q+'examDocumentId='+sid); return [...d.querySelectorAll('.card-header')].some(h=>new RegExp('문항ID\\s*'+id+'\\b').test(h.textContent)); }
  async function sheetOf(id,msg){ let sid=findSid(document); if(sid) return sid;
    const name=fileName(document); const b=base(name);
    if(b){ let L=null; try{ L=JSON.parse(localStorage.getItem('hmlSheetList')||'null'); }catch(e){}
      const pick=all=>all.filter(x=>base(x.name)===b);
      let c=L?pick(L.all):[]; if(!c.length){ c=pick(await listAll(msg)); }
      if(c.length===1) return c[0].id;
      for(const x of c){ if(await hasItem(x.id,id)) return x.id; } }
    sid=findSid(await getDoc('/item/all/detail.donga'+Q+'itemId='+id)); if(sid) return sid;
    throw new Error('이 문항이 들어 있는 시험지를 찾지 못했습니다'+(name?' (원본 파일: '+name+')':' (원본 파일 이름을 못 읽음)')+'. 이 화면을 캡처해서 보내 주세요.'); }

  // 오른쪽 옆 칸(사이드 탭): 페이지를 왼쪽으로 밀어서 CMS 화면을 가리지 않음. 왼쪽 가장자리를 끌어 폭 조절, 접으면 얇은 탭만 남음
  const getW=()=>{ let w=0; try{ w=+localStorage.getItem('hmlQuickW')||0; }catch(e){} return Math.max(360,Math.min(w||Math.min(700,Math.round(innerWidth*0.42)),innerWidth-400)); };
  function squeeze(w){ const h=document.documentElement; h.style.marginRight=w?w+'px':''; h.style.transition='margin-right .1s'; window.dispatchEvent(new Event('resize')); }
  function panel(){ if(K.el&&document.body.contains(K.el)) return K.el;
    const el=document.createElement('div'); el.id='hmlQuick'; let W=getW();
    el.style.cssText='position:fixed;top:0;right:0;bottom:0;width:'+W+'px;z-index:2147483646;background:#fff;border-left:1px solid #ccc;display:flex;flex-direction:column;font-family:sans-serif;color:#222;font-size:14px';
    el.innerHTML='<div data-grip title="끌어서 폭 조절" style="position:absolute;left:-4px;top:0;bottom:0;width:8px;cursor:col-resize"></div>'+
      '<div data-tab style="display:none;writing-mode:vertical-rl;padding:12px 6px;cursor:pointer;font-weight:bold;color:#1a73e8">◀ 바로 검사 펼치기</div>'+
      '<div data-head style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 10px;border-bottom:1px solid #ddd;background:#f4f5f7"><b>바로 검사</b><span style="font-size:11px;color:#999">'+esc(window.__hmlBuild||'')+'</span><span style="flex:1"></span>'+
      '<button data-pv>◀ 이전</button><button data-nx>다음 ▶</button><button data-r style="border:0;padding:4px 10px;border-radius:4px;color:#fff;background:#1a73e8;cursor:pointer">↻ 다시 비교</button><button data-up title="새 버전이 있는지 확인">업데이트 확인</button><button data-f title="접기">▶ 접기</button><button data-x>닫기</button>'+
      '<div data-t style="flex-basis:100%;font-size:12px;color:#666"></div></div><div data-b style="overflow:auto;padding:12px;flex:1"></div>';
    el.querySelector('[data-r]').onclick=()=>{ K.fresh=true; run(); };
    const up=el.querySelector('[data-up]'); if(!window.__hmlQuickUpdate) up.style.display='none';
    up.onclick=async()=>{ const t=el.querySelector('[data-t]'); up.disabled=true; t.textContent='새 버전을 확인하는 중…';
      try{ const r=await window.__hmlQuickUpdate(); if(r.updated){ t.textContent='새 버전('+r.build+')을 받았습니다. 페이지를 새로 고침하면 적용됩니다.'; if(confirm('새 버전('+r.build+')을 받았습니다. 지금 새로 고칠까요?')) location.reload(); } else t.textContent='이미 최신 버전입니다('+r.build+').'; }
      catch(e){ t.textContent='확인하지 못했습니다: '+e.message; } finally{ up.disabled=false; } };
    const pageBtn=word=>[...document.querySelectorAll('a,button')].find(a=>!el.contains(a)&&a.textContent.replace(/\s+/g,'').includes(word));
    el.querySelector('[data-pv]').onclick=()=>{ const a=pageBtn('이전문항'); const u=a&&navUrl(a); if(u) go(u); else el.querySelector('[data-t]').textContent='이 화면에는 이전 문항 버튼이 없습니다.'; };
    el.querySelector('[data-nx]').onclick=()=>{ const a=pageBtn('다음문항'); const u=a&&navUrl(a); if(u) go(u); else el.querySelector('[data-t]').textContent='이 화면에는 다음 문항 버튼이 없습니다.'; };
    el.querySelector('[data-x]').onclick=()=>{ el.remove(); squeeze(0); LSs('hmlQuickOn','0'); if(K.ext) launcher(); };
    const fold=on=>{ K.folded=on; ['[data-head]','[data-b]','[data-grip]'].forEach(q=>{ el.querySelector(q).style.display=on?'none':''; }); el.querySelector('[data-tab]').style.display=on?'':'none';
      el.style.width=(on?36:W)+'px'; squeeze(on?36:W); LSs('hmlQuickFold',on?'1':'0'); };
    K.fold=fold;
    el.querySelector('[data-f]').onclick=()=>fold(true); el.querySelector('[data-tab]').onclick=()=>fold(false);
    el.querySelector('[data-grip]').onmousedown=e=>{ e.preventDefault(); const mv=ev=>{ W=Math.max(360,Math.min(innerWidth-ev.clientX,innerWidth-400)); el.style.width=W+'px'; document.documentElement.style.marginRight=W+'px'; };
      const up=()=>{ removeEventListener('mousemove',mv); removeEventListener('mouseup',up); try{ localStorage.setItem('hmlQuickW',String(W)); }catch(err){} window.dispatchEvent(new Event('resize')); };
      addEventListener('mousemove',mv); addEventListener('mouseup',up); };
    const L=document.getElementById('hmlQuickLauncher'); if(L) L.remove();
    document.body.appendChild(el); K.el=el; squeeze(W); LSs('hmlQuickOn','1'); if(LSs('hmlQuickFold')==='1') fold(true); return el; }
  // 크롬 확장용: 패널을 닫아 둔 동안 오른쪽 가장자리에 작은 '바로 검사' 탭
  function launcher(){ if(document.getElementById('hmlQuickLauncher')||!itemIdOf()) return; const b=document.createElement('div'); b.id='hmlQuickLauncher'; b.textContent='◀ 바로 검사';
    b.style.cssText='position:fixed;right:0;top:40%;z-index:2147483646;writing-mode:vertical-rl;background:#1a73e8;color:#fff;font:bold 13px sans-serif;padding:12px 6px;border-radius:8px 0 0 8px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.3)';
    b.onclick=()=>{ LSs('hmlQuickFold','0'); run(); }; document.body.appendChild(b); }
  // 크롬 확장이 페이지마다 부름: 켜 두었으면 자동으로 검사, 아니면 탭만 보임
  K.boot=()=>{ K.ext=true; if(!itemIdOf()) return; if(LSs('hmlQuickOn')==='1') run(); else launcher(); };

  async function run(){ const el=panel(), body=el.querySelector('[data-b]'), t=el.querySelector('[data-t]');
    const id=itemIdOf(); if(!id){ body.textContent='문항 수정·상세 화면(주소에 itemId가 있는 화면)에서 눌러 주세요.'; return; }
    if(K.busy) return; K.busy=true; const t0=Date.now();
    try{
      body.textContent='시험지를 찾는 중…'; t.textContent='문항ID '+id;
      const sid=await sheetOf(id,m=>{ body.textContent=m; });
      const E=window.__hmlChecker2; K.sids=K.sids||{}; const first=!K.sids[sid]; K.sids[sid]=1;
      body.textContent=first||K.fresh?'시험지 '+sid+'의 HML 원본을 읽는 중… (이 시험지는 처음 한 번만 오래 걸립니다)':'비교하는 중…';
      // 지금 화면에 이 문항의 HTML 데이터가 있으면 그것을 씀(다시 받지 않음). ↻ 다시 비교는 CMS에서 새로 읽음
      let pj=null; if(!K.fresh){ for(const sc of document.querySelectorAll('.qv-item script')){ if(K.el.contains(sc)) continue; if(sc.textContent.includes(String(id))){ pj=sc.textContent; break; } } if(!pj) pj=(K.pageJsons||[]).find(x=>x.includes(String(id)))||null; }
      const r=await E.checkItem(sid,id,{json:pj,fresh:K.fresh}); K.fresh=false;
      const mine=r.rows.filter(x=>x.kind!=='내용'||!/^(원본 대조 불가|문항 수 불일치)$/.test(x.type)).map(x=>[x.n,x.itemId,x.kind,x.type,x.detail]);
      const sheetNotes=r.rows.filter(x=>/^(원본 대조 불가|문항 수 불일치)$/.test(x.type)).map(x=>['','',x.kind,x.type,x.detail]);
      const data=r.data, n=r.n;
      if(!document.getElementById('hmlMarkCssTag')&&window.__hmlMarkCss){ const st=document.createElement('style'); st.id='hmlMarkCssTag'; st.textContent=window.__hmlMarkCss; document.head.appendChild(st); }
      const sec=(Date.now()-t0)/1000;
      t.textContent='시험지 '+sid+' · #'+(n||'?')+' · 문항ID '+id+' · '+new Date().toTimeString().slice(0,5)+' 비교('+sec.toFixed(0)+'초)';
      const li=x=>'<li style="margin:0 0 6px"><span style="display:inline-block;padding:0 6px;border-radius:4px;color:#fff;font-size:12px;margin-right:6px;background:'+(x[2]==='화면'?'#1a73e8':'#d93025')+'">'+esc(x[2])+'</span><b>'+esc(x[3])+'</b><div style="font-family:monospace;font-size:12px;white-space:pre-wrap;background:#f6f6f6;padding:4px 6px;margin-top:3px">'+esc(x[4])+'</div></li>';
      const O=r.omr||{}; const omrLine='<div style="font-size:13px;margin-bottom:8px;padding:6px 8px;background:#f1f3f4;border-radius:4px"><b>OMR</b> '+esc(O.mode||'-')+' = <b>'+esc(O.value||'(비어 있음)')+'</b> · <b>HTML 정답</b> '+esc(O.answer||'(없음)')+(mine.some(x=>/^OMR/.test(x[3]))?' <span style="color:#d93025;font-weight:bold">✗ 다름</span>':' <span style="color:#188038;font-weight:bold">✓ 같음</span>')+'</div>';
      body.innerHTML=omrLine+(mine.length?'<div style="color:#d93025;font-weight:bold;margin-bottom:6px">차이 '+mine.length+'건</div><ul style="list-style:none;padding:0;margin:0">'+mine.map(li).join('')+'</ul>'
          :'<div style="padding:8px;border-radius:4px;background:#e6f4ea;color:#188038;font-weight:bold">✓ HML 원본과 차이 없음</div>')+
        (sheetNotes.length?'<div style="margin-top:8px;font-size:12px;color:#b06000">시험지 전체 알림: '+sheetNotes.map(x=>esc(x[3]+' '+x[4])).join(' / ')+'</div>':'')+
        '<div style="font-size:12px;color:#666;margin:10px 0 4px">CMS에 <b>저장된</b> 내용 기준입니다. 고친 뒤 저장하고 ↻ 다시 비교를 누르세요. 빨간 동그라미: 원본과 다른 글자 · 빨간 테두리: 화면 문제 · 주황 점선: 모바일 넘침</div>'+
        '<div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap"><div><b>HTML</b><div data-h style="width:640px;max-width:100%;box-sizing:border-box;padding:16px;border:1px solid #ddd;margin-top:4px"></div></div>'+
        '<div style="flex:1;min-width:240px"><b>HML 캡처(문제)</b><img style="max-width:100%;display:block;border:1px solid #ddd;margin:4px 0 10px" src="'+CAP(id)+'_Q.png"><b>HML 캡처(해답)</b><img style="max-width:100%;display:block;border:1px solid #ddd;margin:4px 0" src="'+CAP(id)+'_A.png"></div></div>';
      const h=body.querySelector('[data-h]');
      if(data){ const q=document.createElement('div'); q.className='qv-item'; q.dataset.qvLayout='card'; h.appendChild(q);
        try{ window.renderQuestionView(q,data,'card'); if(window.__hmlMark) window.__hmlMark(q,mine); if(window.__hmlMarkLayout) await window.__hmlMarkLayout(q,mine); }catch(e){ h.textContent='HTML을 그리지 못했습니다: '+e.message; } }
      else h.textContent='시험지 화면에서 이 문항 카드를 찾지 못했습니다.';
    }catch(e){ body.textContent='검사하지 못했습니다: '+e.message; }
    finally{ K.busy=false; } }
  // 이전/다음 문항: 패널이 열려 있으면 페이지를 새로 열지 않고 내용만 바꿔서 넘김(즐겨찾기가 꺼지지 않게)
  const navUrl=(a)=>{ const h=a.getAttribute('href'); if(h&&/itemId=\d+/.test(h)) return h;
    const t=[a.getAttribute('onclick'),a.getAttribute('data-href'),a.getAttribute('data-url')].join(' '); const m=t.match(/['"]([^'"]*itemId=\d+[^'"]*)['"]/); return m&&m[1]; };
  function swap(d){ for(const sel of ['main','.page-wrapper','.page-body','.content','#content','.container-xl']){ const a=document.querySelector(sel), b=d.querySelector(sel);
      if(a&&b&&!a.contains(K.el)){ a.innerHTML=b.innerHTML; return a; } } return null; }
  function redraw(root){ root.querySelectorAll('.qv-item').forEach(el=>{ const sc=el.querySelector('script'); if(!sc||!window.renderQuestionView) return; try{ const j=JSON.parse(sc.textContent); window.renderQuestionView(el,j,el.dataset.qvLayout||'card'); }catch(e){} });
    root.querySelectorAll('.qv-passage').forEach(el=>{ const sc=el.querySelector('script'); if(!sc||!window.renderPassageView) return; try{ window.renderPassageView(el,JSON.parse(sc.textContent)); }catch(e){} }); }
  async function go(url){ if(K.busy) return; const body=K.el&&K.el.querySelector('[data-b]'); if(body) body.textContent='다음 문항을 불러오는 중…';
    try{ const d=await getDoc(url); const root=swap(d);
      if(!root){ location.href=url; return; }   // 바꿀 자리를 못 찾으면 그냥 이동
      document.title=d.title; history.pushState({hmlQuick:1},'',url); K.pageJsons=[...root.querySelectorAll('.qv-item script')].map(x=>x.textContent); redraw(root); window.scrollTo(0,0); run(); }
    catch(e){ if(body) body.textContent='넘기지 못했습니다: '+e.message; } }
  if(!K.nav){ K.nav=true;
    document.addEventListener('click',e=>{ if(!(K.el&&document.body.contains(K.el))) return; const a=e.target.closest('a,button'); if(!a||K.el.contains(a)) return;
      const t=a.textContent.replace(/\s+/g,''); if(!/^(◀|‹|<)?(이전문항|다음문항)(▶|›|>)?$/.test(t.replace(/[^가-힣◀▶‹›<>]/g,''))) return;
      const u=navUrl(a); if(!u) return; e.preventDefault(); e.stopPropagation(); go(u); },true);
    window.addEventListener('popstate',()=>{ if(K.el&&document.body.contains(K.el)) location.reload(); }); }
  K.go=go;
  K.run=run;
})();
