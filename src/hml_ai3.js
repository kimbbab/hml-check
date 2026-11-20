// AI 눈검수(ver3): 바로 검사(ver2) 옆 칸에 'AI 눈검수' 칸을 붙임.
// 버튼을 누르면 이 문항의 HML 캡처(문제·해답)와 HTML 내용을 AI(기본 Claude Haiku 5.5)에 보내 비교하고, 원하면 문제풀이·메타정보도 판단함.
// API 키와 캡처 이미지는 확장(배경)에서만 다룸: 이 페이지 코드는 키를 볼 수 없음. CMS에 쓰는 것은 수정안 [붙여넣기]·[반영]을 누를 때뿐.
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

  // ---------- 미리 돌린 눈검수 결과(HML_DOWNLOAD 폴더) ----------
  // 처음 한 번 폴더를 고르면 수정목록.json·시험지별 ai.json·메타점검.json을 읽어 문항ID별 색인을 만들고 이 브라우저(IndexedDB)에 저장.
  // 다음부터는 저장한 색인을 바로 씀(폴더 권한을 다시 묻지 않음). '새로 읽기'를 누를 때만 폴더를 다시 읽음.
  function idb(mode,fn){ return new Promise((ok,no)=>{ const r=indexedDB.open('hmlAi3',1); r.onupgradeneeded=()=>r.result.createObjectStore('kv');
    r.onerror=()=>no(r.error); r.onsuccess=()=>{ try{ const tx=r.result.transaction('kv',mode); const q=fn(tx.objectStore('kv')); tx.oncomplete=()=>{ ok(q&&q.result); r.result.close(); }; tx.onerror=tx.onabort=()=>{ no(tx.error); r.result.close(); }; }catch(e){ no(e); r.result.close(); } }; }); }
  const kvGet=k=>idb('readonly',st=>st.get(k)), kvPut=(k,v)=>idb('readwrite',st=>st.put(v,k));
  const readJson=async(dir,name)=>{ try{ return JSON.parse(await (await (await dir.getFileHandle(name)).getFile()).text()); }catch(e){ return null; } };
  async function buildIndex(root,msg){ const idx={}; const at=id=>idx[id]=idx[id]||{};
    const j=await readJson(root,'수정목록.json');
    if(j) for(const q of (j.queue||[])){ const id=q.itemId||((q.iss||[]).find(x=>x[1])||[])[1]; if(!id) continue; Object.assign(at(String(id)),{sid:q.sid,no:q.no,sname:q.sname,queue:q.iss||[]}); }
    // 검수자용 '꼭 수정 목록'(검수자목록.py가 만든 파일). 이 파일 하나만 있는 폴더를 골라도 됨
    const w=await readJson(root,'검수자목록.json'); let must=null;
    if(w&&Array.isArray(w.items)){ must=[]; for(const q of w.items){ if(!q.itemId) continue; const e=at(String(q.itemId)); e.sid=e.sid||q.sid; e.no=e.no||q.no; e.sname=e.sname||q.sname; e.must=q.iss||[]; e.tags=q.tags||[];
        must.push({id:String(q.itemId),sid:q.sid,no:q.no,sname:q.sname,row:q.row,tags:q.tags||[]}); } }
    // AI 수정본(수정본만들기.py): 수정안을 문항마다 붙임. 승인본(수정본_승인.json)이 있으면 그 수정안을 우선 씀
    const hmlOf=q=>(q.hml||[]).filter(x=>x&&x.slot&&(x.eq!=null||x.text!=null)&&x.to!=null).map(x=>({slot:x.slot,eq:x.eq,text:x.text,to:x.to,nth:x.nth||0,why:x.why||''}));
    const fx=await readJson(root,'수정본.json'), ap=await readJson(root,'수정본_승인.json'); let fixN=0;
    if(fx&&Array.isArray(fx.items)) for(const q of fx.items){ if(!q.itemId) continue; at(String(q.itemId)).fix={state:q.state,edits:(q.edits||[]).map(x=>({field:x.field,find:x.find,replace:x.replace,all:!!x.all,src:x.src,why:x.why})),note:q.note||'',hml_also:!!q.hml_also,hml:hmlOf(q)}; fixN++; }
    if(ap&&Array.isArray(ap.items)) for(const q of ap.items){ if(!q.itemId) continue; const e=at(String(q.itemId)); e.fix=Object.assign(e.fix||{note:''},{state:'준비',approved:true,hml_also:!!q.hml_also,hml:hmlOf(q),edits:(q.edits||[]).map(x=>({field:x.field,find:x.find,replace:x.replace,all:!!x.all,src:x.src,why:(x.why||'')}))}); }
    const dirs=[]; for await (const [name,h] of root.entries()) if(h.kind==='directory'&&/^\d+_/.test(name)) dirs.push([name,h]);
    let k=0, n=0; const one=async()=>{ while(k<dirs.length){ const [name,h]=dirs[k++]; n++; if(msg&&n%20===0) msg('폴더 읽는 중… '+n+'/'+dirs.length);
        const sid=name.split('_')[0]; const ai=await readJson(h,'ai.json'), me=await readJson(h,'메타점검.json');
        for(const [no,it] of Object.entries((ai&&ai.items)||{})){ if(!it||!it.itemId) continue; const e=at(String(it.itemId)); e.sid=e.sid||sid; e.no=e.no||no; e.sname=e.sname||name.slice(sid.length+1);
          if(it.vision) e.vision=it.vision; if(Array.isArray(it.problem)&&it.problem.length) e.problem=it.problem; if(ai.model) e.model=ai.model; }
        for(const [no,it] of Object.entries((me&&me.items)||{})){ if(!it||!it.itemId||!(it.issues||[]).length) continue; const e=at(String(it.itemId)); e.sid=e.sid||sid; e.no=e.no||no; e.meta=it.issues; } } };
    await Promise.all(Array.from({length:8},one));
    return {at:Date.now(),made:(j&&j.made)||(w&&w.made),sheets:dirs.length,n:Object.keys(idx).length,idx,must,mustMade:w&&w.made,mustTitle:w&&w.title,mustMissing:w&&w.missing,fixMade:fx&&fx.made,fixApproved:!!ap}; }
  async function loadPre(){ if(A.pre!==undefined) return A.pre; try{ A.pre=(await kvGet('index'))||null; }catch(e){ A.pre=null; } return A.pre; }
  async function connect(pick){ const P=box()&&box().querySelector('[data-pre]'); const say=t=>{ if(P) P.innerHTML='<span style="color:#666">'+esc(t)+'</span>'; };
    try{ let root=pick?null:await kvGet('root').catch(()=>null);
      if(root&&(await root.queryPermission({mode:'read'}))!=='granted'&&(await root.requestPermission({mode:'read'}))!=='granted') root=null;
      if(!root){ root=await window.showDirectoryPicker({id:'hml-archive',mode:'read'}); await kvPut('root',root).catch(()=>{}); }
      say('HML_DOWNLOAD 폴더를 읽는 중…'); const ix=await buildIndex(root,say); if(!ix.n) throw new Error('이 폴더에서 검수 결과(검수자목록.json, 수정본.json, 수정목록.json, 시험지 폴더의 ai.json)를 찾지 못했습니다. 그 파일이 있는 폴더를 골라 주세요.');
      await kvPut('index',ix).catch(()=>{}); A.pre=ix; lastId=null; tick(); }
    catch(e){ if(e.name==='AbortError') { showPre(itemIdOf()); return; } say('폴더를 읽지 못했습니다: '+e.message); } }
  // ---------- 꼭 수정 목록(검수자 모드): 목록 순서대로 이전/다음, 완료 표시(이 브라우저에 저장) ----------
  const doneMap=()=>{ try{ return JSON.parse(LS('hmlAi3MustDone')||'{}'); }catch(e){ return {}; } };
  function mustBar(ix,id){ const M=ix.must, d=doneMap(), i=M.findIndex(m=>m.id===String(id)), dn=M.filter(m=>d[m.id]).length, cur=i>=0?M[i]:null;
    const b=(k,t,ti)=>'<button data-mu="'+k+'" title="'+esc(ti||'')+'">'+t+'</button>';
    return '<div style="margin:-2px 0 6px;padding:6px 8px;border-radius:6px;background:#fff;border:2px solid #d93025">'+
      '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><b style="color:#d93025">꼭 수정 목록</b>'+
      '<span><b>'+(i>=0?(i+1):'–')+'</b> / '+M.length+'</span><span style="color:#188038">완료 '+dn+'</span>'+
      b('prev','◀ 이전','목록의 이전 문항')+b('next','다음 ▶','목록의 다음 문항(완료 숨김이면 안 끝난 것만)')+
      (cur?b('done',d[cur.id]?'완료 취소':'✓ 완료','이 문항을 다 고쳤으면 누르세요(이 브라우저에만 저장)'):b('first','처음 안 끝난 문항으로','목록에서 아직 안 끝난 첫 문항'))+
      '<label title="완료한 문항은 이전/다음에서 건너뜀"><input type="checkbox" data-muhide'+(LS('hmlAi3MustHide')!=='0'?' checked':'')+'> 완료 건너뛰기</label>'+
      '<label title="끄면 화면 표시 문제 등 미리 돌린 결과를 모두 보여 줌"><input type="checkbox" data-muonly'+(LS('hmlAi3MustOnly')!=='0'?' checked':'')+'> 꼭 수정만 보기</label></div>'+
      (cur?'<div style="font-size:12px;color:#555;margin-top:2px">시트 No '+esc(cur.row||'')+' · '+esc(cur.sname)+' · #'+esc(cur.no)+(d[cur.id]?' · <b style="color:#188038">✓ 완료</b>':'')+'</div>':'<div style="font-size:12px;color:#888;margin-top:2px">지금 문항은 꼭 수정 목록에 없습니다.</div>')+
      (ix.mustMissing?'<div style="font-size:11px;color:#888">아직 검사 안 된 시험지 '+esc(ix.mustMissing)+'개는 목록에 없음</div>':'')+'</div>'; }
  function gotoItem(id){ const url=location.pathname+Q+'itemId='+id; if(isModify()){ location.href=url; return; } if(K().go&&document.getElementById('hmlQuick')) K().go(url); else location.href=url; }
  function bindMust(P,ix,id){ const M=ix.must; if(!(M&&M.length)) return; const hide=()=>LS('hmlAi3MustHide')!=='0';
    const step=dir=>{ const d=doneMap(); let i=M.findIndex(m=>m.id===String(id)); if(i<0&&dir<0) i=M.length;
      for(let k=i+dir;k>=0&&k<M.length;k+=dir){ if(!(hide()&&d[M[k].id])) return gotoItem(M[k].id); }
      alert(dir>0?'목록의 끝입니다.':'목록의 처음입니다.'); };
    P.querySelectorAll('[data-mu]').forEach(btn=>btn.onclick=()=>{ const k=btn.getAttribute('data-mu');
      if(k==='prev') step(-1); else if(k==='next') step(1);
      else if(k==='first'){ const d=doneMap(); const m=M.find(m=>!d[m.id]); if(m) gotoItem(m.id); else alert('모두 완료했습니다.'); }
      else if(k==='done'){ const d=doneMap(); if(d[id]) delete d[id]; else d[id]=Date.now(); LS('hmlAi3MustDone',JSON.stringify(d)); showPre(id); if(d[id]&&hide()) step(1); } });
    const h=P.querySelector('[data-muhide]'); if(h) h.onchange=e=>LS('hmlAi3MustHide',e.target.checked?'1':'0');
    const o=P.querySelector('[data-muonly]'); if(o) o.onchange=e=>{ LS('hmlAi3MustOnly',e.target.checked?'1':'0'); showPre(id); }; }
  async function showPre(id){ const b=box(); if(!b) return; const P=b.querySelector('[data-pre]'); const ix=await loadPre();
    try{ statusBar(id); }catch(e){} if(!A.batchBusy) try{ batchBar(ix); }catch(e){}
    const tag=(t,c)=>'<span style="display:inline-block;padding:0 6px;border-radius:4px;color:#fff;font-size:12px;margin-right:6px;background:'+c+'">'+esc(t)+'</span>';
    if(!ix){ P.innerHTML='<b>미리 돌린 눈검수</b> <button data-con>HML_DOWNLOAD 폴더 연결</button> <span style="color:#666">처음 한 번만 고르면 문항마다 결과가 자동으로 나옵니다.</span>'; P.querySelector('[data-con]').onclick=()=>connect(true); return; }
    const M=ix.must, mustOnly=!!(M&&M.length)&&LS('hmlAi3MustOnly')!=='0';
    const e=ix.idx[String(id)]; const when=new Date(ix.made||ix.at).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
    const setEl=b.querySelector('[data-preset]');
    const reBtns='<button data-re title="HML_DOWNLOAD 폴더를 다시 읽음(합치기·수정본 만든 뒤에 누르세요)">새로 읽기</button> <button data-ch title="결과가 있는 다른 폴더 고르기">폴더 바꾸기</button> <span style="font-size:11px;color:#888">'+esc(when)+' 기준 · '+ix.n+'문항</span>';
    const bindRe=()=>{ b.querySelectorAll('[data-re]').forEach(x=>x.onclick=()=>connect(false)); b.querySelectorAll('[data-ch]').forEach(x=>x.onclick=()=>connect(true)); };
    if(mustOnly){ const d=doneMap(), i=M.findIndex(m=>m.id===String(id)), dn=M.filter(m=>d[m.id]).length, cur=i>=0?M[i]:null;
      const bt=(k,t,ti,st)=>'<button data-mu="'+k+'" title="'+esc(ti||'')+'"'+(st?' style="'+st+'"':'')+'>'+t+'</button>';
      let c='<div style="padding:6px 8px;border-radius:6px;background:#fff;border:2px solid '+(cur&&!d[cur.id]?'#d93025':'#188038')+'">'+
        '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><b style="color:#d93025">꼭 수정</b><span><b>'+(i>=0?(i+1):'–')+'</b> / '+M.length+'</span><span style="color:#188038;font-size:12px">완료 '+dn+'</span><span style="flex:1"></span>'+
        (isModify()?'<button data-omr title="OMR 정답이 비어 있으면 HTML 정답으로 채움(16 cm → 정답 16, 뒤 수식어 cm)">OMR 채우기</button>':'')+bt('prev','◀','목록의 이전 문항')+bt('next','▶','목록의 다음 문항')+
        (cur?bt('done',d[cur.id]?'완료 취소':'✓ 완료','다 고쳤으면 누르세요(이 브라우저에만 저장)',d[cur.id]?'':'background:#188038;color:#fff;border:0;border-radius:4px;padding:2px 8px;font-weight:bold'):bt('first','안 끝난 문항으로','목록에서 아직 안 끝난 첫 문항'))+'</div>';
      if(!cur) c+='<div style="font-size:12px;color:#888;margin-top:2px">이 문항은 꼭 수정 목록에 없습니다(고칠 것 없음).</div>';
      else{ c+='<div style="font-size:12px;color:#666;margin-top:2px">'+esc(cur.sname)+' · #'+esc(cur.no)+' · 시트 No '+esc(cur.row||'')+(d[cur.id]?' · <b style="color:#188038">✓ 완료</b>':'')+'</div>';
        const lines=((e&&e.must)||[]).map(x=>{ const t=String(x[3]||''), dd=String(x[4]||'');
          if(/원본 오류/.test(t)) return tag('원본 오류','#5f0000')+esc(dd)+' <span style="color:#888;font-size:11px">(HML·HTML·OMR 모두, 직접 판단)</span>';
          if(/정체 표기/.test(t)) return tag('정체','#00796b')+esc(dd);
          if(/엄격검사/.test(t)) return tag(/확인 필요/.test(t)?'엄격·확인':'엄격검사','#c2185b')+esc(dd);
          if(/확인 필요/.test(t+dd)) return tag('확인','#e37400')+esc(dd);
          if(/정답 의심|정답 차이/.test(t+dd)) return tag('정답','#d93025')+esc(x[2]==='AI'?dd:t+': '+dd);
          if(x[2]==='AI') return tag('눈검수','#7b1fa2')+esc(dd);
          const v=(x[5]&&typeof x[5]==='object')?x[5]:null; return tag('내용','#d93025')+esc(t)+(v&&v.reason?' <span style="color:#666">'+esc(v.reason)+'</span>':'')+'<div style="font-family:monospace;font-size:11px;color:#555;white-space:pre-wrap">'+esc(dd.slice(0,300))+'</div>'; });
        if(lines.length) c+='<ul style="margin:4px 0;padding-left:18px">'+lines.map(l=>'<li style="margin:2px 0">'+l+'</li>').join('')+'</ul>';
        c+=e&&e.fix?fixBlock(e,id,true):'<div style="font-size:12px;color:#888;border-top:1px dashed #ddd;padding-top:3px">수정안 없음 → 직접 고치세요</div>'; }
      if(ix.mustMissing) c+='<div style="font-size:11px;color:#aaa">아직 검사 안 된 시험지 '+esc(ix.mustMissing)+'개는 목록에 없음</div>';
      P.innerHTML=c+'<div data-omrmsg style="font-size:12px"></div></div>';
      if(setEl) setEl.innerHTML='<div style="margin:4px 0">'+reBtns+'</div><label title="완료한 문항은 ◀ ▶에서 건너뜀"><input type="checkbox" data-muhide'+(LS('hmlAi3MustHide')!=='0'?' checked':'')+'> 완료 건너뛰기</label> <label title="끄면 미리 돌린 결과를 모두 보여 줌"><input type="checkbox" data-muonly checked> 꼭 수정만 보기</label>';
      const om=P.querySelector('[data-omr]'); if(om) om.onclick=async()=>{ let r; try{ r=await fillOmr(); }catch(er){ r={ok:false,msg:'OMR 채우기 실패: '+er.message}; }
        if(!r) r={ok:true,msg:'OMR 정답이 이미 있거나 입력 칸이 없습니다(문항 형태 확인)'}; om.textContent=r.ok&&!r.warn?'OMR ✓':'OMR ⚠'; om.title=r.msg; A.omrWarn=r.warn?id:null;
        const m=P.querySelector('[data-omrmsg]'); if(m){ if(r.warn) m.innerHTML=omrWarnBox(r); else { m.textContent=r.msg; m.style.color='#188038'; } } };
      bindMust(b,ix,id); bindFix(P,e,id); bindRe(); return; }
    if(setEl) setEl.innerHTML=M&&M.length?'<label><input type="checkbox" data-muonly> 꼭 수정만 보기</label>':'';
    let h='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><b>미리 돌린 눈검수</b><span style="font-size:11px;color:#888">'+esc(when)+' 기준 · '+ix.n+'문항</span><span style="flex:1"></span><button data-re title="HML_DOWNLOAD 폴더를 다시 읽음(합치기 뒤에 누르세요)">새로 읽기</button><button data-ch title="눈검수 결과가 있는 다른 폴더 고르기">폴더 바꾸기</button></div>';
    if(M&&M.length) h=mustBar(ix,id)+h;
    if(e&&e.fix) h=fixBlock(e,id)+h;
    if(e&&mustOnly&&!e.must) h+='<div style="margin-top:4px;padding:4px 8px;border-radius:4px;background:#e6f4ea;color:#188038;font-weight:bold">✓ 꼭 수정 목록에 없는 문항입니다(고칠 것 없음)</div>';
    else if(e&&mustOnly){ const lines=e.must.map(x=>{ const t=String(x[3]||''), d=String(x[4]||'');
        if(/확인 필요/.test(t+d)) return tag('확인 필요','#e37400')+esc(d);
        if(/정답 의심|정답 차이/.test(t+d)) return tag('정답','#d93025')+esc(x[2]==='AI'?d:t+': '+d);
        if(x[2]==='AI') return tag('AI 눈검수','#7b1fa2')+esc(d);
        const v=(x[5]&&typeof x[5]==='object')?x[5]:null; return tag(v?'고칠 것':'눈 판정 전',v?'#d93025':'#e37400')+esc(t)+(v&&v.reason?' <span style="color:#666">'+esc(v.reason)+'</span>':'')+'<div style="font-family:monospace;font-size:11px;color:#555;white-space:pre-wrap">'+esc(d.slice(0,300))+'</div>'; });
      h+='<div style="margin-top:4px;color:#555;font-size:12px">시험지 '+esc(e.sid)+(e.sname?' '+esc(e.sname):'')+' · #'+esc(e.no)+'</div><ul style="margin:4px 0;padding-left:18px">'+lines.map(l=>'<li style="margin:2px 0">'+l+'</li>').join('')+'</ul>'; }
    else if(!e) h+='<div style="margin-top:4px;color:#666">이 문항은 미리 돌린 결과가 없습니다(검수 대상 아님 또는 걸린 것 없음). 필요하면 <b>AI 다시 검사</b>를 누르세요.</div>';
    else{ const lines=[]; let k=0; const vs=(e.vision&&e.vision.verdicts)||[];
      for(const x of (e.queue||[])){ if(x[2]==='화면') lines.push(tag('화면','#1a73e8')+esc(x[3])); else if(x[2]==='AI') lines.push(tag('AI 추가','#d93025')+esc(x[4]));
        else if(x[2]==='내용'){ k++; const v=(x[5]&&typeof x[5]==='object')?x[5]:null; lines.push(tag(v?(v.real?'고칠 것':'표기만 다름'):'눈 판정 전',v?(v.real?'#d93025':'#5f6368'):'#e37400')+esc(x[3])+(v&&v.reason?' <span style="color:#666">'+esc(v.reason)+'</span>':'')+'<div style="font-family:monospace;font-size:11px;color:#555;white-space:pre-wrap">'+esc(String(x[4]||'').slice(0,300))+'</div>'); } }
      if(!e.queue&&vs.length) vs.forEach(v=>lines.push(tag(v.real?'고칠 것':'표기만 다름',v.real?'#d93025':'#5f6368')+esc(v.reason)));
      if(!e.queue&&e.vision) ((e.vision.other)||[]).forEach(o=>lines.push(tag('AI 추가','#d93025')+esc(o.detail)));
      (e.problem||[]).forEach(p=>lines.push(tag('문제 오류?','#a142f4')+esc((p.type||'')+' · '+(p.where||'')+': '+(p.detail||''))));
      (e.meta||[]).forEach(m=>lines.push(tag('메타 '+(m['항목']||''),'#e37400')+esc(m['내용']||'')+(m['제안']?' <span style="color:#666">→ '+esc(m['제안'])+'</span>':'')));
      const real=(e.queue||[]).some(x=>x[2]==='AI'||(x[2]==='내용'&&!(x[5]&&x[5].real===false)))||vs.some(v=>v.real)||(e.problem||[]).length||(e.meta||[]).length;
      h+='<div style="margin-top:4px;color:#555;font-size:12px">시험지 '+esc(e.sid)+(e.sname?' '+esc(e.sname):'')+' · #'+esc(e.no)+'</div>';
      h+=lines.length?'<ul style="margin:4px 0;padding-left:18px">'+lines.map(l=>'<li style="margin:2px 0">'+l+'</li>').join('')+'</ul>':'';
      if(!real) h+='<div style="margin-top:4px;padding:4px 8px;border-radius:4px;background:#e6f4ea;color:#188038;font-weight:bold">✓ 미리 검수: 고칠 내용 없음'+(e.queue?'':' (표기 차이뿐)')+'</div>';
      h+='<div style="font-size:11px;color:#888;margin-top:2px">미리 검수한 때의 결과입니다. 그 뒤 고쳤다면 바로 검사(아래) 결과가 최신입니다.</div>'; }
    P.innerHTML=h; bindMust(b,ix,id); bindFix(P,e,id); const re=P.querySelector('[data-re]'); if(re) re.onclick=()=>connect(false); const ch=P.querySelector('[data-ch]'); if(ch) ch.onclick=()=>connect(true); }

  // ---------- AI 수정본 붙여넣기(수정본.json): 꼭 수정 문항의 HTML 수정안을 보여 주고, 수정 화면에 붙여넣고, 전체 반영 ----------
  // 수정 화면은 문항 문서를 <script type="application/json">에 담아 두고 [HTML 수정] 탭을 열 때 편집기를 만든다.
  // 편집기가 만들어지기 전에 이 JSON 안의 글을 고치면, 편집기도 [전체 반영]도 고친 글을 쓴다.
  const FX={ log:()=>{ try{ return JSON.parse(LS('hmlAi3FixLog')||'{}'); }catch(e){ return {}; } }, saveLog:v=>LS('hmlAi3FixLog',JSON.stringify(v)) };
  const isModify=()=>/\/item\/all\/modify\.donga/.test(location.pathname);
  const loadedId=()=>{ try{ const n=performance.getEntriesByType('navigation')[0]; return (String(n&&n.name||location.href).match(/itemId=(\d+)/)||[])[1]; }catch(e){ return itemIdOf(); } };
  const jsonEls=(W=window)=>[...W.document.querySelectorAll('script[type="application/json"]')].filter(el=>{ const p=panelEl(); return !(p&&p.contains(el))&&/Html"|"content"/.test(el.textContent); });
  const mounted=(W=window)=>{ try{ return Object.keys(W.itemEditors||{}).filter(k=>W.itemEditors[k]).length>0; }catch(e){ return false; } };
  const htmlTab=(W=window)=>[...W.document.querySelectorAll('.nav-link,[role=tab],button,a')].find(b=>b.textContent.trim()==='HTML 수정'&&!(panelEl()&&panelEl().contains(b)));
  function walkStr(o,path,fn){ Object.keys(o||{}).forEach(k=>{ const v=o[k], p=path.concat(k); if(typeof v==='string') fn(o,k,v,p); else if(v&&typeof v==='object') walkStr(v,p,fn); }); }
  function pathHit(p,field){ const m=String(field).match(/^(\w+)(?:\[(\d+)\])?$/); if(!m) return false; const i=p.lastIndexOf(m[1]); if(i<0) return false; return m[2]==null?i===p.length-1:String(p[i+1])===m[2]; }
  function pasteDocs(edits,W=window){
    const els=jsonEls(W); if(!els.length) throw new Error('문항 문서(JSON)를 찾지 못했습니다');
    const docs=els.map(el=>{ try{ return JSON.parse(el.textContent); }catch(e){ return null; } }); const rep=[], doneAll={};
    const lay=x=>(String(x).match(/<(?:img|table|tbody|thead|tr|td|th|col|colgroup|figure)\b[^>]*>|<\/(?:table|tr|td|th|figure)>|\b(?:width|height|style|src|colspan|rowspan)\s*=\s*(?:\"[^\"]*\"|'[^']*')/gi)||[]).sort().join('\n');
    for(const ed of edits){
      if(lay(ed.find)!==lay(ed.replace)){ rep.push({ok:false,ed,msg:'표·그림 서식(태그·크기·위치)이 바뀌는 수정이라 막음 → 직접 고치세요'}); continue; }
      if(ed.all){ const key=ed.find+'\u0000'+ed.replace; if(doneAll[key]){ rep.push({ok:true,ed,msg:'앞에서 함께 바꿈'}); continue; }
        let n=0; docs.forEach(d=>d&&walkStr(d,[],(o,k,v)=>{ if(v.includes(ed.find)){ n+=v.split(ed.find).length-1; o[k]=v.split(ed.find).join(ed.replace); } }));
        doneAll[key]=1; rep.push(n?{ok:true,ed,msg:n+'곳'}:{ok:true,ed,msg:'이미 고쳐짐',already:true}); continue; }
      const has=x=>{ let f=false; docs.forEach(d=>d&&walkStr(d,[],(o,k,v)=>{ if(!/Text$/.test(k)&&v.includes(x)) f=true; })); return f; };
      const hits=[], any=[];
      docs.forEach(d=>d&&walkStr(d,[],(o,k,v,p)=>{ const c=v.split(ed.find).length-1; if(c){ const h={o,k,c,p}; any.push(h); if(pathHit(p,ed.field)) hits.push(h); } }));
      const use=hits.length?hits:any.filter(h=>!/Text$/.test(h.k));
      if(!use.length){ if(ed.replace&&has(ed.replace)){ rep.push({ok:true,ed,msg:'이미 고쳐짐',already:true}); continue; } rep.push({ok:false,ed,msg:'찾을 글이 화면에 없음'}); continue; }
      if(use.some(h=>h.c!==1)){ rep.push({ok:false,ed,msg:'찾을 글이 여러 번'}); continue; }
      use.forEach(h=>{ h.o[h.k]=h.o[h.k].replace(ed.find,()=>ed.replace); }); rep.push({ok:true,ed,msg:'바꿈'}); }
    if(rep.some(r=>!r.ok)) return {ok:false,rep};
    const before={}; els.forEach((el,i)=>{ if(!docs[i]) return; const t=JSON.stringify(docs[i]); if(t!==JSON.stringify(JSON.parse(el.textContent))){ before[el.id||('json-'+i)]=el.textContent; el.textContent=t; } });
    return {ok:true,rep,before}; }
  // 창이 가려지면 브라우저가 setTimeout을 크게 늦춤(일괄 중 멈춘 것처럼 보임) → Worker 타이머
  const TW=(()=>{ try{ const w=new Worker(URL.createObjectURL(new Blob(['onmessage=function(e){setTimeout(function(){postMessage(e.data)},e.data.ms)}'],{type:'text/javascript'}))); const cb={}; let n=0; w.onmessage=e=>{ const f=cb[e.data.id]; delete cb[e.data.id]; if(f) f(); }; return ms=>new Promise(r=>{ const id=++n; cb[id]=r; w.postMessage({id,ms}); }); }catch(e){ return null; } })();
  const nap=ms=>TW?TW(ms):new Promise(r=>setTimeout(r,ms));
  async function waitFor(fn,ms,what){ const t0=Date.now(); while(Date.now()-t0<ms){ let v; try{ v=fn(); }catch(e){ if(e&&e.hard) throw e; v=null; } if(v) return v; await nap(250); } throw new Error('시간 초과: '+what); }
  function fixMsg(t,c){ const m=box()&&box().querySelector('[data-fxmsg]'); if(m){ m.textContent=t; m.style.color=c||'#333'; } }
  async function verifyFix(id,edits){ let t=await (await fetch('/item/all/detail.donga'+Q+'itemId='+id,{credentials:'include'})).text();
    t=t.replace(/\\u([0-9a-fA-F]{4})/g,(_,h)=>String.fromCharCode(parseInt(h,16))).replace(/\\\//g,'/').replace(/\\"/g,'"');
    const ta=document.createElement('textarea'); ta.innerHTML=t; const t2=ta.value, has=s=>t.includes(s)||t2.includes(s), bad=[];
    edits.forEach(ed=>{ if(ed.all){ if(!ed.replace.includes(ed.find)&&has(ed.find)) bad.push('남아 있음: '+ed.find.slice(0,30)); } else if(!ed.replace.includes(ed.find)&&has(ed.find)&&!has(ed.replace)) bad.push('안 바뀜: '+ed.find.slice(0,30)); });
    return bad; }

  // ---------- HML 원본 고치기: 수정 화면의 [한글 편집기]를 열어 수식·글자를 바꾸고 편집기 [저장]까지(전체 반영은 [반영]에서) ----------
  // 수정안 hml: [{slot:'question'|'explain'|'passage'|'translation', eq:'바꿀 수식'|text:'바꿀 글자', to:'새 내용', nth:같은 수식이 여러 개면 몇 번째}]
  const HSLOT={passage:'지문',translation:'지문해석',question:'문제',explain:'해답'}, HORDER=['passage','translation','question','explain'];
  const nz=x=>String(x==null?'':x).replace(/\s+/g,'');
  function hEqs(H){ const l=[]; let c=H.HeadCtrl, n=0; while(c&&n++<5000){ if(c.CtrlID==='eqed') l.push(c); c=c.Next; } return l; }
  const hEq=c=>{ const p=c.Properties; return p?p.Item('String'):''; };
  function openHwp(W=window){ const o=W.document.querySelector('[data-editor-url]'); if(!o) return null; return W.open(o.dataset.editorUrl,'webhwpEditor','width=1280,height=900,resizable=yes'); }
  async function hmlRun(ed,hml,say,W=window){
    const by={}; hml.forEach(x=>(by[x.slot]=by[x.slot]||[]).push(Object.assign({},x))); const slots=HORDER.filter(s=>by[s]);
    if(!slots.length) throw new Error('HML 수정안의 slot이 없음');
    try{ Object.keys(W.webhwpSavedHml||{}).forEach(k=>delete W.webhwpSavedHml[k]); Object.keys(W.webhwpSavedImage||{}).forEach(k=>delete W.webhwpSavedImage[k]); }catch(e){}
    const st=()=>{ const x=ed.document.querySelector('[data-webhwp-status]'); return x?x.textContent.trim():''; }, Hf=()=>ed.document.getElementById('webhwpFrame').contentWindow.HwpCtrl;
    const closeM=()=>{ try{ ed.document.querySelectorAll('.modal.show').forEach(m=>{ const b=m.querySelector('[data-alert-ok],.btn-primary[data-bs-dismiss],[data-bs-dismiss=modal]'); if(b) b.click(); }); }catch(e){} };
    const hard=m=>{ const e=new Error(m); e.hard=1; return e; };
    const until=async(fn,ms,w)=>{ const t0=Date.now(); while(Date.now()-t0<ms){ let v; try{ v=fn(); }catch(e){ if(e&&e.hard) throw e; v=null; } if(v) return v; await nap(250); } throw new Error('시간 초과: '+w); };
    say('한글 편집기 여는 중…');
    await until(()=>ed.document.readyState==='complete'&&ed.document.querySelector('[data-webhwp-action=save]'),60000,'편집기 열기');
    await until(()=>/열었습니다/.test(st()),90000,'첫 파일 열기');
    const done=[];
    for(const s of slots){ const b=ed.document.querySelector('[data-webhwp-open][data-slot='+s+']'); if(!b) throw new Error(HSLOT[s]+' 버튼이 없음'); closeM();
      if(!b.classList.contains('active')){ ed.document.querySelector('[data-webhwp-status]').textContent=''; b.click();
        await until(()=>{ if(/못했습니다/.test(st())) throw hard(HSLOT[s]+' 파일을 열지 못함'); return /열었습니다/.test(st())&&b.classList.contains('active'); },90000,HSLOT[s]+' 열기'); }
      await nap(800); const H=Hf(), eqs=hEqs(H), probs=[];
      const findTxt=t=>{ H.MovePos(2); const a=H.CreateAction('RepeatFind'), z=a.CreateSet(); a.GetDefault(z); z.SetItem('FindString',t); z.SetItem('Direction',0); z.SetItem('IgnoreMessage',1); return a.Execute(z); };
      by[s].forEach((x,i)=>{ if(x.eq==null) return; const hit=eqs.filter(c=>nz(hEq(c))===nz(x.eq));
        if(!hit.length&&eqs.some(c=>nz(hEq(c))===nz(x.to))){ x._done=1; return; }   // 이미 고쳐짐
        if(x.nth){ if(hit.length<x.nth) probs.push('"'+x.eq+'" '+hit.length+'개뿐'); else x._c=hit[x.nth-1]; } else if(hit.length!==1) probs.push('"'+x.eq+'" '+hit.length+'개'); else x._c=hit[0]; });
      if(probs.length) throw new Error(HSLOT[s]+' 수식이 안 맞아 HML은 저장 안 함: '+probs.join(', ')+' (이 칸 수식: '+eqs.map(hEq).join(' | ').slice(0,300)+')');
      for(const x of by[s]) if(x.eq==null&&!findTxt(x.text)&&findTxt(x.to)) x._done=1;   // 글자도 이미 고쳐졌으면 건너뜀
      if(by[s].every(x=>x._done)){ say(HSLOT[s]+' HML은 이미 고쳐져 있음'); continue; }
      for(const x of by[s]){ if(x._done) continue;
        if(x.eq!=null){ const p=x._c.Properties; p.SetItem('String',x.to); x._c.Properties=p; if(nz(hEq(x._c))!==nz(x.to)) throw new Error('수식 바꾸기 반영 안 됨: '+x.eq); }
        else { if(!findTxt(x.text)) throw new Error(HSLOT[s]+' 글자 "'+x.text+'" 없음'); H.Run('Delete'); const ia=H.CreateAction('InsertText'), is=ia.CreateSet(); ia.GetDefault(is); is.SetItem('Text',x.to); if(!ia.Execute(is)) throw new Error('글자 넣기 실패'); } }
      say(HSLOT[s]+' 저장 중…'); closeM(); const before=W.webhwpSavedHml[s]||'';
      ed.document.querySelector('[data-webhwp-action=save]').click();
      await until(()=>{ if(/실패|읽지 못했습니다/.test(st())) throw hard(HSLOT[s]+' 저장 실패: '+st()); return (W.webhwpSavedHml[s]||'')!==before&&W.webhwpSavedImage[s]; },120000,HSLOT[s]+' 저장');
      await until(()=>!/중입니다/.test(st()),60000,HSLOT[s]+' 다시 열기'); await nap(800); closeM();
      const after=hEqs(Hf()).map(hEq), miss=by[s].filter(x=>x.eq!=null&&!x._done&&!after.some(a=>nz(a)===nz(x.to)));
      if(miss.length) throw new Error(HSLOT[s]+' 저장 뒤 확인 실패: '+miss.map(x=>x.to).join(', '));
      done.push(s); }
    try{ ed.close(); }catch(e){}
    return done; }
  async function doHml(id,e,ed){ const f=e.fix; if(!f.hml||!f.hml.length) return;
    if(!isModify()||loadedId()!==String(id)){ fixMsg('이 문항의 수정 화면에서 누르세요.','#d93025'); return; }
    ed=ed||openHwp(); if(!ed){ fixMsg('팝업이 막혔습니다. 팝업 허용 후 [HML 고치기]를 누르세요.','#d93025'); return; }
    try{ const done=await hmlRun(ed,f.hml,t=>fixMsg(t));
      const L=FX.log(); L[id]=Object.assign(L[id]||{},{hml:'HML 저장',at:Date.now()}); FX.saveLog(L); A.fxHml=id;
      const im=box()&&box().querySelector('[data-fximg]'); if(im) im.innerHTML=done.map(s=>'<div style="font-size:12px;margin-top:4px"><b>'+HSLOT[s]+' 새 캡처</b><br><img src="'+esc(window.webhwpSavedImage[s])+'" style="max-width:100%;border:1px solid #ccc"></div>').join('');
      return done; }
    catch(er){ try{ ed.close(); }catch(x){} throw er; } }
  function doPaste(id,e,auto){ const f=e.fix;
    if(A.fxNeedHml===id&&A.fxPasted===id&&isModify()&&loadedId()===String(id)){ A.fxNeedHml=null; doHml(id,e).then(d=>{ if(d) fixMsg('HML 저장함(아래 새 캡처 확인). HTML 탭도 확인하고 [반영].','#188038'); }).catch(er=>fixMsg('HML 고치지 못함: '+er.message+' → [반영]하지 말고 새로고침하세요.','#d93025')); return; }
    if(!isModify()||loadedId()!==String(id)){ location.href='/item/all/modify.donga'+Q+'itemId='+id+'#hmlFix'; return; }
    if(mounted()){ history.replaceState(null,'',location.pathname+location.search+'#hmlFix'); location.reload(); return; }
    const hasH=f.hml&&f.hml.length, ed=hasH&&!auto?openHwp():null;   // 팝업은 클릭 안에서 바로 열어야 막히지 않음
    const r=pasteDocs(f.edits||[]);
    if(!r.ok){ if(ed) try{ ed.close(); }catch(x){} fixMsg('붙여넣지 않았습니다: '+r.rep.filter(x=>!x.ok).map(x=>x.ed.field+' '+x.msg).join(' / '),'#d93025'); return; }
    const L=FX.log(); L[id]={st:'붙여넣음',at:Date.now(),before:r.before}; FX.saveLog(L);
    A.fxPasted=id; (async()=>{ let om=null; try{ om=await fillOmr(); }catch(er){ om={ok:false,warn:true,msg:'OMR 채우기 실패: '+er.message}; }
      A.omrWarn=om&&om.warn?id:null; if(!A.omrWarn){ const tab=htmlTab(); if(tab) try{ tab.click(); }catch(er){} }
      await showPre(id); if(A.omrWarn){ const pp=box()&&box().querySelector('[data-pre]'); if(pp) pp.insertAdjacentHTML('beforeend',omrWarnBox(om)); } const pm=(r.rep.length?'HTML 붙여넣음('+r.rep.map(x=>x.msg).join(', ')+'). ':'')+(om?om.msg+'. ':'');
      if(hasH&&!ed){ fixMsg(pm+'HML도 고치려면 [수정]을 한 번 더 누르세요(편집기 팝업은 클릭이 필요).','#b06000'); A.fxNeedHml=id; return; }
      if(hasH){ try{ await doHml(id,e,ed); }catch(er){ fixMsg(pm+'HML은 고치지 못함: '+er.message+' → [반영]하지 말고 새로고침하세요.','#d93025'); return; } }
      fixMsg(pm+(hasH?'HML 저장함(아래 새 캡처 확인). ':'')+'HTML 탭에서 확인하고 [반영]을 누르세요. 잘못됐으면 새로고침하면 원래대로.',om&&!om.ok?'#b06000':'#188038'); })(); }
  function doUndo(id){ const L=FX.log(); const b=L[id]&&L[id].before; if(!b){ fixMsg('되돌릴 기록이 없습니다.','#d93025'); return; }
    if(!isModify()||loadedId()!==String(id)){ location.href='/item/all/modify.donga'+Q+'itemId='+id+'#hmlFixUndo'; return; }
    if(mounted()){ history.replaceState(null,'',location.pathname+location.search+'#hmlFixUndo'); location.reload(); return; }
    let n=0; jsonEls().forEach((el,i)=>{ const k=el.id||('json-'+i); if(k in b){ el.textContent=b[k]; n++; } });
    if(!n){ fixMsg('되돌릴 칸을 이 화면에서 찾지 못했습니다.','#d93025'); return; }
    L[id].st='되돌림'; FX.saveLog(L); const tab=htmlTab(); if(tab) tab.click(); A.fxPasted=null;
    fixMsg('원래 글로 되돌렸습니다. 반영된 문항이었다면 [반영]을 눌러야 저장됩니다.','#b06000'); }
  async function doApply(id,e){ if(!isModify()||A.fxPasted!==id){ fixMsg('먼저 [수정]을 누르세요.','#d93025'); return; }
    if(e.fix.hml&&e.fix.hml.length&&A.fxHml!==id){ fixMsg('HML 수정안이 있습니다. 먼저 [HML 고치기]를 누르세요.','#d93025'); return; }
    if(typeof window.itemApplyAll!=='function'){ fixMsg('전체 반영 기능을 찾지 못했습니다.','#d93025'); return; }
    if(A.omrWarn===id&&!confirm('OMR을 자동으로 넣었지만 확인이 필요한 문항입니다. OMR 수정 탭에서 확인했나요?')) return;
    fixMsg('전체 반영 중…'); window.itemApplyAll();
    const modal=document.getElementById('applyAllModal');
    try{ await waitFor(()=>modal&&modal.classList.contains('show'),5000,'확인창'); }catch(er){ fixMsg('전체 반영이 막혔습니다(필수 항목·정답 등). 화면 안내를 확인하세요.','#d93025'); return; }
    LS('hmlAi3FixPending',JSON.stringify({id,edits:e.fix.edits||[],at:Date.now()}));
    await new Promise(r=>setTimeout(r,300)); modal.querySelector('[data-action-ok]').click(); }

  // ---------- 승인: 문항 상세의 상태값(viewFlag)을 승인(사용, Y)으로 저장. 세트 문항이면 세트 전체가 함께 바뀜 ----------
  const isDetail=(W=window)=>/\/item\/all\/detail\.donga/.test(W.location.pathname);
  const toastOf=W=>{ try{ return [...W.document.querySelectorAll('.toast,.toast-body,[role=alert]')].map(e=>e.innerText.trim()).filter(Boolean).join(' / '); }catch(e){ return ''; } };
  const STN={D:'폐기',R:'초안',F:'실패',N:'승인(미사용)',Y:'승인(사용)'};
  function curStatus(W=window){ const f=W.document.getElementById('statusFields'); const c=f&&f.querySelector('input[name=viewFlag]:checked'); return c?c.value:''; }
  async function approveIn(W=window){
    const f=W.document.getElementById('statusFields'), sv=W.document.querySelector('[data-status-save]');
    if(!f||!sv) throw new Error('상태 칸을 찾지 못함(문항 상세 화면이 아님)');
    if(curStatus(W)==='Y') return '이미 승인(사용)';
    if(f.disabled) throw new Error('상태를 바꿀 수 없음(폐기 등)');
    const y=f.querySelector('input[name=viewFlag][value=Y]'); if(!y||y.disabled) throw new Error('승인(사용) 선택 불가');
    y.click(); await nap(300); const od=W.document; sv.click();
    const m=await waitFor(()=>{ const sh=W.document.querySelector('#statusSaveModal.show,#statusSetModal.show,#statusDiscardModal.show'); if(sh) return sh; const t=toastOf(W); if(/승인할 수 없|실패|오류|필수/.test(t)) throw new Error(t); return null; },8000,'승인 확인창').catch(er=>{ const t=toastOf(W); throw new Error(t||er.message); });
    if(m.id==='statusDiscardModal') throw new Error('폐기 확인창이 떠서 멈춤');
    await new Promise(r=>setTimeout(r,300)); m.querySelector('[data-action-ok]').click();
    await waitFor(()=>{ let gone=false; try{ gone=W.document!==od; }catch(e){} return gone&&W.document.readyState!=='loading'&&W.document.getElementById('statusFields'); },60000,'승인 저장');
    if(curStatus(W)!=='Y') throw new Error('저장 뒤에도 승인(사용)이 아님 '+toastOf(W));
    return m.id==='statusSetModal'?'승인(사용) 세트 전체':'승인(사용)'; }
  function statusBar(id){ const el=box()&&box().querySelector('[data-st]'); if(!el) return;
    if(!isDetail()){ el.innerHTML='<button data-appr title="문항 상세로 가서 승인(사용)으로 저장">승인(사용)으로</button>'; el.querySelector('[data-appr]').onclick=()=>{ location.href='/item/all/detail.donga'+Q+'itemId='+id+'#hmlApprove'; }; return; }
    const c=curStatus(); el.innerHTML='<span style="font-size:12px">상태: <b>'+esc(STN[c]||c||'?')+'</b></span> '+(c==='Y'?'':'<button data-appr style="background:#188038;color:#fff;border:0;border-radius:4px;padding:2px 8px;font-weight:bold">승인(사용)으로</button>')+' <span data-stmsg style="font-size:12px"></span>';
    const b=el.querySelector('[data-appr]'); if(b) b.onclick=()=>{ const m=el.querySelector('[data-stmsg]'); m.textContent='저장 중…'; approveIn().then(t=>{ m.style.color='#188038'; m.textContent=t; setTimeout(()=>statusBar(id),1500); }).catch(er=>{ m.style.color='#d93025'; m.textContent=er.message; }); };
    if(location.hash==='#hmlApprove'){ history.replaceState(null,'',location.pathname+location.search); if(b) b.click(); } }

  // ---------- 일괄: 수정안이 있는 문항을 차례로 [수정 → 반영 → 확인 → 승인]. 사람 버튼 없이 작업 창(팝업)에서 ----------
  // 안전장치: 수정안이 화면과 하나라도 안 맞거나, HML 저장 뒤 확인 실패, 반영 막힘, 반영 뒤 상세에서 확인 실패 → 그 문항은 반영·승인 안 하고 건너뜀.
  // 연속 3번 실패하면 멈춤. 기록은 localStorage 'hmlAi3BatchLog'(이어하기·CSV). 한 번에 몇 문항만 돌릴지 정함(처음엔 5).
  const BL={ get:()=>{ try{ return JSON.parse(LS('hmlAi3BatchLog')||'{}'); }catch(e){ return {}; } }, set:v=>LS('hmlAi3BatchLog',JSON.stringify(v)) };
  // 새 문서가 열렸는지는 document가 바뀌었는지로 봄(빈 창(about:blank)에서 처음 열 때는 window가 그대로 재사용돼 표시를 못 씀)
  async function navTo(W,url,ready,what){ let od=null; try{ od=W.document; }catch(e){} W.location.href=url;
    return waitFor(()=>{ let fresh=false; try{ fresh=W.document!==od&&W.document.readyState!=='loading'&&String(W.location.href).includes(url); }catch(e){ return null; }
      if(fresh&&/login/i.test(W.location.pathname)) throw Object.assign(new Error('CMS 로그인이 풀림'),{stop:1}); return fresh&&ready(W); },60000,what); }
  // 수정 내역(지우지 않고 계속 쌓임, IndexedDB 'batchDetail'): 문항마다 무엇을 → 무엇으로 바꿨는지
  async function detailAdd(rows){ if(!rows.length) return; try{ const cur=(await kvGet('batchDetail'))||[]; cur.push(...rows); await kvPut('batchDetail',cur); }catch(e){} }
  async function detailCsv(){ const D=(await kvGet('batchDetail').catch(()=>null))||[];
    const rows=[['시각','문항ID','시험지','번호','구분','칸','고치기 전','고친 뒤','비고']].concat(D.map(r=>[new Date(r.at).toLocaleString('ko-KR'),r.id,r.sname||r.sid||'',r.no||'',r.kind,r.field||'',r.from||'',r.to||'',r.note||'']));
    const csv='\ufeff'+rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='일괄수정_내역_'+new Date().toISOString().slice(0,10)+'.csv'; a.click(); return D.length; }
  async function batchOne(W,id,f,opt,say,det){ det=det||[]; const at=Date.now(), add=(kind,field,from,to,note)=>det.push({at,id:String(id),kind,field,from,to,note});
    const t0=Date.now(), step=t=>say(id+': '+t+' ('+Math.round((Date.now()-t0)/1000)+'초)');
    step('수정 화면 여는 중');
    try{ await navTo(W,'/item/all/modify.donga'+Q+'itemId='+id,w=>w.document.querySelector('[data-editor-url]')&&typeof w.itemApplyAll==='function'&&jsonEls(w).length,'수정 화면'); }
    catch(er){ if(er.stop) throw er; let d=''; try{ d=' [주소 '+W.location.pathname+W.location.search+' · 상태 '+W.document.readyState+' · 한글편집기 '+(W.document.querySelector('[data-editor-url]')?'O':'X')+' · 전체반영 '+(typeof W.itemApplyAll)+' · 문서 '+jsonEls(W).length+']'; }catch(e){ d=' [작업 창을 읽지 못함]'; }
      throw Object.assign(new Error(er.message+d),{stop:1}); }   // 화면 감지가 안 되면 다음 문항도 같을 것이라 바로 멈춤
    await nap(500);
    if(mounted(W)) throw new Error('HTML 편집기가 먼저 열려 있음');
    const r=pasteDocs(f.edits||[],W); if(!r.ok) throw new Error('HTML 수정안 안 맞음: '+r.rep.filter(x=>!x.ok).map(x=>(x.ed.field||'')+' '+x.msg).join(' / '));
    let om=null; try{ om=await fillOmr(W); }catch(er){ om={ok:false,msg:er.message}; } if(om&&!om.ok) throw new Error('OMR: '+om.msg);
    const htmlCh=r.rep.some(x=>!x.already), omrCh=!!(om&&om.ok&&!om.skip), already=r.rep.filter(x=>x.already).length;
    r.rep.forEach(x=>{ if(!x.already) add('HTML',x.ed.field||'',x.ed.find,x.ed.replace,x.ed.src||''); });
    if(omrCh) add('OMR','정답','(빈칸)',om.msg||'',om.warn?'확인 필요':'');
    let hdone=[]; if(f.hml&&f.hml.length){ step('HML 고치는 중'); const ed=openHwp(W); if(!ed) throw Object.assign(new Error('편집기 팝업이 막힘 → 이 사이트 팝업 허용'),{stop:1});
      try{ hdone=await hmlRun(ed,f.hml,t=>step(t),W); }catch(er){ try{ ed.close(); }catch(x){} throw new Error('HML: '+er.message); }
      f.hml.filter(h=>hdone.includes(h.slot)&&!h._done).forEach(h=>add('HML',(HSLOT[h.slot]||h.slot)+(h.eq!=null?' 수식':' 글자'),h.eq!=null?h.eq:h.text,h.to,h.why||'')); }
    let ap='';
    const approve=async()=>{ step('승인 중');
      if(!isDetail(W)||!String(W.location.search).includes('itemId='+id)) await navTo(W,'/item/all/detail.donga'+Q+'itemId='+id,w=>w.document.getElementById('statusFields')&&w.document.querySelector('[data-status-save]'),'상세 화면');
      try{ ap=await approveIn(W); }catch(er){ throw Object.assign(new Error('반영됨, 승인 실패: '+er.message),{applied:1}); }
      if(!/이미/.test(ap)) add('승인','상태','',ap,''); };
    if(!htmlCh&&!omrCh&&!hdone.length){   // 바꿀 것이 없음 = 이미 고쳐진 문항 → 반영 없이(승인만) 넘어감
      if(opt.approve) await approve();
      return '이미 수정됨(반영 안 함)'+(ap?' · '+ap:''); }
    step('전체 반영 중'); const od=W.document; W.itemApplyAll();
    const modal=W.document.getElementById('applyAllModal');
    try{ await waitFor(()=>modal&&modal.classList.contains('show'),6000,'반영 확인창'); }catch(er){ throw new Error('전체 반영 막힘: '+(toastOf(W)||'필수 항목·정답 등')); }
    await nap(300); modal.querySelector('[data-action-ok]').click();
    await waitFor(()=>{ let gone=false; try{ gone=W.document!==od&&W.document.readyState!=='loading'; }catch(e){} return gone; },90000,'반영 저장');
    if(/modify\.donga/.test(W.location.pathname)) throw new Error('반영 뒤에도 수정 화면에 머묾: '+toastOf(W));
    const bad=await verifyFix(id,f.edits||[]).catch(er=>['확인 못함: '+er.message]); if(bad.length) throw Object.assign(new Error('반영했지만 확인 필요: '+bad.join('; ')),{applied:1});
    if(opt.approve) await approve();
    return (already?'이미 고쳐진 것 '+already+' · ':'')+'HTML '+(f.edits||[]).length+(hdone.length?' · HML '+hdone.map(x=>HSLOT[x]).join('·'):'')+' 반영'+(ap?' · '+ap:''); }
  const fixSig=f=>JSON.stringify([(f.edits||[]).map(e=>[e.field,e.find,e.replace]),(f.hml||[]).map(h=>[h.slot,h.eq,h.text,h.to])]);
  async function batchRun(opt){ const say=t=>{ const m=box()&&box().querySelector('[data-bmsg]'); if(m) m.textContent=t; };
    const ix=await loadPre(); if(!ix) { say('HML_DOWNLOAD 폴더를 먼저 연결하세요.'); return; }
    const L=BL.get(), order=((ix.must||[]).map(m=>m.id)).concat(Object.keys(ix.idx)).filter((x,i,a)=>a.indexOf(x)===i);
    const todo=order.filter(id=>{ const e=ix.idx[id], f=e&&e.fix; if(!f) return false; if(opt.onlyApproved&&!f.approved) return false;
      // '준비'와 'AI 아직'(규칙 수정만 먼저 반영, 나머지 지적은 직접) 둘 다 돌림
      const ok=(/^(준비|AI 아직)$/.test(f.state)&&f.edits&&f.edits.length)||(f.hml&&f.hml.length); return ok&&!(L[id]&&/^완료/.test(L[id].st)&&(!L[id].sig||L[id].sig===fixSig(f))); });   // 완료(예전 기록은 서명 없음)는 건너뜀, 수정안이 바뀐 것만 다시
    const all=todo.length, failed=todo.filter(id=>L[id]), fresh=todo.filter(id=>!L[id]);
    todo.length=0; todo.push(...fresh.concat(failed).slice(0,opt.n));   // 처음 하는 문항 먼저, 전에 건너뛴 문항은 뒤에
    const doneN=Object.keys(L).filter(id=>/^완료/.test(L[id].st)).length;
    if(!todo.length){ say('돌릴 문항이 없습니다(모두 끝났거나 수정안 없음).'); return; }
    const RR=opt.recheck?await recheckRoot():null;   // 쓰기 권한 묻기는 팝업보다 먼저(클릭 직후여야 함)
    const W=window.open('about:blank','hmlBatchWork','width=1280,height=900'); if(!W){ say('팝업이 막혔습니다. 팝업 허용 후 다시 누르세요.'); return; }
    if(opt.recheck&&!RR) say('HML_DOWNLOAD 쓰기 권한이 없어 재검수 목록은 안 남깁니다(수정은 계속).');
    A.batchStop=false; A.batchBusy=true; let fails=0, ok=0, bad=0;
    for(let i=0;i<todo.length;i++){ if(A.batchStop){ say('멈춤(사용자). '+ok+' 완료 · '+bad+' 건너뜀'); break; }
      const id=todo[i], f=ix.idx[id].fix; say('['+(i+1)+'/'+todo.length+'] '+id+' (이미 완료 '+doneN+' 건너뜀 · 남은 '+all+')');
      const det=[], e0=ix.idx[id]||{}, fin=async()=>{ det.forEach(r=>{ r.sid=e0.sid; r.sname=e0.sname; r.no=e0.no; }); await detailAdd(det); };
      try{ const t=await batchOne(W,id,f,opt,x=>say('['+(i+1)+'/'+todo.length+'] '+x),det); await fin(); L[id]={st:'완료',msg:t,at:Date.now(),sig:fixSig(f)}; ok++; fails=0;
        if(RR) try{ await recheckAdd(RR,id,ix); }catch(er){ L[id].msg+=' · 재검수 목록 못 씀: '+er.message; }
        const d=doneMap(); d[id]=Date.now(); LS('hmlAi3MustDone',JSON.stringify(d)); const FL=FX.log(); FL[id]=Object.assign(FL[id]||{},{st:'반영',at:Date.now()}); FX.saveLog(FL); }
      catch(er){ if(er.applied) await fin(); L[id]={st:er.applied?'반영(확인 필요)':'건너뜀',msg:er.message,at:Date.now()}; bad++; fails++;
        if(er.stop){ BL.set(L); say('멈춤: '+er.message); break; }
        if(fails>=3){ BL.set(L); say('연속 3번 실패해서 멈춤. 마지막: '+id+' '+er.message); break; } }
      BL.set(L); }
    A.batchBusy=false; try{ W.close(); }catch(e){}
    const m=box()&&box().querySelector('[data-bmsg]'); if(m&&!/멈춤/.test(m.textContent)) say('끝: '+ok+' 완료 · '+bad+' 건너뜀(기록 CSV에서 이유 확인)'); }
  // 재검수용: 고친 문항의 새 HTML data를 HML_DOWNLOAD/일괄수정_재검수.json에 모음 → PC에서 'python 엄격검사.py 재검수'가 캡처를 새로 받아 그 문항만 다시 검사
  async function recheckRoot(){ try{ const r=await kvGet('root'); if(!r) return null; if((await r.queryPermission({mode:'readwrite'}))==='granted'||(await r.requestPermission({mode:'readwrite'}))==='granted') return r; }catch(e){} return null; }
  async function recheckAdd(root,id,ix){ const d=await getDoc('/item/all/detail.donga'+Q+'itemId='+id);
    let data=null; for(const sc of d.querySelectorAll('.qv-item script')){ if(sc.textContent.includes(String(id))) try{ data=JSON.parse(sc.textContent); break; }catch(e){} }
    const e=ix.idx[id]||{}, cur=(await readJson(root,'일괄수정_재검수.json'))||{items:[]}; cur.items=(cur.items||[]).filter(x=>String(x.itemId)!==String(id));
    cur.items.push({itemId:String(id),sid:e.sid||'',no:e.no||'',data,at:new Date().toISOString()}); cur.made=new Date().toISOString();
    const fh=await root.getFileHandle('일괄수정_재검수.json',{create:true}), w=await fh.createWritable(); await w.write(JSON.stringify(cur)); await w.close(); }
  function batchCsv(){ const L=BL.get(), rows=[['itemId','결과','내용','시각']].concat(Object.keys(L).map(id=>[id,L[id].st,L[id].msg||'',new Date(L[id].at).toLocaleString('ko-KR')]));
    const csv='﻿'+rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\r\n');
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download='일괄수정_기록.csv'; a.click(); }
  function batchBar(ix){ const el=box()&&box().querySelector('[data-batch]'); if(!el) return; if(!ix){ el.innerHTML=''; return; }
    const ids=Object.keys(ix.idx).filter(id=>ix.idx[id].fix); if(!ids.length){ el.innerHTML=''; return; }
    const L=BL.get(), dn=ids.filter(id=>L[id]&&L[id].st==='완료').length;
    el.innerHTML='<details style="font-size:12px;margin-top:4px"'+(A.batchBusy?' open':'')+'><summary style="cursor:pointer;color:#e8590c;font-weight:bold">일괄 수정 (수정안 '+ids.length+'문항 · 완료 '+dn+')</summary><div style="background:#fff;border:1px solid #e8590c;border-radius:6px;padding:6px 8px;margin-top:4px">'+
      '<div>수정안대로 <b>HTML·HML 수정 → 전체 반영 → 확인 → 승인</b>을 사람 없이 차례로 합니다. 안 맞거나 확인 실패면 그 문항은 건너뛰고, 연속 3번 실패하면 멈춥니다.</div>'+
      '<div style="margin-top:4px">이번에 <input data-bn type="number" min="1" value="'+esc(LS('hmlAi3BatchN')||'5')+'" style="width:56px"> 문항 '+
      '<label><input type="checkbox" data-bap'+(LS('hmlAi3BatchApprove')!=='0'?' checked':'')+'> 승인(사용)까지</label> <label title="고친 문항의 새 HTML을 HML_DOWNLOAD/일괄수정_재검수.json에 모음 → PC에서 python 엄격검사.py 재검수"><input type="checkbox" data-brc'+(LS('hmlAi3BatchRecheck')!=='0'?' checked':'')+'> 재검수 목록 남기기</label> '+(ix.fixApproved?'<label><input type="checkbox" data-bonly'+(LS('hmlAi3BatchOnlyAp')!=='0'?' checked':'')+'> 승인본만</label>':'')+'</div>'+
      '<div style="margin-top:4px"><button data-bgo style="background:#e8590c;color:#fff;border:0;border-radius:4px;padding:3px 10px;font-weight:bold">일괄 시작</button> <button data-bstop>멈춤</button> <button data-bcsv>기록 CSV</button> <button data-bdet title="일괄로 바꾼 내용(문항·칸·고치기 전→후·OMR·HML·승인)을 모두 엑셀(CSV)로. 기록 지우기를 해도 남음">수정 내역 엑셀</button> <button data-bclr title="기록을 지우면 다시 돌림">기록 지우기</button></div>'+
      '<div data-bmsg style="margin-top:4px;color:#333"></div><div style="color:#888">처음엔 5문항으로 돌리고 CMS에서 결과를 확인한 뒤 늘리세요. 작업 창은 닫지 마세요(가려도 됨).</div></div></details>';
    const $=q=>el.querySelector(q);
    $('[data-bgo]').onclick=()=>{ if(A.batchBusy) return; const n=Math.max(1,parseInt($('[data-bn]').value,10)||5); LS('hmlAi3BatchN',String(n)); LS('hmlAi3BatchApprove',$('[data-bap]').checked?'1':'0'); const o=$('[data-bonly]'); if(o) LS('hmlAi3BatchOnlyAp',o.checked?'1':'0');
      LS('hmlAi3BatchRecheck',$('[data-brc]').checked?'1':'0');
      batchRun({n,approve:$('[data-bap]').checked,onlyApproved:!!(o&&o.checked),recheck:$('[data-brc]').checked}).catch(er=>{ A.batchBusy=false; $('[data-bmsg]').textContent='멈춤: '+er.message; }); };
    $('[data-bstop]').onclick=()=>{ A.batchStop=true; $('[data-bmsg]').textContent='지금 문항까지 하고 멈춥니다…'; };
    $('[data-bcsv]').onclick=batchCsv;
    $('[data-bdet]').onclick=()=>detailCsv().then(n=>{ if(!n) $('[data-bmsg]').textContent='아직 수정 내역이 없습니다(이 버전부터 쌓임).'; });
    $('[data-bclr]').onclick=()=>{ if(confirm('일괄 기록을 지울까요? (CMS 내용은 그대로)')){ BL.set({}); batchBar(ix); } }; }
  // 반영 뒤 화면이 바뀌면(다음 페이지에서) 결과 확인 → 완료 표시 → 꼭 수정 목록의 다음 문항 수정 화면으로
  async function checkPending(ix){ let p=null; try{ p=JSON.parse(LS('hmlAi3FixPending')||'null'); }catch(e){}
    if(!p||Date.now()-p.at>10*60000){ if(p) LS('hmlAi3FixPending',''); return false; }
    if(isModify()&&loadedId()===String(p.id)) return false;   // 아직 수정 화면(반영 실패 등)
    LS('hmlAi3FixPending',''); const bad=await verifyFix(p.id,p.edits).catch(er=>['확인 못함: '+er.message]);
    const L=FX.log(); L[p.id]=Object.assign(L[p.id]||{},{st:bad.length?'반영(확인 필요)':'반영',at:Date.now(),msg:bad.join('; ')}); FX.saveLog(L);
    if(bad.length){ alert('반영했지만 확인이 필요합니다: '+bad.join('; ')); return false; }
    const d=doneMap(); d[p.id]=Date.now(); LS('hmlAi3MustDone',JSON.stringify(d));
    const M=(ix&&ix.must)||[]; let i=M.findIndex(m=>m.id===String(p.id)), nx=null;
    for(let k=i+1;k<M.length;k++) if(!d[M[k].id]&&!(LS('hmlAi3FixSkipNoFix')==='1'&&!(ix.idx[M[k].id]||{}).fix)){ nx=M[k]; break; }
    if(nx&&LS('hmlAi3FixAutoNext')!=='0'){ location.href='/item/all/modify.donga'+Q+'itemId='+nx.id; return true; }
    return false; }
  function fixBlock(e,id,inner){ const f=e&&e.fix; if(!f) return '';
    const L=FX.log()[id]||{}, hN=(f.hml||[]).length, ok=(/^(준비|AI 아직)$/.test(f.state)&&f.edits&&f.edits.length)||hN>0;
    const st=L.st?'<span style="color:'+(/반영$/.test(L.st)?'#188038':'#b06000')+';font-weight:bold"> · '+esc(L.st)+'</span>':'';
    let h='<div style="'+(inner?'border-top:1px dashed #bbb;margin-top:4px;padding-top:4px':'margin:6px 0;padding:6px 8px;border-radius:6px;background:#fff;border:2px solid #188038')+'"><div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><b style="color:#188038">수정안</b>'+(f.approved?'<span style="font-size:12px;color:#188038">승인본</span>':'<span style="font-size:12px;color:#888">검토 전</span>')+st+
      (f.state==='AI 아직'&&ok?'<span style="color:#b06000;font-size:12px">규칙 수정만(나머지 지적은 직접)</span>':'')+(f.hml_also&&!hN?'<span style="color:#b06000;font-size:12px">HML·OMR도 직접 수정</span>':'')+(hN?'<span style="color:#e8590c;font-size:12px;font-weight:bold">HML '+hN+'곳도 고침'+(L.hml?' · '+esc(L.hml):'')+'</span>':'')+'<span style="flex:1"></span>'+
      (ok?'<button data-fx="paste" style="background:#188038;color:#fff;border:0;border-radius:4px;padding:3px 10px;font-weight:bold" title="HTML 수정안을 붙여넣고, HML 수정안이 있으면 한글 편집기에서 고쳐 저장까지(반영은 [반영])">수정</button><button data-fx="apply" style="background:#1a73e8;color:#fff;border:0;border-radius:4px;padding:3px 10px;font-weight:bold" title="CMS [전체 반영] → 확인 → 완료 표시 → 다음 문항">반영</button>':'')+(ok&&hN?'<button data-fx="hml" style="background:#e8590c;color:#fff;border:0;border-radius:4px;padding:3px 10px;font-weight:bold" title="한글 편집기에서 HML만 다시 고치고 저장">HML 고치기</button>':'')+
      (L.before?'<button data-fx="undo" title="바꾸기 전 글로 다시 붙여넣기">되돌리기</button>':'')+'</div>';
    if(!ok) h+='<div style="font-size:12px;color:#b06000">'+esc(f.state)+(f.note?' · '+esc(f.note):'')+' (수정안 없음 → 직접 고치세요)</div>';
    else h+=(f.edits||[]).map(ed=>'<div style="font-family:Consolas,monospace;font-size:11px;border-top:1px dashed #ddd;padding:2px 0;word-break:break-all"><span style="color:#888">'+esc(ed.src||'')+' '+esc(ed.why||ed.field)+'</span><br><del style="background:#fce8e6;color:#d93025">'+esc(String(ed.find).slice(0,200))+'</del> → <ins style="background:#e6f4ea;color:#188038;text-decoration:none">'+esc(String(ed.replace).slice(0,200))+'</ins></div>').join('')+(f.hml||[]).map(x=>'<div style="font-family:Consolas,monospace;font-size:11px;border-top:1px dashed #ddd;padding:2px 0;word-break:break-all"><span style="color:#e8590c">HML '+esc(HSLOT[x.slot]||x.slot)+(x.eq!=null?' 수식':' 글자')+(x.why?' · '+esc(x.why):'')+'</span><br><del style="background:#fce8e6;color:#d93025">'+esc(String(x.eq!=null?x.eq:x.text).slice(0,200))+'</del> → <ins style="background:#e6f4ea;color:#188038;text-decoration:none">'+esc(String(x.to).slice(0,200))+'</ins></div>').join('')+(f.note?'<div style="font-size:12px;color:#666">AI: '+esc(f.note)+'</div>':'');
    return h+'<div data-fxmsg style="font-size:12px;margin-top:2px"></div><div data-fximg></div></div>'; }
  function bindFix(P,e,id){ if(!e||!e.fix) return; P.querySelectorAll('[data-fx]').forEach(b=>b.onclick=()=>{ const k=b.getAttribute('data-fx');
      if(k==='paste') doPaste(id,e); else if(k==='apply') doApply(id,e).catch(er=>fixMsg(er.message,'#d93025')); else if(k==='undo') doUndo(id); else if(k==='hml') doHml(id,e).then(d=>{ if(d) fixMsg('HML 저장함(아래 새 캡처 확인). 맞으면 [반영].','#188038'); }).catch(er=>fixMsg('HML 고치지 못함: '+er.message,'#d93025')); });
    if(location.hash==='#hmlFix'||location.hash==='#hmlFixUndo'){ const u=location.hash==='#hmlFixUndo'; history.replaceState(null,'',location.pathname+location.search);
      setTimeout(()=>u?doUndo(id):doPaste(id,e,true),500); } }

  // ---------- OMR: 주관식 정답 칸이 비어 있으면 [전체 반영]이 막힘 → HTML 정답에서 채움('16 cm' → 정답 16, 뒤 수식어 cm) ----------
  // 정답 → OMR 칸들: [{prefix, answer, suffix}], sure=false면 사람 확인 필요(그래도 최선으로 넣음)
  const UNIT=/^(.*?\S)\s*(?:\\mathrm\{\s*([A-Za-z]+(?:\^\{?[23]\}?)?)\s*\}|(cm\^\{?[23]\}?|m\^\{?[23]\}?|cm|mm|km|kg|mL|m|g|L|개|명|원|번|가지|마리|권|장|시간|분|초|일|살|배|점|회|쪽|송이|자루|대|켤레|병|잔|그릇|봉지|상자|묶음|모|°))\s*$/;
  function topSplit(t,ch){ const out=[]; let d=0, cur=''; for(const c of t){ if(c==='{'||c==='('||c==='[') d++; else if(c==='}'||c===')'||c===']') d--; if(c===ch&&d===0){ out.push(cur); cur=''; } else cur+=c; } out.push(cur); return out.map(x=>x.trim()).filter(Boolean); }
  function onePart(t,prefix){ t=t.trim(); let suffix=''; const m=t.match(UNIT); if(m&&/[\d}]/.test(m[1].slice(-1))){ t=m[1].trim(); suffix=(m[2]||m[3]).replace(/\^\{?([23])\}?/,'^$1'); }
    return {prefix:prefix||'',answer:t,suffix}; }
  function parseAnswer(raw){ let t=String(raw||'').replace(/<br\s*\/?>/gi,' ').replace(/<\/p>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
      .replace(/\$/g,' ').replace(/\\hspace\{[^}]*\}|\\[,;:! ]|~/g,' ').replace(/\s+/g,' ').trim();
    if(!t) return null; if(/^[①-⑩](\s*,?\s*[①-⑩])*$/.test(t)) return null;   // 객관식 번호
    let parts=[], sure=true;
    const mk=t.match(/\(\s*\d+\s*\)/g);
    if(mk&&mk.length>1&&/^\(\s*1\s*\)/.test(t)){ const segs=t.split(/(\(\s*\d+\s*\))/).filter(x=>x.trim()); for(let k=0;k<segs.length;k++){ if(/^\(\s*\d+\s*\)$/.test(segs[k])){ const v=(segs[k+1]&&!/^\(\s*\d+\s*\)$/.test(segs[k+1]))?segs[++k]:''; parts.push(onePart(v.replace(/^[\s:,]+|[\s,]+$/g,''),segs[k-(v?1:0)].replace(/\s/g,''))); } } }
    else{ const segs=topSplit(t,','); for(const sg of segs){ const lm=sg.match(/^(?:\\(?:rm|mathrm)\s*)?\{?\s*([A-Za-z가-힣]{1,3})\s*\}?\s*:\s*(.+)$/);
        if(lm) parts.push(onePart(lm[2],/^[A-Za-z]+$/.test(lm[1])?'\\mathrm{'+lm[1]+'}':lm[1])); else parts.push(onePart(sg,'')); } }
    if(!parts.length) return null;
    if(parts.length>1||parts.some(x=>x.prefix)) sure=false;
    if(parts.some(x=>/[가-힣]|\\text\{|풀이\s*참조/.test(x.answer)||!x.answer)) sure=false;
    return {parts,sure}; }
  function splitAnswer(raw){ const r=parseAnswer(raw); return r&&r.sure&&r.parts.length===1?{answer:r.parts[0].answer,suffix:r.parts[0].suffix}:null; }
  function omrInputs(W=window){ const out={}; W.document.querySelectorAll('math-field,input,textarea,[contenteditable=""],[contenteditable=true],[placeholder],[aria-placeholder],[data-placeholder]').forEach(el=>{
      if(!el.offsetParent||(panelEl()&&panelEl().contains(el))) return;
      let ph=el.getAttribute('placeholder')||el.getAttribute('aria-placeholder')||el.getAttribute('data-placeholder')||(typeof el.placeholder==='string'?el.placeholder:'')||'';
      if(!ph&&el.closest){ const c=el.closest('[placeholder],[data-placeholder]'); if(c) ph=c.getAttribute('placeholder')||c.getAttribute('data-placeholder')||''; }
      const k=/정답\s*입력/.test(ph)?'answer':/뒤\s*수식어/.test(ph)?'suffix':/앞\s*수식어/.test(ph)?'prefix':null; if(k&&!out[k]) out[k]=el; }); return out; }
  const fieldVal=el=>{ try{ if(typeof el.getValue==='function') return el.getValue()||''; }catch(e){} if('value' in el&&typeof el.value==='string') return el.value; return (el.textContent||'').trim(); };
  function setField(el,v,W=window){ try{ if(typeof el.setValue==='function') el.setValue(v); else if('value' in el) el.value=v; else el.textContent=v; }catch(e){ el.textContent=v; }
    ['input','change','blur'].forEach(t=>{ try{ el.dispatchEvent(new W.Event(t,{bubbles:true,composed:true})); }catch(e){} }); if(el.style) el.style.outline='3px solid #f59f00'; }
  const tabBtn=(name,W=window)=>[...W.document.querySelectorAll('.nav-link,[role=tab],button,a')].find(b=>b.textContent.trim()===name&&!(panelEl()&&panelEl().contains(b)));
  // OMR 칸을 줄(앞 수식어·정답·뒤 수식어)로 묶음. 다답형이면 줄이 여러 개
  function omrRows(W=window){ const rows=[]; let cur=null; W.document.querySelectorAll('math-field,input,textarea,[contenteditable=""],[contenteditable=true],[placeholder],[aria-placeholder],[data-placeholder]').forEach(el=>{
      if(!el.offsetParent||(panelEl()&&panelEl().contains(el))) return;
      let ph=el.getAttribute('placeholder')||el.getAttribute('aria-placeholder')||el.getAttribute('data-placeholder')||(typeof el.placeholder==='string'?el.placeholder:'')||'';
      if(!ph&&el.closest){ const c=el.closest('[placeholder],[data-placeholder]'); if(c) ph=c.getAttribute('placeholder')||c.getAttribute('data-placeholder')||''; }
      const k=/정답\s*입력/.test(ph)?'answer':/뒤\s*수식어/.test(ph)?'suffix':/앞\s*수식어/.test(ph)?'prefix':null; if(!k) return;
      if(!cur||k==='prefix'||cur[k]){ cur={}; rows.push(cur); } cur[k]=el; });
    return rows.filter(r=>r.answer); }
  const sleep=ms=>nap(ms);
  async function fillOmr(W=window){ const tab=tabBtn('OMR 수정',W); if(tab){ tab.click(); await sleep(700); }
    let rows=omrRows(W); if(!rows.length) return null;
    if(rows.some(r=>String(fieldVal(r.answer)).trim())) return null;   // 이미 정답이 있음
    let ans=''; jsonEls(W).forEach(el=>{ let d=null; try{ d=JSON.parse(el.textContent); }catch(e){} if(d) walkStr(d,[],(o,k,v)=>{ if(!ans&&(k==='answerText'||k==='correctHtml')&&v) ans=v; }); });
    const pa=parseAnswer(ans); if(!pa) return {ok:false,warn:true,msg:'OMR 정답이 비어 있음. 객관식 번호이거나 정답을 못 찾음('+String(ans).replace(/<[^>]+>/g,'').slice(0,30)+') → OMR 수정 탭에서 직접 입력'};
    const P=pa.parts; let note=[];
    if(P.length>1){ // 다답형으로 바꾸고 줄 수 맞추기
      const sel=W.document.getElementById('qtAnswer'); const o=sel&&[...sel.options].find(x=>/다답/.test(x.text));
      if(o&&sel.value!==o.value){ sel.value=o.value; sel.dispatchEvent(new W.Event('change',{bubbles:true})); await sleep(900); const t2=tabBtn('OMR 수정',W); if(t2){ t2.click(); await sleep(500); } note.push('문항 형태를 다답형으로 바꿈'); }
      else if(!o) note.push('다답형 선택을 못 찾음');
      rows=omrRows(W);
      for(let k=0;rows.length<P.length&&k<P.length;k++){ const add=[...W.document.querySelectorAll('button,a')].find(b=>b.offsetParent&&/추가/.test(b.textContent)&&!/유사|단원|유형|성취|코드/.test(b.textContent)&&!(panelEl()&&panelEl().contains(b)));
        if(!add) break; add.click(); await sleep(400); rows=omrRows(W); } }
    const n=Math.min(P.length,rows.length);
    for(let k=0;k<n;k++){ const r=rows[k], x=P[k]; setField(r.answer,x.answer,W); if(x.suffix&&r.suffix) setField(r.suffix,x.suffix,W); if(x.prefix&&r.prefix) setField(r.prefix,x.prefix,W); }
    if(n<P.length){ const rest=P.slice(n-1).map(x=>(x.prefix?x.prefix+' ':'')+x.answer+(x.suffix?' '+x.suffix:'')).join(', '); setField(rows[n-1].answer,rest,W); note.push('칸이 '+rows.length+'개뿐이라 남은 답을 마지막 칸에 몰아 넣음'); }
    const desc=P.map(x=>(x.prefix?'['+x.prefix+'] ':'')+x.answer+(x.suffix?' ['+x.suffix+']':'')).join(' / ');
    const ok=!!String(fieldVal(rows[0].answer)).trim(), warn=!pa.sure||note.length>0||!ok;
    return {ok,warn,msg:(P.length>1?'OMR 다답형 '+P.length+'개: ':'OMR 정답: ')+desc+(note.length?' ('+note.join(', ')+')':'')+(ok?'':' 넣기 실패')}; }
  function omrWarnBox(r){ return r&&r.warn?'<div style="margin-top:4px;padding:6px 8px;border-radius:6px;background:#fff4e5;border:2px solid #f59f00;color:#b06000;font-weight:bold">⚠ OMR 확인 필요: '+esc(r.msg)+'<br><span style="font-weight:normal">자동으로 넣었지만 확실하지 않습니다. 저장(반영) 전에 OMR 수정 탭에서 앞 수식어·정답·뒤 수식어를 꼭 확인하세요.</span></div>':''; }


  // ---------- 그림 키우기: 지금 문항 HTML의 <img>를 한 번에 키움(미리보기 → 넣기 → 반영 / 되돌리기=새로고침) ----------
  // 수정안 붙여넣기와 같은 원리: [HTML 수정] 편집기가 만들어지기 전에 문항 JSON 안의 그림 크기를 바꿈.
  const IMG_RE = /<img\b[^>]*>/gi;

  // 문항 문서 JSON들(<script type="application/json">)
  function hmlJsonEls(W = window) {
    return [...W.document.querySelectorAll('script[type="application/json"]')]
      .filter(el => /Html"|"content"/.test(el.textContent));
  }
  // 문자열 값을 모두 같은 순서로 돌기
  function hmlWalk(o, path, fn) {
    Object.keys(o || {}).forEach(k => {
      const v = o[k], p = path.concat(k);
      if (typeof v === 'string') fn(o, k, v, p);
      else if (v && typeof v === 'object') hmlWalk(v, p, fn);
    });
  }
  // 그림의 실제 폭(px) 알아내기: 이미지 파일을 불러와 naturalWidth
  function hmlNatural(src, W = window) {
    return new Promise(ok => {
      const im = new W.Image(); const t = setTimeout(() => ok(null), 8000);
      im.onload = () => { clearTimeout(t); ok({ w: im.naturalWidth, h: im.naturalHeight }); };
      im.onerror = () => { clearTimeout(t); ok(null); };
      im.src = src;
    });
  }
  const num = s => { const m = String(s || '').match(/^\s*(\d+(?:\.\d+)?)\s*(px)?\s*$/i); return m ? +m[1] : null; };
  const attr = (tag, a) => { const m = tag.match(new RegExp('\\s' + a + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i')); return m ? (m[2] ?? m[3] ?? m[4]) : null; };
  const styleOf = (tag, prop) => { const s = attr(tag, 'style') || ''; const m = s.match(new RegExp('(?:^|;)\\s*' + prop + '\\s*:\\s*([^;]+)', 'i')); return m ? m[1].trim() : null; };

  // <img> 태그 하나의 폭을 nw로 (높이가 적혀 있으면 같은 비율로)
  function hmlResizeTag(tag, cur, nw) {
    const r = nw / cur, sc = v => Math.round(v * r);
    let t = tag;
    // width / height 속성
    if (attr(t, 'width') != null) t = t.replace(/(\swidth\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/i, '$1"' + nw + '"');
    else t = t.replace(/^<img\b/i, '<img width="' + nw + '"');
    const ha = num(attr(t, 'height'));
    if (ha != null) t = t.replace(/(\sheight\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+)/i, '$1"' + sc(ha) + '"');
    // style의 width / height / max-width
    let st = attr(t, 'style');
    if (st == null) t = t.replace(/^<img\b/i, '<img style="width:' + nw + 'px"');
    else {
      let s = st;
      s = /(^|;)\s*width\s*:/i.test(s) ? s.replace(/((?:^|;)\s*width\s*:\s*)[^;]+/i, '$1' + nw + 'px') : s.replace(/;?\s*$/, ';') + 'width:' + nw + 'px';
      s = s.replace(/((?:^|;)\s*height\s*:\s*)(\d+(?:\.\d+)?)px/i, (_, a, h) => a + sc(+h) + 'px');
      s = s.replace(/((?:^|;)\s*max-width\s*:\s*)(\d+(?:\.\d+)?)px/i, (_, a, m) => a + Math.max(+m, nw) + 'px');
      t = t.replace(/(\sstyle\s*=\s*)("[^"]*"|'[^']*')/i, (_, a, q) => a + q[0] + s.replace(new RegExp(q[0], 'g'), '') + q[0]);
    }
    return t;
  }

  // 1) 미리보기: 무엇을 얼마나 키울지 목록만 만듦(화면·JSON 안 바꿈)
  //   scale: 배율, maxWidth: 이보다 크게는 안 키움(px), minWidth: 이보다 작은 그림(기호·아이콘)은 건너뜀
  async function hmlImgPlan(opt = {}, W = window) {
    const o = Object.assign({ scale: 1.5, maxWidth: 640, minWidth: 30 }, opt);
    if (Object.keys(W.itemEditors || {}).some(k => W.itemEditors[k]))
      throw new Error('[HTML 수정] 편집기가 이미 열려 있음 → 새로고침 후 탭을 열기 전에 실행');
    const els = jsonEls(W); if (!els.length) throw new Error('문항 JSON을 찾지 못함(수정 화면인지 확인)');
    const docs = els.map(el => { try { return JSON.parse(el.textContent); } catch (e) { return null; } });
    const list = [];
    docs.forEach((d, di) => d && hmlWalk(d, [], (obj, k, v, p) => {
      (v.match(IMG_RE) || []).forEach(tag => list.push({ di, field: p.join('.'), tag, src: attr(tag, 'src') || '' }));
    }));
    for (const x of list) {
      const sw = styleOf(x.tag, 'width');
      if (sw && /%/.test(sw)) { x.skip = '% 크기'; continue; }
      x.cur = num(sw) || num(attr(x.tag, 'width'));
      if (!x.cur) { const n = await hmlNatural(x.src, W); x.cur = n && n.w; x.natural = true; }
      if (!x.cur) { x.skip = '크기를 알 수 없음'; continue; }
      if (x.cur < o.minWidth) { x.skip = '작은 그림(기호)'; continue; }
      x.nw = Math.min(o.maxWidth, Math.round(x.cur * o.scale));
      if (x.nw <= x.cur) { x.skip = '이미 충분히 큼'; continue; }
      x.newTag = hmlResizeTag(x.tag, x.cur, x.nw); x.on = true;
    }
    return { els, list, opt: o };
  }

  // 2) 넣기: plan에서 on인 그림만 바꿔 JSON에 넣고 [HTML 수정] 탭을 열어 보여 줌. 바꾸기 전 글을 돌려줌
  function hmlImgApply(plan, W = window) {
    const docs = plan.els.map(el => { try { return JSON.parse(el.textContent); } catch (e) { return null; } });
    let c = 0, n = 0;
    docs.forEach((d, di) => d && hmlWalk(d, [], (obj, k, v) => {
      if (!/<img\b/i.test(v)) return;
      obj[k] = v.replace(IMG_RE, t => { const x = plan.list[c++]; if (x && x.on && x.di === di && x.tag === t) { n++; return x.newTag; } return t; });
    }));
    const before = plan.els.map(el => el.textContent);
    plan.els.forEach((el, i) => { if (docs[i]) el.textContent = JSON.stringify(docs[i]); });
    const tab = [...W.document.querySelectorAll('.nav-link,[role=tab],button,a')].find(b => b.textContent.trim() === 'HTML 수정');
    if (tab) tab.click();
    return { changed: n, before };
  }
  const IM={};
  function imgMsg(t,c){ const m=box()&&box().querySelector('[data-immsg]'); if(m){ m.textContent=t; m.style.color=c||'#333'; } }
  function imgBar(id){ const el=box()&&box().querySelector('[data-img]'); if(!el) return;
    const sc=LS('hmlImgScale')||'1.5', mx=LS('hmlImgMax')||'640';
    el.innerHTML='<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:4px;padding:4px 6px;border:1px solid #c5a3d9;border-radius:6px;background:#fff">'+
      '<b style="color:#7b1fa2">그림</b><select data-isc title="배율">'+['1.25','1.5','1.75','2','2.5'].map(v=>'<option'+(v===sc?' selected':'')+'>'+v+'</option>').join('')+'</select>배 · 최대 <input data-imx type="number" min="100" step="20" value="'+esc(mx)+'" style="width:58px">px '+
      '<button data-ipre style="background:#7b1fa2;color:#fff;border:0;border-radius:4px;padding:2px 8px;font-weight:bold" title="이 문항 그림을 얼마나 키울지 미리 봄(아직 안 바꿈)">그림 키우기</button><span style="flex:1"></span>'+
      (IM.done===id?'<button data-iapply style="background:#1a73e8;color:#fff;border:0;border-radius:4px;padding:2px 8px;font-weight:bold" title="CMS [전체 반영]으로 저장">반영</button><button data-iundo title="반영 전이면 새로고침해서 원래대로">되돌리기</button>':'')+
      '</div><div data-immsg style="font-size:12px;margin-top:2px"></div><div data-imlist></div>';
    const $=q=>el.querySelector(q);
    $('[data-isc]').onchange=e=>LS('hmlImgScale',e.target.value); $('[data-imx]').onchange=e=>LS('hmlImgMax',e.target.value);
    $('[data-ipre]').onclick=()=>imgPreview(id);
    const ap=$('[data-iapply]'); if(ap) ap.onclick=()=>imgApplyAll(id);
    const un=$('[data-iundo]'); if(un) un.onclick=()=>{ history.replaceState(null,'',location.pathname+location.search); location.reload(); };
    if(location.hash==='#hmlImg'){ history.replaceState(null,'',location.pathname+location.search); setTimeout(()=>imgPreview(id),500); } }
  async function imgPreview(id){
    if(!isModify()||loadedId()!==String(id)){ location.href='/item/all/modify.donga'+Q+'itemId='+id+'#hmlImg'; return; }
    if(mounted()){ history.replaceState(null,'',location.pathname+location.search+'#hmlImg'); location.reload(); return; }
    const L=box()&&box().querySelector('[data-imlist]'); imgMsg('그림 크기 재는 중…');
    let plan; try{ plan=await hmlImgPlan({scale:+(LS('hmlImgScale')||1.5),maxWidth:+(LS('hmlImgMax')||640)}); }catch(er){ imgMsg(er.message,'#d93025'); return; }
    IM.plan=plan; IM.id=id; const on=plan.list.filter(x=>x.on);
    if(!plan.list.length){ imgMsg('이 문항 HTML에는 그림이 없습니다.'); L.innerHTML=''; return; }
    const fld=f=>/explan/i.test(f)?'해설':/choice/i.test(f)?'선지':/correct|answer/i.test(f)?'정답':/passage/i.test(f)?'지문':/question|prompt/i.test(f)?'문제':f;
    L.innerHTML=plan.list.map((x,i)=>'<div style="border-top:1px dashed #ddd;padding:3px 0;font-size:12px"><label><input type="checkbox" data-ion="'+i+'"'+(x.on?' checked':' disabled')+'> <b>'+esc(fld(x.field))+'</b> '+
      (x.on?x.cur+(x.natural?'(원래 크기)':'')+' → <b>'+x.nw+'px</b>':'<span style="color:#888">건너뜀: '+esc(x.skip)+(x.cur?' ('+x.cur+'px)':'')+'</span>')+'</label>'+
      '<div style="overflow:auto"><img src="'+esc(x.src)+'" style="width:'+(x.on?x.nw:(x.cur||80))+'px;max-width:none;border:1px solid #ccc;display:block;margin-top:2px"></div></div>').join('')+
      (on.length?'<div style="margin-top:4px"><button data-iput style="background:#188038;color:#fff;border:0;border-radius:4px;padding:3px 10px;font-weight:bold">이대로 넣기</button> <button data-icancel>취소</button></div>':'');
    L.querySelectorAll('[data-ion]').forEach(c=>c.onchange=()=>{ plan.list[+c.dataset.ion].on=c.checked; });
    const put=L.querySelector('[data-iput]'); if(put) put.onclick=()=>imgPut(id);
    const cc=L.querySelector('[data-icancel]'); if(cc) cc.onclick=()=>{ L.innerHTML=''; imgMsg(''); };
    imgMsg(on.length?'그림 '+on.length+'개를 키웁니다(아래는 바뀔 크기). 아직 CMS에는 아무것도 안 바뀜.':'키울 그림이 없습니다.',on.length?'#333':'#b06000'); }
  function imgPut(id){ const plan=IM.plan; if(!plan||IM.id!==id) return;
    if(mounted()){ imgMsg('편집기가 이미 열렸습니다. [그림 키우기]를 다시 누르세요.','#d93025'); return; }
    const r=hmlImgApply(plan); IM.done=id; imgBar(id);
    imgMsg('그림 '+r.changed+'개 넣음. [HTML 수정] 탭에서 확인하고 [반영]. 마음에 안 들면 [되돌리기](새로고침, 저장 안 됨).',r.changed?'#188038':'#d93025'); }
  async function imgApplyAll(id){ if(IM.done!==id||!isModify()){ imgMsg('먼저 [그림 키우기] → [이대로 넣기].','#d93025'); return; }
    if(typeof window.itemApplyAll!=='function'){ imgMsg('전체 반영 기능을 찾지 못했습니다.','#d93025'); return; }
    imgMsg('전체 반영 중…'); window.itemApplyAll(); const modal=document.getElementById('applyAllModal');
    try{ await waitFor(()=>modal&&modal.classList.contains('show'),5000,'확인창'); }catch(er){ imgMsg('전체 반영이 막혔습니다(필수 항목·OMR 정답 등). 화면 안내를 확인하세요.','#d93025'); return; }
    await new Promise(r=>setTimeout(r,300)); modal.querySelector('[data-action-ok]').click(); }

  // ---------- 칸 그리기 ----------
  const opt=()=>({model:LS('hmlAi3Model')||'claude-haiku-5-5',solve:LS('hmlAi3Solve')!=='0',meta:LS('hmlAi3Meta')!=='0',auto:LS('hmlAi3Auto')==='1'});
  function box(){ const p=panelEl(); if(!p) return null; let b=p.querySelector('[data-ai3]'); if(b) return b;
    const body=p.querySelector('[data-b]'); if(!body) return null; const o=opt();
    b=document.createElement('div'); b.setAttribute('data-ai3','');
    b.style.cssText='border-bottom:1px solid #ddd;background:#f8f3fb;padding:6px 10px;font-size:13px;max-height:55%;overflow:auto;flex:none;position:relative';
    b.innerHTML='<div data-st style="margin-bottom:4px"></div><div data-pre></div><div data-img></div><div data-batch></div>'+
      '<style>[data-ai3] details[open]{flex-basis:100%}[data-ai3] details summary{text-align:right}</style><div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-top:6px"><button data-go title="HML 캡처와 HTML을 AI가 다시 비교(API 비용)" style="border:0;padding:3px 10px;border-radius:4px;color:#fff;background:#7b1fa2;cursor:pointer">AI 다시 검사</button><span style="flex:1"></span>'+
      '<details style="font-size:12px;margin-left:auto"><summary style="cursor:pointer;color:#666">설정</summary><div style="background:#fff;border:1px solid #ccc;border-radius:6px;padding:6px 8px;margin-top:4px"><div data-preset></div>'+
      '<div style="margin-top:4px;border-top:1px dashed #ddd;padding-top:4px"><b>AI 검사</b> <select data-model title="모델"><option value="claude-haiku-5-5">Haiku 5.5 (빠름·저렴)</option><option value="claude-sonnet-5-5">Sonnet 5.5 (정확)</option></select> '+
      '<label><input type="checkbox" data-solve> 문제풀이</label> <label><input type="checkbox" data-meta> 메타정보</label> <label title="문항을 넘길 때마다 자동으로 AI 검사(문항마다 비용이 듭니다)"><input type="checkbox" data-auto> 넘길 때 자동</label> <button data-key title="API 키 넣기·바꾸기">API 키</button></div></div></details></div>'+
      '<div data-out style="margin-top:4px;color:#666"></div>';
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
  function tick(){ if(window.name==='hmlBatchWork') return; if(!box()) return; const id=itemIdOf(); if(K().busy) return;
    if(id!==lastId){ lastId=id; IM.done=null; imgBar(id); showPre(id).catch(()=>{}); if(A.cache[id]) render(id,A.cache[id]); else if(opt().auto) run(); else out(''); } }
  if(!A.obs){ A.obs=new MutationObserver(()=>{ clearTimeout(tm); tm=setTimeout(tick,600); });   A.obs.observe(document.body,{childList:true,subtree:true}); }
  if(!A.pendChecked&&window.name!=='hmlBatchWork'){ A.pendChecked=true; loadPre().then(ix=>checkPending(ix)).catch(()=>{}); }
  tick();
})();
