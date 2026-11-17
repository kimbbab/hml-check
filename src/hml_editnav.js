// 수정 도우미: 수정 확인 문항을 CMS 목록 순서(시험지ID 내림차순, 22개정 → 15개정)로 하나씩 보여 주고,
// 옆 창(hmlEdit)에 해당 문항 상세 화면을 띄움. ←/→ 이동, Space 완료 표시(+그 시험지 자동 재검사).
// '최신화'는 CMS를 다시 읽어 검사하고, 고쳐진 문항은 목록에서 뺌. CMS 데이터는 바꾸지 않음(읽기·창 열기만).
(function(){
  const Q=String.fromCharCode(63);
  const safe=s=>String(s||'').replace(/[\\/:*"<>|\x3f]/g,'_').trim();
  const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const CAP=id=>'https://items.dongahub.com/itembank/item/'+String(id).slice(0,3)+'/'+id+'/1/image/'+id;
  const LS=(k,v)=>{ try{ if(v===undefined) return JSON.parse(localStorage.getItem(k)||'null'); localStorage.setItem(k,JSON.stringify(v)); }catch(e){ return null; } };
  const N=window.__hmlEdit=window.__hmlEdit||{};
  const is15=s=>/^중1-2_(수매씽유형|절대등급)/.test(s.name);
  const sortSheets=l=>l.slice().sort((a,b)=>(is15(a)-is15(b))||(+b.id-+a.id));
  async function wf(dir,n,d){ const fh=await dir.getFileHandle(n,{create:true}); const w=await fh.createWritable(); await w.write(d); await w.close(); }
  const vkey=(sid,no,x)=>sid+'#'+no+'#'+x[3]+'#'+x[4];

  // 검사 결과(rows)에서 수정할 문항 목록을 만듦. 눈 대조 판정(verdicts)과 AI 추가 차이(others)를 붙임
  function itemsFromRows(s,rows){ const by={}, order=[], out=[];
    rows.forEach(x=>{ if(x[0]===''||x[0]==null) return; if(!by[x[0]]){ by[x[0]]=[]; order.push(x[0]); } by[x[0]].push(x.slice(0,5)); });
    Object.keys(N.others||{}).forEach(k=>{ const [sid,no]=k.split('#'); if(sid===String(s.id)&&!by[no]){ by[no]=[]; order.push(no); } });
    for(const no of order){ const iss=by[no];
      iss.forEach(x=>{ if(x[2]==='내용'){ const v=(N.verdicts||{})[vkey(s.id,no,x)]; if(v) x[5]=v; } });
      ((N.others||{})[s.id+'#'+no]||[]).forEach(d=>iss.push(['','','AI','AI 눈 대조: 추가 차이',d]));
      const real=iss.filter(x=>x[2]==='화면'||x[2]==='AI'||(x[2]==='내용'&&!(x[5]&&x[5].real===false)));
      if(!real.length) continue;
      out.push({sid:String(s.id),sname:s.name,c15:is15(s),no,itemId:(iss.find(x=>x[1])||[])[1]||'',kind:real.some(x=>x[2]!=='화면')?'내용':'화면',iss}); }
    return out; }

  async function save(){ const root=N.root||(window.__hmlArchive&&window.__hmlArchive.root); if(!root) return;
    await wf(root,'수정목록.json',JSON.stringify({made:new Date().toISOString(),sheets:N.sheets,verdicts:N.verdicts,others:N.others,queue:N.queue})); }

  async function build(){
    const A=window.__hmlArchive;
    if(!(A&&A.root&&A.list&&A.list.length)){ // 새로고침 뒤·확장·즐겨찾기: 저장해 둔 수정목록.json을 읽음
      const root=N.root||(N.root=window.__hmlRoot||await window.showDirectoryPicker({mode:'readwrite',id:'hml-archive'})); window.__hmlRoot=root;
      const j=JSON.parse(await (await (await root.getFileHandle('수정목록.json')).getFile()).text());
      N.queue=j.queue; N.verdicts=j.verdicts||{}; N.others=j.others||{}; N.sheets=j.sheets||[]; return N.queue; }
    // 검수를 돌린 탭: 검수 결과(localStorage)와 시험지 폴더의 ai.json으로 새로 만듦
    const root=A.root, st=JSON.parse(localStorage.getItem('hmlChecker.v2')||'{}'); N.verdicts={}; N.others={}; N.sheets=A.list.map(s=>({id:String(s.id),name:s.name}));
    for(const s of A.list){ const r=st.done&&st.done[s.id]; if(!r) continue; let ai; try{ const d=await root.getDirectoryHandle(safe(s.id+'_'+s.name)); ai=JSON.parse(await (await (await d.getFileHandle('ai.json')).getFile()).text()); }catch(e){ continue; }
      const by={}; (r.rows||[]).forEach(x=>{ if(x[0]===''||x[0]==null) return; (by[x[0]]=by[x[0]]||[]).push(x); });
      for(const no in (ai.items||{})){ const a=ai.items[no]; if(!a.vision) continue; let k=0;
        (by[no]||[]).forEach(x=>{ if(x[2]==='내용'){ k++; const v=(a.vision.verdicts||[]).find(y=>y.no===k); if(v) N.verdicts[vkey(s.id,no,x)]={real:v.real,reason:v.reason}; } });
        if((a.vision.other||[]).length) N.others[s.id+'#'+no]=a.vision.other.map(o=>o.detail); } }
    N.queue=[]; for(const s of sortSheets(A.list)){ const r=st.done&&st.done[s.id]; if(r) N.queue.push(...itemsFromRows(s,r.rows||[])); }
    try{ await save(); }catch(e){}
    return N.queue; }

  // CMS를 다시 읽어 시험지를 검사하고 그 시험지의 목록을 바꿈. 돌려주는 값: 빠진(고쳐진) 문항 수
  async function recheck(sid){ const E=window.__hmlChecker2; if(!(E&&E.checkSheet)) throw new Error('검수 엔진이 없습니다');
    const s=(N.sheets||[]).find(x=>String(x.id)===String(sid))||{id:String(sid),name:(N.queue.find(q=>q.sid===String(sid))||{}).sname||''};
    if(N.cache) delete N.cache[String(s.id)]; if(N.live) delete N.live[String(s.id)];
    const r=await E.checkSheet(s.id,s.name); if(!r.ok) throw new Error((r.rows[0]||{}).detail||'검수 실패');
    const rows=r.rows.map(x=>[x.n,x.itemId,x.kind,x.type,x.detail]);
    try{ const st=JSON.parse(localStorage.getItem('hmlChecker.v2')||'{}'); st.done=st.done||{}; st.done[s.id]={ok:true,items:r.items,name:s.name,rows}; localStorage.setItem('hmlChecker.v2',JSON.stringify(st)); }catch(e){}
    const fresh=itemsFromRows(s,rows); const curKey=cur()&&key(cur());
    const i0=N.queue.findIndex(q=>q.sid===String(s.id)); const before=N.queue.filter(q=>q.sid===String(s.id));
    const rest=N.queue.filter(q=>q.sid!==String(s.id)); const at=i0<0?rest.length:N.queue.slice(0,i0).filter(q=>q.sid!==String(s.id)).length;
    rest.splice(at,0,...fresh); N.queue=rest;
    const freshKeys=new Set(fresh.map(key)); const gone=before.filter(q=>!freshKeys.has(key(q)));
    const d=LS('hmlEditDone')||{}; gone.forEach(q=>{ d[key(q)]=d[key(q)]||Date.now(); }); LS('hmlEditDone',d);
    N.fixed=(N.fixed||[]).concat(gone.map(key));
    applyFilter(); const p=N.view.findIndex(q=>key(q)===curKey); if(p>=0) N.pos=p; await save().catch(()=>{});
    return {gone:gone.length,left:fresh.length}; }

  function cur(){ return N.view&&N.view[N.pos]; }
  function key(q){ return q.sid+'#'+q.no; }
  function applyFilter(){ const f=N.filter, done=LS('hmlEditDone')||{}; N.view=N.queue.filter(q=>(f==='all'||q.kind===f)&&!(N.hideDone&&done[key(q)])); if(N.pos>=N.view.length) N.pos=Math.max(0,N.view.length-1); }
  function urlOf(q){ return q.itemId?'/item/all/modify.donga'+Q+'itemId='+q.itemId:'/item/hml/detail.donga'+Q+'examDocumentId='+q.sid; }
  function openEdit(){ const q=cur(); if(!q) return; N.win=window.open(urlOf(q),'hmlEdit','width=1150,height='+(screen.availHeight||1000)+',left='+Math.max(0,(screen.availWidth||1900)-1150)+',top=0'); }
  function msg(t){ const m=N.el&&N.el.querySelector('[data-m]'); if(m) m.textContent=t; }
  function render(){
    const el=N.el, q=cur(), done=LS('hmlEditDone')||{}; LS('hmlEditPos',q?key(q):null);
    const doneN=N.queue.filter(x=>done[key(x)]).length;
    el.querySelector('[data-c]').textContent=N.view.length?(N.pos+1)+' / '+N.view.length:'0';
    el.querySelector('[data-d]').textContent='완료 '+doneN+' / 남은 목록 '+N.queue.length+(N.fixed&&N.fixed.length?' · 재검사로 해결 '+N.fixed.length:'');
    const body=el.querySelector('[data-b]');
    if(!q){ body.innerHTML='<p style="padding:20px">표시할 문항이 없습니다.</p>'; return; }
    const isDone=!!done[key(q)];
    const iss=q.iss.map(x=>{ const v=x[5]; const dim=v&&v.real===false;
      return '<li style="margin:0 0 8px;'+(dim?'opacity:.5':'')+'"><span style="display:inline-block;padding:0 6px;border-radius:4px;color:#fff;font-size:12px;margin-right:6px;background:'+(x[2]==='화면'?'#1a73e8':x[2]==='AI'?'#7b1fa2':'#d93025')+'">'+esc(x[2])+'</span><b>'+esc(x[3])+'</b>'+
        (v?' <span style="font-size:12px;font-weight:bold;color:'+(v.real?'#d93025':'#188038')+'">'+(v.real?'AI: 실제 차이':'AI: 표기 차이(무시 가능)')+'</span> <i style="font-size:12px">'+esc(v.reason)+'</i>':'')+
        '<div style="font-family:monospace;font-size:12px;white-space:pre-wrap;background:#f6f6f6;padding:4px 6px;margin-top:3px">'+esc(x[4])+'</div></li>'; }).join('');
    body.innerHTML='<div style="display:flex;gap:16px;align-items:flex-start;height:100%">'+
      '<div style="flex:0 0 28%;overflow:auto;max-height:100%">'+
        '<div style="font-size:13px;color:#666">'+(q.c15?'15개정 · ':'22개정 · ')+'시험지 '+esc(q.sid)+'</div>'+
        '<h2 style="margin:4px 0 6px;font-size:18px">'+esc(q.sname)+'</h2>'+
        '<div style="font-size:16px;margin-bottom:8px"><b>#'+esc(q.no)+'</b> · 문항ID '+esc(q.itemId||'(지문)')+' · <span style="color:'+(q.kind==='내용'?'#d93025':'#1a73e8')+'">'+(q.kind==='내용'?'내용 수정':'화면 표시')+'</span>'+(isDone?' · <b style="color:#188038">✓ 완료</b>':'')+'</div>'+
        '<ul style="list-style:none;padding:0;margin:0">'+iss+'</ul>'+
        '<div data-live style="margin-top:8px;font-size:13px;padding:6px 8px;border-radius:4px;background:#f1f3f4;color:#555">지금 CMS 기준으로 다시 비교하는 중…</div>'+
        '<div style="margin-top:14px"><b>메타정보</b> <span style="font-size:12px;color:#888">(빈 칸은 빨간색)</span><div data-meta style="margin-top:4px;font-size:13px;color:#666">불러오는 중…</div></div></div>'+
      '<div style="flex:0 0 640px;overflow:auto;max-height:100%"><b>HTML 화면</b> <span style="font-size:12px;color:#666">빨간 동그라미: 원본과 다른 글자 · 빨간 테두리: 화면 문제 · 주황 점선: 모바일 넘침</span><div data-html style="width:640px;box-sizing:border-box;padding:16px;border:1px solid #ddd;margin-top:4px">불러오는 중…</div></div>'+
      '<div style="flex:1;overflow:auto;max-height:100%">'+(q.itemId?'<b>HML 캡처(문제)</b><img style="max-width:100%;display:block;border:1px solid #ddd;margin:4px 0 10px" src="'+CAP(q.itemId)+'_Q.png"><b>HML 캡처(해답)</b><img style="max-width:100%;display:block;border:1px solid #ddd;margin:4px 0" src="'+CAP(q.itemId)+'_A.png">':'')+'</div></div>';
    el.querySelector('[data-done]').textContent=isDone?'완료 취소 (Space)':'완료 표시 (Space)';
    showHtml(q); showMeta(q); liveCheck(q);
  }
  // 문항을 열 때 그 시험지를 지금 CMS 기준으로 다시 비교(시험지마다 한 번, 이 화면을 연 동안 기억). API 필요 없음
  N.live=N.live||{};
  function liveRows(sid){ const E=window.__hmlChecker2; if(!(E&&E.checkSheet)) return Promise.reject(new Error('검수 엔진이 없습니다'));
    if(!N.live[sid]){ const s=(N.sheets||[]).find(x=>String(x.id)===String(sid))||{id:String(sid),name:''};
      N.live[sid]=E.checkSheet(s.id,s.name).then(r=>{ if(!r.ok) throw new Error((r.rows[0]||{}).detail||'비교 실패'); return {s,rows:r.rows.map(x=>[x.n,x.itemId,x.kind,x.type,x.detail]),at:new Date()}; }).catch(e=>{ delete N.live[sid]; throw e; }); }
    return N.live[sid]; }
  async function liveCheck(q){ const box=N.el.querySelector('[data-live]'); if(!box) return; const k=key(q);
    if(!onCms()){ box.textContent='CMS 화면에서 열면 지금 상태로 다시 비교합니다.'; return; }
    box.onclick=e=>{ if(!e.target.closest('[data-relive]')) return; delete N.live[q.sid]; if(N.cache) delete N.cache[q.sid]; delete q.liveIss; box.style.background='#f1f3f4'; box.textContent='지금 CMS 기준으로 다시 비교하는 중…'; showHtml(q); liveCheck(q); };
    const again=' <a href="javascript:void 0" data-relive style="font-size:12px">↻ 다시 비교</a>';
    try{ const L=await liveRows(q.sid); if(!cur()||key(cur())!==k) return;
      const now=itemsFromRows(L.s,L.rows).find(x=>String(x.no)===String(q.no)); const t=L.at.toTimeString().slice(0,5);
      if(!now){ box.style.background='#e6f4ea'; box.style.color='#188038'; box.innerHTML='<b>✓ 지금 CMS 기준 차이 없음</b> ('+t+' 비교) · 수정이 반영된 것 같습니다. 완료 표시(Space)를 누르세요.'+again; return; }
      const same=JSON.stringify(now.iss.map(x=>x.slice(2,5)))===JSON.stringify(q.iss.map(x=>x.slice(2,5)));
      box.style.background=same?'#f1f3f4':'#fef7e0'; box.style.color='#555';
      box.innerHTML='<b>지금 CMS 기준 차이 '+now.iss.length+'건</b> ('+t+' 비교)'+(same?' · 위 목록과 같음':' · 위 목록과 다름(HTML 표시는 지금 기준)')+again+
        (same?'':'<ul style="margin:4px 0 0;padding-left:18px">'+now.iss.map(x=>'<li>'+esc(x[2])+' · '+esc(x[3])+': <span style="font-family:monospace;font-size:12px">'+esc(x[4])+'</span></li>').join('')+'</ul>');
      if(!same){ q.liveIss=now.iss; showHtml(q); } }
    catch(e){ if(cur()&&key(cur())===k) box.textContent='다시 비교하지 못했습니다: '+e.message; } }
  // 문항 상세 화면(읽기 전용)에서 메타정보를 읽어 보여 줌. 다음 문항 것도 미리 읽어 둠
  N.mcache=N.mcache||{};
  const MF=['난이도','문항 형태','단원코드','성취기준','내용영역','행동영역','교과역량','유형정보','상태'];
  function metaOf(id){ if(!N.mcache[id]) N.mcache[id]=(async()=>{
      if(!onCms()) throw new Error('CMS 화면에서 열어야 메타정보가 보입니다.');
      const r=await fetch('/item/all/detail.donga'+Q+'itemId='+id,{credentials:'include'}); if(/login/.test(r.url)) throw new Error('CMS 로그인이 풀렸습니다.');
      const d=new DOMParser().parseFromString(await r.text(),'text/html'); const m={};
      d.querySelectorAll('dl.dl-detail dt').forEach(dt=>{ const dd=dt.nextElementSibling; if(dd&&dd.tagName==='DD') m[dt.textContent.trim()]=dd.textContent.replace(/\s+/g,' ').replace(/\s*(다운로드|목록 조회)\s*/g,' ').trim(); });
      const st=d.querySelector('input[type=radio]:checked'); if(st) m['상태']=(st.labels&&st.labels[0])?st.labels[0].textContent.trim():st.value;
      if(!Object.keys(m).length) throw new Error('메타정보를 찾지 못했습니다.');
      return m; })().catch(e=>{ delete N.mcache[id]; throw e; });
    return N.mcache[id]; }
  async function showMeta(q){ const box=N.el.querySelector('[data-meta]'); if(!box) return; const k=key(q);
    if(!q.itemId){ box.textContent='지문이라 메타정보가 없습니다.'; return; }
    const nx=N.view[N.pos+1]; if(nx&&nx.itemId) metaOf(nx.itemId).catch(()=>{});
    try{ const m=await metaOf(q.itemId); if(!cur()||key(cur())!==k) return;
      box.innerHTML='<table style="border-collapse:collapse;width:100%;color:#222">'+MF.map(f=>{ const v=m[f]; const empty=!v||v==='-';
        return '<tr><th style="text-align:left;white-space:nowrap;vertical-align:top;padding:3px 8px 3px 0;border-bottom:1px solid #eee;font-weight:normal;color:#666">'+esc(f)+'</th><td style="padding:3px 0;border-bottom:1px solid #eee;'+(empty?'background:#fde8e8;color:#d93025;font-weight:bold':'')+'">'+(empty?'(비어 있음)':esc(v))+'</td></tr>'; }).join('')+'</table>'; }
    catch(e){ if(cur()&&key(cur())===k) box.textContent='메타정보를 불러오지 못했습니다: '+e.message; } }
  // 그 문항의 HTML 화면을 CMS 뷰어로 그리고 틀린 곳에 표시
  N.cache=N.cache||{};
  const onCms=()=>/(^|\.)itemcms\.dongahub\.com$/.test(location.hostname);
  async function sheetDoc(sid){ if(N.cache[sid]) return N.cache[sid];
    if(!onCms()) throw new Error('HTML은 CMS 화면(itemcms.dongahub.com)에서 즐겨찾기를 눌러야 보입니다. 지금 화면: '+(location.protocol==='file:'?'내려받은 파일':location.hostname));
    const res=await fetch('/item/hml/detail.donga'+Q+'examDocumentId='+sid,{credentials:'include'});
    if(/login/.test(res.url)) throw new Error('CMS 로그인이 풀렸습니다. CMS에 다시 로그인한 뒤 이 화면을 새로 여세요.');
    const d=new DOMParser().parseFromString(await res.text(),'text/html');
    const items={}, pas={}; d.querySelectorAll('.card').forEach(c=>{ const h=c.querySelector(':scope > .card-header'); const m=h&&h.textContent.match(/#([\d-]+)\s*문항ID\s*(\d+)/); const sc=c.querySelector(':scope > .card-body .qv-item script'); if(m&&sc) items[m[1]]=JSON.parse(sc.textContent); });
    d.querySelectorAll('.qv-passage script').forEach((sc,i)=>{ pas['지문'+(i+1)]=JSON.parse(sc.textContent); });
    if(!(window.renderQuestionView&&window.renderPassageView)&&window.__hmlChecker2&&window.__hmlChecker2.ensureViewer) await window.__hmlChecker2.ensureViewer(d);
    if(!document.getElementById('hmlMarkCssTag')&&window.__hmlMarkCss){ const st=document.createElement('style'); st.id='hmlMarkCssTag'; st.textContent=window.__hmlMarkCss; document.head.appendChild(st); }
    if(!Object.keys(items).length&&!Object.keys(pas).length) throw new Error('CMS에서 시험지 '+sid+'의 문항을 읽지 못했습니다(로그인 상태를 확인해 주세요).');
    if(!(window.renderQuestionView&&window.DongaQuestionViewer)) throw new Error('CMS 문항 뷰어를 불러오지 못했습니다. 페이지를 새로고침한 뒤 다시 열어 주세요.');
    return N.cache[sid]={items,pas}; }
  async function showHtml(q){ const box=N.el.querySelector('[data-html]'); if(!box) return; const k=key(q);
    try{ const D=await sheetDoc(q.sid); if(!cur()||key(cur())!==k) return;
      const el=document.createElement('div'); box.innerHTML=''; box.appendChild(el);
      if(D.items[q.no]){ el.className='qv-item'; el.dataset.qvLayout='card'; window.renderQuestionView(el,D.items[q.no],'card'); }
      else if(D.pas[q.no]){ el.className='qv-passage'; window.renderPassageView(el,D.pas[q.no]); }
      else { box.textContent='CMS에서 이 문항을 찾지 못했습니다.'; return; }
      const I=q.liveIss||q.iss; if(window.__hmlMark) window.__hmlMark(el,I);
      if(window.__hmlMarkLayout) await window.__hmlMarkLayout(el,I); }
    catch(e){ box.textContent='HTML을 그리지 못했습니다: '+e.message; } }
  function go(dx){ if(!N.view.length) return; N.pos=Math.min(N.view.length-1,Math.max(0,N.pos+dx)); render(); if(N.follow) openEdit(); }
  async function recheckUi(sids,label){ if(N.busy){ msg('재검사 중입니다. 잠시 기다려 주세요.'); return; } N.busy=true; let gone=0, i=0;
    try{ for(const sid of sids){ i++; msg(label+' '+i+'/'+sids.length+' 재검사 중… (시험지 '+sid+')'); try{ gone+=(await recheck(sid)).gone; }catch(e){ msg('재검사 실패: '+e.message); if(/로그인/.test(e.message)) break; } }
      msg(label+' 끝: 고쳐져서 목록에서 빠진 문항 '+gone+'개'); }
    finally{ N.busy=false; render(); } }
  function toggleDone(){ const q=cur(); if(!q) return; const d=LS('hmlEditDone')||{}; const was=!!d[key(q)]; if(was) delete d[key(q)]; else d[key(q)]=Date.now(); LS('hmlEditDone',d);
    if(N.hideDone) applyFilter(); render();
    if(!was&&N.autoRe){ const sid=q.sid, k=key(q); recheckUi([sid],'완료한 시험지').then(()=>{ if(N.queue.some(x=>key(x)===k)) msg('재검사 결과: '+k+' 에 아직 차이가 남아 있습니다. 다시 확인해 주세요.'); }); } }

  async function open(){
    if(!N.el){ const el=document.createElement('div'); el.id='hmlEditNav';
      el.style.cssText='position:fixed;inset:0;z-index:2147483646;background:#fff;display:flex;flex-direction:column;font-family:sans-serif;color:#222';
      const B='border:0;padding:4px 10px;border-radius:4px;color:#fff;cursor:pointer;';
      el.innerHTML='<div style="display:flex;gap:8px;align-items:center;padding:8px 12px;border-bottom:1px solid #ddd;background:#f4f5f7;flex-wrap:wrap">'+
        '<b>수정 도우미</b><button data-p>◀ 이전</button><span data-c style="min-width:90px;text-align:center;font-weight:bold"></span><button data-n>다음 ▶</button>'+
        '<button data-done style="'+B+'background:#188038"></button>'+
        '<button data-o style="'+B+'background:#1a73e8">CMS 수정 창 열기</button>'+
        '<button data-r1 style="'+B+'background:#e37400">이 시험지 다시 검사</button>'+
        '<button data-ra style="'+B+'background:#7b1fa2">전체 최신화</button>'+
        '<select data-k><option value="all">전체</option><option value="내용">내용 수정만</option><option value="화면">화면 표시만</option></select>'+
        '<label><input type="checkbox" data-h> 완료 숨기기</label>'+
        '<label><input type="checkbox" data-f checked> 넘길 때 수정 창도 이동</label>'+
        '<label><input type="checkbox" data-a checked> 완료 시 자동 재검사</label>'+
        '<span style="flex:1"></span><span style="font-size:12px;color:#888">← → 이동 · Space 완료</span><button data-x>닫기</button></div>'+
        '<div style="padding:4px 12px;font-size:13px;background:#fffbe6;border-bottom:1px solid #eee"><span data-d style="color:#444"></span> · <span data-m style="color:#a35200"></span></div>'+
        '<div data-b style="flex:1;overflow:hidden;padding:12px 16px"></div>';
      document.body.appendChild(el); N.el=el;
      el.querySelector('[data-p]').onclick=()=>go(-1); el.querySelector('[data-n]').onclick=()=>go(1);
      el.querySelector('[data-o]').onclick=openEdit; el.querySelector('[data-done]').onclick=toggleDone;
      el.querySelector('[data-r1]').onclick=()=>{ const q=cur(); if(q) recheckUi([q.sid],'이 시험지'); };
      el.querySelector('[data-ra]').onclick=()=>{ const done=LS('hmlEditDone')||{}; const sids=[...new Set(N.queue.map(q=>q.sid))];
        if(confirm('목록에 남은 시험지 '+sids.length+'개를 CMS에서 다시 읽어 검사합니다(읽기만 함). 시험지당 10~20초 걸립니다. 시작할까요?')) recheckUi(sids,'전체 최신화'); };
      el.querySelector('[data-x]').onclick=()=>{ el.style.display='none'; };
      el.querySelector('[data-f]').onchange=e=>{ N.follow=e.target.checked; };
      el.querySelector('[data-a]').onchange=e=>{ N.autoRe=e.target.checked; };
      el.querySelector('[data-k]').onchange=e=>{ N.filter=e.target.value; N.pos=0; applyFilter(); render(); };
      el.querySelector('[data-h]').onchange=e=>{ N.hideDone=e.target.checked; applyFilter(); render(); };
      document.addEventListener('keydown',e=>{ if(!N.el||N.el.style.display==='none') return; if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)&&e.key!=='ArrowLeft'&&e.key!=='ArrowRight') return;
        if(e.key==='ArrowRight'){ e.preventDefault(); go(1); } else if(e.key==='ArrowLeft'){ e.preventDefault(); go(-1); } else if(e.key===' '){ e.preventDefault(); toggleDone(); } }, true);
      N.follow=true; N.autoRe=true; N.filter='all'; N.hideDone=false; }
    N.el.style.display='flex'; N.el.querySelector('[data-b]').innerHTML='<p style="padding:20px">문항 목록 만드는 중…</p>';
    if(!N.queue||!N.verdicts) await build(); applyFilter(); const p=LS('hmlEditPos'); N.pos=Math.max(0,N.view.findIndex(q=>key(q)===p)); render(); }

  N.open=open; N.build=build; N.recheck=recheck;
  let b=document.getElementById('hmlEditBtn');
  if(!b){ b=document.createElement('button'); b.id='hmlEditBtn'; b.style.cssText='position:fixed;left:20px;bottom:20px;z-index:2147483645;padding:12px 16px;font-size:15px;font-weight:bold;background:#d93025;color:#fff;border:0;border-radius:10px;box-shadow:0 4px 14px rgba(0,0,0,.3);cursor:pointer'; document.body.appendChild(b); }
  b.textContent='수정 도우미 열기'; b.onclick=open;
})();
