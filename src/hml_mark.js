// 틀린 부분 표시: 검수 결과의 '글자·수식 차이'를 렌더링된 HTML 위에서 찾아 빨간 동그라미로 표시
// window.__hmlMark(el, rows) rows: [번호, 문항ID, 구분, 유형, 상세, (AI 판정)]. 검수기의 norm(window.__hmlChecker2.norm)을 씀.
(function(){
  const CSS='.mk{border:2px solid #e00!important;border-radius:50%;padding:1px 5px;margin:0 1px;background:rgba(255,0,0,.06)}'+
    '.mkmiss{display:inline-block;color:#fff;background:#e00;font:bold 11px/1.4 sans-serif;border-radius:8px;padding:0 6px;margin:0 2px;vertical-align:super;white-space:nowrap}'+
    '.mksub{color:#e00;font:bold 11px sans-serif;vertical-align:super;margin-left:2px;white-space:nowrap}'+
    '.mklost{border:2px solid #e00;border-radius:10px;padding:6px 10px;margin:0 0 8px;color:#c00;font-size:12px;background:#fff5f5}';
  window.__hmlMarkCss=CSS;
  const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  function units(el,norm){ const U=[]; const w=n=>{
      if(n.nodeType===3){ const t=norm(n.textContent); if(t) U.push({node:n,t}); return; }
      if(n.nodeType!==1||['SCRIPT','STYLE','TEMPLATE','TEXTAREA'].includes(n.tagName)) return;
      if(n.classList.contains('katex')){ const a=n.querySelector('annotation'); const t=norm(a?a.textContent:''); if(t) U.push({node:n,t,k:1}); return; }
      if(n.classList.contains('qdoc-viewer__heading')||n.classList.contains('mkmiss')||n.classList.contains('mksub')) return;
      for(const c of [...n.childNodes]) w(c); };
    w(el); return U; }
  function wrapText(node,chars){ // 텍스트 노드 안에서 해당 글자만 감쌈(못 찾으면 노드 전체)
    const raw=node.textContent; let s=-1,e=-1;
    if(chars){ const m=raw.match(new RegExp(chars.split('').map(reEsc).join('[\\s~`{}$\\\\.]*'))); if(m){ s=m.index; e=m.index+m[0].length; } }
    if(s<0||raw.length<=24){ s=0; e=raw.length; }
    const r=document.createRange(); r.setStart(node,s); r.setEnd(node,e); const sp=document.createElement('span'); sp.className='mk';
    try{ r.surroundContents(sp); }catch(err){} return sp; }
  function mark(el,rows){
    const norm=window.__hmlChecker2&&window.__hmlChecker2.norm; if(!norm||!el) return 0;
    let n=0; const lost=[];
    for(const r of rows||[]){
      if(r[2]!=='내용'||!/글자·수식 차이/.test(r[3])) continue; if(r[5]&&r[5].real===false) continue;
      const m=String(r[4]).match(/^…?(.*?) \[HML: (.*?) \/ HTML: (.*?)\] (.*?)…?$/); if(!m) continue;
      const [ ,L,a,b,R]=m; const U=units(el,norm); let S='', own=[];
      U.forEach((u,i)=>{ S+=u.t; for(let j=0;j<u.t.length;j++) own.push(i); });
      const find=x=>x?S.indexOf(x):-1;
      if(b){ // 다르게 들어간 글자 → 동그라미
        let p=find(L+b+R), s=p>=0?p+L.length:-1;
        if(s<0){ p=find(L+b); s=p>=0?p+L.length:-1; }
        if(s<0){ p=find(b+R); s=p; }
        if(s<0&&b.length>=2){ s=find(b); }
        if(s<0){ lost.push(r[4]); continue; }
        const hit=[...new Set(own.slice(s,s+b.length))]; let last=null;
        for(const i of hit){ const u=U[i]; if(u.k){ u.node.classList.add('mk'); last=u.node; } else { const off=own.indexOf(i); const part=u.t.slice(Math.max(0,s-off),Math.max(0,s-off)+b.length); last=wrapText(u.node,part); } }
        if(last&&a){ const t=document.createElement('span'); t.className='mksub'; t.textContent='원본: '+a; last.after(t); }
        n++;
      } else if(a){ // 빠진 글자 → 그 자리에 '누락' 표시
        let p=find(L+R), at=p>=0?p+L.length:-1;
        if(at<0&&L.length>=3){ p=find(L); at=p>=0?p+L.length:-1; }
        if(at<0&&R.length>=3){ at=find(R); }
        if(at<0){ lost.push(r[4]); continue; }
        const i=own[Math.max(0,at-1)]; const u=U[i]; if(!u) continue;
        const t=document.createElement('span'); t.className='mkmiss'; t.textContent='누락: '+(a.length>40?a.slice(0,40)+'…':a);
        if(at===0) u.node.parentNode.insertBefore(t,u.node); else (u.k?u.node:u.node).after(t);
        n++; }
    }
    if(lost.length){ const d=document.createElement('div'); d.className='mklost'; d.innerHTML='<b>위치를 못 찾은 차이 '+lost.length+'건 (원본에서 빠진 부분일 수 있음)</b><br>'+lost.map(x=>String(x).replace(/&/g,'&amp;').replace(/</g,'&lt;')).join('<br>'); el.insertBefore(d,el.firstChild); }
    return n; }
  window.__hmlMark=mark;
  // 화면 표시 문제(넘침·표 칸 수식 줄바꿈·박스 줄바꿈·그림·수식 오류) 위치에 빨간 테두리. rows의 '화면' 유형만 봄
  window.__hmlMarkCss+='.mkbox{outline:3px solid #e00!important;outline-offset:2px;border-radius:4px}.mkovm{outline:3px dashed #e37400!important;outline-offset:2px}'+
    '.mktag{display:inline-block;color:#fff;background:#e00;font:bold 11px/1.4 sans-serif;border-radius:8px;padding:0 6px;margin:0 2px;vertical-align:super;white-space:nowrap}';
  const boxText=el=>{let o='';const w=n=>{if(n.nodeType===3){o+=n.textContent;return;} if(n.nodeType!==1)return; if(n.tagName==='BR'){o+='\n';return;}
    if(n.classList.contains('katex')){const a=n.querySelector('annotation');o+=a?a.textContent:'';return;}
    const blk=['P','DIV','LI','TR'].includes(n.tagName); if(blk)o+='\n'; for(const c of n.childNodes)w(c); if(blk)o+='\n';}; w(el); return o;};
  function over(el,width,cls){ const old=el.style.width; el.style.width=width+'px'; const cr=el.getBoundingClientRect(); let n=0;
    el.querySelectorAll('.katex, img, table').forEach(e=>{ if(e.parentElement&&e.parentElement.closest('.katex')) return; const b=e.getBoundingClientRect(); if(b.width&&b.right>cr.right+2){ e.classList.add(cls); n++; } });
    el.style.width=old; return n; }
  function tag(e,t){ const s=document.createElement('span'); s.className='mktag'; s.textContent=t; (e.tagName==='TD'||e.tagName==='TABLE'||e.tagName==='DIV'||e.tagName==='P'?e.insertBefore(s,e.firstChild):e.after(s)); }
  async function markLayout(el,rows){
    const T=(rows||[]).filter(r=>r[2]==='화면').map(r=>String(r[3])); if(!T.length) return 0; const has=k=>T.some(t=>t.indexOf(k)===0);
    const win=window; let n=0;
    if(has('넘침(PC')) n+=over(el,640,'mkbox');
    if(has('넘침(모바일')) n+=over(el,360,'mkovm');
    if(has('표 칸 수식 줄바꿈')) el.querySelectorAll('td .katex').forEach(k=>{ const tops=new Set([...k.getClientRects()].map(r=>Math.round(r.top))); if(tops.size>1){ k.classList.add('mkbox'); n++; } });
    if(has('박스 줄바꿈 소실')) el.querySelectorAll('div,td,table,p').forEach(e=>{ const cs=win.getComputedStyle(e);
      if(cs.borderTopStyle==='none'||cs.borderLeftStyle==='none'||e.querySelector('table')) return; const t=boxText(e); if(!/[ㄱ-ㅎ]\.|\[[^\]]{1,30}\]/.test(t)) return;
      if(t.split('\n').some(line=>((line.match(/(^|[^가-힣A-Za-z])[ㄱ-ㅎ]\.\s/g)||[]).length>=2)||((line.match(/\[[^\]]{1,30}\]/g)||[]).length>=2))){ e.classList.add('mkbox'); tag(e,'줄바꿈 소실'); n++; } });
    if(has('짧은 글자 끊김')&&window.__hmlChecker2&&window.__hmlChecker2.brokenTokens) window.__hmlChecker2.brokenTokens(el).reverse().forEach(w=>{ const r=document.createRange(); r.setStart(w.node,w.start); r.setEnd(w.node,w.end); const sp=document.createElement('span'); sp.className='mkbox'; try{ r.surroundContents(sp); n++; }catch(e){} });
    if(has('수식 렌더링 오류')) el.querySelectorAll('.katex-error').forEach(e=>{ e.classList.add('mkbox'); n++; });
    if(has('그림 크기')||has('이미지 로드 실패')){ const imgs=[...el.querySelectorAll('img')]; const t0=Date.now();
      while(imgs.some(i=>!i.complete)&&Date.now()-t0<8000) await new Promise(r=>setTimeout(r,100));
      const cw=el.getBoundingClientRect().width;
      imgs.forEach(i=>{ if(has('이미지 로드 실패')&&i.complete&&!i.naturalWidth){ i.classList.add('mkbox'); tag(i,'그림 안 나옴'); n++; }
        else if(has('그림 크기')&&i.naturalWidth&&i.getBoundingClientRect().width>cw*0.9){ i.classList.add('mkbox'); n++; } }); }
    if(!n){ const d=document.createElement('div'); d.className='mklost'; d.textContent='화면 문제 위치를 자동으로 찾지 못했습니다. 왼쪽 설명을 보고 확인해 주세요.'; el.insertBefore(d,el.firstChild); }
    return n; }
  window.__hmlMarkLayout=markLayout;
})();
