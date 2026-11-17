(() => {
  const Q = String.fromCharCode(63);
  const NARROW = 360;           // 좁은 화면 점검 폭(px)
  const STORE = 'hmlChecker.v2';

  // ---------- 정규화 ----------
  // 한글(HWP) 수식과 LaTeX 수식을 같은 기호열로 바꿉니다. 띄어쓰기·글꼴 명령은 지우고 숫자·문자·기호·괄호·지수는 남깁니다.
  const W = w => new RegExp('\\\\?(?<![A-Za-z])(?:'+w+')(?![A-Za-z])','gi');
  // 짧은 명령어는 점 이름(PM, IN, LE 등)과 헷갈리지 않게 소문자만
  const Ws = w => new RegExp('\\\\?(?<![A-Za-z])(?:'+w+')(?![A-Za-z])','g');
  // 한글 수식은 명령어를 붙여 쓸 수 있음(예: RMO, ANGLEit, pitimes) → 앞에서부터 떼어냄
  const KW=[['therefore','∴'],['triangle','△'],['because','∵'],['square','□'],['angle','∠'],['times','×'],['sqrt',''],['overline',''],['over',''],['bar',''],['lpile',''],['rpile',''],['cpile',''],['pile',''],['eqalign',''],['bold',''],['deg','°'],['bot','⊥'],['pi','π'],['rm',''],['it','']];
  const glue=run=>{ if(KW.some(([k])=>k===run.toLowerCase())) return run; let out='', r=run, g=false, ch=true; while(ch&&r.length){ ch=false; for(const [k,v] of KW){ if((r.length>k.length||g)&&r.slice(0,k.length).toLowerCase()===k){ out+=v; r=r.slice(k.length); ch=true; g=true; break; } } } return g?out+r:run; };
  const MAP = [
    [/\\?(?<![A-Za-z])(?:left|right)\s*\.|\\color\s*\{[^}]*\}/gi,''],[/(?<![A-Za-z])BOX\s*\{[`~\s]*\}/gi,'□'],[/\\Box(?![A-Za-z])/g,'□'],[/DIVIDE/g,'÷'],[/CDOTS/g,'⋯'],[/LEQ/g,'≤'],[/GEQ/g,'≥'],[/TIMES/g,'×'],[/\u{F0124}/gu,'예)'],[/\\rule\s*\[[^\]]*\]\s*\{[^}]*\}\s*\{[^}]*\}/g,'□'],
    [/\\phantom\s*\{[^}]*\}|\\[vh]phantom\s*\{[^}]*\}|\\hspace\s*\{[^}]*\}|\\rule\s*\{[^}]*\}\s*\{[^}]*\}|\\raisebox\s*\{[^}]*\}/g,''],
    [/\\boxed\s*\{\s*\}/g,'□'],[/\\boxed(?![A-Za-z])/g,''],[/\\not\s*=/g,'≠'],[/\+-/g,'±'],[/-\+/g,'∓'],
    [/\\bm\s*\{?\s*\/\s*\}?\s*(\\!\s*)?\\bm\s*\{?\s*\/\s*\}?/g,'∥'],[/\u{F005A}/gu,'∥'],[/\u{F0040}/gu,'∽'],[/\u{E04D}/gu,''],[/ﾟ/g,'°'],[/℃/g,'°C'],[/->/g,'→'],
    [/(?<![A-Za-z\\])[A-Za-z]+/g, m=>glue(m)],
    [W('overleftrightarrow|leftrightarrow|dyad'),'↔'],[W('overrightarrow|xrightarrow|rightarrow|rarrow|vec'),'→'],[W('buildrel'),''],
    [W('vdots'),'⋮'],[W('ddots'),'⋱'],[W('bigcirc'),'○'],
    [/\\overgroup|\\overset\s*\{?\s*\\frown\s*\}?/g,'⌒'],[W('wideparen|arch|arc'),'⌒'],
    [/\^\s*\{?\s*\\circ\s*\}?/g,'°'],[W('DEG|degree|circ'),'°'],
    [W('centigrade'),'°C'],[W('leq'),'≤'],[W('geq'),'≥'],[W('neq'),'≠'],[W('gcd'),'gcd'],[W('nabla'),'∇'],[W('bullet'),'•'],[/(?<![A-Za-z])IF(?![A-Za-z])/g,'if'],[W('vert'),''],
    [W('therefore'),'∴'],[W('because'),'∵'],[W('times'),'×'],[W('div|divide'),'÷'],[W('cdots|ldots|dots'),'⋯'],[/…/g,'⋯'],
    [Ws('leq|le'),'≤'],[/<=/g,'≤'],[Ws('geq|ge'),'≥'],[/>=/g,'≥'],[Ws('neq|ne'),'≠'],[/!=/g,'≠'],[Ws('pm'),'±'],[Ws('mp'),'∓'],[W('cdot'),'·'],
    [/−/g,'-'],[/＝/g,'='],[/==/g,'≡'],[Ws('lt'),'<'],[Ws('gt'),'>'],[/&lt;/g,'<'],[/&gt;/g,'>'],[/\\%/g,'%'],
    [Ws('pi'),'π'],[W('alpha'),'α'],[W('beta'),'β'],[W('theta'),'θ'],
    [W('angle'),'∠'],[W('triangle'),'△'],[W('square'),'□'],[W('box'),''],[W('perp|bot'),'⊥'],[W('parallel'),'∥'],[/\/\\!\/|\/\//g,'∥'],
    [W('infty|inf'),'∞'],[W('prime'),'′'],[/'/g,'′'],[W('sim'),'∽'],[W('equiv'),'≡'],[Ws('in'),'∈'],[W('subset'),'⊂'],[Ws('cup'),'∪'],[Ws('cap'),'∩'],[W('emptyset|varnothing'),'∅'],
    [/["#]/g,''],
    [W('frac|dfrac|tfrac|sqrt|left|right|mathrm|rm|it|mathit|text|textrm|bf|mathbf|bold|bm|displaystyle|quad|qquad|operatorname|overline|underline|enspace|space|over|root|of|bar|hat|dot|under|dyad|limits|cases|matrix|pile|begin|end|array|aligned|gathered|lpile|rpile|cpile|eqalign|line|mathord|rel|mbox|boldsymbol|textbf|textit|scriptstyle|small|large|boxed'),''],
    [/\\[,;:! ]/g,'']];
  const DROP = /[{}~`\s\\$&|①②③④⑤]/g;
  const norm = s => { for (const [a,b] of MAP) s = s.replace(a,b); s=s.replace(DROP,''); return s.replace(/\^([°′])/g,'$1').replace(/\(□\)/g,'□').replace(/(?<!\d)\.(?!\d)/g,''); };
  const normAns = s => norm(s.replace(/[①②③④⑤]/g, m => '#'+('①②③④⑤'.indexOf(m)+1)));

  // ---------- HML 원본 ----------
  const lin = node => { let s=''; for (const c of node.children) { const t=c.tagName;
      if (t==='CHAR') s+=c.textContent;
      else if (t==='EQUATION') { const sc=c.querySelector('SCRIPT'); s+='⟦'+(sc?sc.textContent:'')+'⟧'; }
      else if (t==='TABLE') c.querySelectorAll(':scope > ROW > CELL').forEach(cell => { s+=' '+[...cell.querySelectorAll(':scope > PARALIST > P')].map(lin).join(' '); });
      else if (['P','TEXT','SHAPEOBJECT'].includes(t)) s+=lin(c); } return s; };
  async function loadHml(doc) {
    const btn = [...doc.querySelectorAll('button[data-download-url]')][0];
    if (!btn) throw new Error('원본 다운로드 버튼 없음');
    const res = await fetch('/file/download.donga'+Q+new URLSearchParams({url: btn.dataset.downloadUrl}));
    if (!res.ok || res.redirected) throw new Error('원본 받기 실패('+res.status+')');
    const x = new DOMParser().parseFromString(new TextDecoder().decode(await res.arrayBuffer()), 'application/xml');
    const sec = x.querySelector('BODY SECTION'); if (!sec) throw new Error('HML 형식 아님');
    // (세트 문항 시작)(지문)…(문제)…(세트 문항 끝) 구조도 처리: 문항과 지문을 순서대로 분리
    const all=[...sec.querySelectorAll(':scope > P')].map(lin).join('\n').replace(/\(세트\s*문항\s*(시작|끝)\)/g,'');
    const items=[], passages=[]; let cur=null;
    all.split(/(\((?:문제|지문)\))/).forEach(part=>{ if(part==='(문제)'){ cur={kind:'item',text:''}; items.push(cur); }
      else if(part==='(지문)'){ cur={kind:'passage',text:''}; passages.push(cur); } else if(cur) cur.text+=part; });
    return {items:items.map(x=>x.text), passages:passages.map(x=>x.text)};
  }
  // HML의 (정답)(풀이)(채점 기준) 같은 소제목 표시는 지움
  const LABEL=/\((정답|다른\s*풀이|풀이|채점\s*기준|모범\s*답안|예시\s*답안|답|해설)\)/g;
  const hmlTok = seg => seg.replace(LABEL,'').split(/(⟦[^⟧]*⟧)/).map(p=>p.startsWith('⟦')?norm(p.slice(1,-1)):norm(p)).join('');

  // ---------- HTML ----------
  const htmlRaw = el => { let o=''; const w=n=>{ if(n.nodeType===3){o+=n.textContent;return;}
      if(n.nodeType!==1||['SCRIPT','STYLE','TEMPLATE','TEXTAREA'].includes(n.tagName)) return;
      if(n.classList.contains('katex')){const a=n.querySelector('annotation'); o+='⟦'+(a?a.textContent:'')+'⟧'; return;}
      if(n.classList.contains('qdoc-viewer__heading')){ o+='\u0000'+n.textContent.trim()+'\u0001'; return; }
      for(const c of n.childNodes) w(c); o+=' '; }; w(el); return o; };
  // HTML 원문을 소제목(정답·풀이·채점 기준 등) 기준으로 나눔
  const htmlParts = raw => { const parts={_:''}; let cur='_'; raw.split(/\u0000/).forEach((chunk,i)=>{ if(i===0){parts._+=chunk;return;} const [h,rest]=chunk.split('\u0001'); cur=h.replace(/\s/g,''); parts[cur]=(parts[cur]||'')+(rest||''); }); return parts; };

  function diff(a,b){ const n=a.length,m=b.length; if((n+1)*(m+1)>3e7) return ['(문항이 너무 길어 대조 생략)'];
    const W=m+1,L=new Uint16Array((n+1)*W);
    for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)L[i*W+j]=a[i]===b[j]?L[(i+1)*W+j+1]+1:Math.max(L[(i+1)*W+j],L[i*W+j+1]);
    const ops=[];let i=0,j=0;while(i<n&&j<m){if(a[i]===b[j]){ops.push(['=',a[i]]);i++;j++;}else if(L[(i+1)*W+j]>=L[i*W+j+1])ops.push(['-',a[i++]]);else ops.push(['+',b[j++]]);}
    while(i<n)ops.push(['-',a[i++]]);while(j<m)ops.push(['+',b[j++]]);
    const h=[];let k=0;while(k<ops.length){if(ops[k][0]==='='){k++;continue;}const s=k;while(k<ops.length&&ops[k][0]!=='=')k++;
      h.push('…'+ops.slice(Math.max(0,s-10),s).map(o=>o[1]).join('')+' [HML: '+ops.slice(s,k).filter(o=>o[0]==='-').map(o=>o[1]).join('')+' / HTML: '+ops.slice(s,k).filter(o=>o[0]==='+').map(o=>o[1]).join('')+'] '+ops.slice(k,k+10).map(o=>o[1]).join('')+'…');}
    return h.length>15? [...h.slice(0,15),'(그 밖에 '+(h.length-15)+'곳 더 다름)'] : h; }

  // ---------- 화면 점검 ----------
  function overflowCount(body){ const cr=body.getBoundingClientRect(); let n=0;
    body.querySelectorAll('.katex, img, table').forEach(e=>{ if(e.parentElement&&e.parentElement.closest('.katex')) return;
      const b=e.getBoundingClientRect(); if(b.width&&b.right>cr.right+2) n++; }); return n; }
  // 수식은 원본 TeX로, 줄바꿈은 블록·<br> 기준으로만 읽은 텍스트
  const boxText=el=>{let o='';const w=n=>{if(n.nodeType===3){o+=n.textContent;return;} if(n.nodeType!==1)return; if(n.tagName==='BR'){o+='\n';return;}
    if(n.classList.contains('katex')){const a=n.querySelector('annotation');o+=a?a.textContent:'';return;}
    const blk=['P','DIV','LI','TR'].includes(n.tagName); if(blk)o+='\n'; for(const c of n.childNodes)w(c); if(blk)o+='\n';}; w(el); return o;};
  function brokenTokens(root){ const out=[]; const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement&&n.parentElement.closest('.katex,script,style')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
    let n; while((n=tw.nextNode())){ const t=n.textContent; const re=/[^\s가-힣]{2,8}/g; let m;
      while((m=re.exec(t))){ if(!/[0-9A-Za-z①-⑳]/.test(m[0])) continue; const r=document.createRange(); r.setStart(n,m.index); r.setEnd(n,m.index+m[0].length);
        const tops=[...r.getClientRects()].filter(x=>x.width>0).map(x=>Math.round(x.top)); if(tops.length>1&&Math.max(...tops)-Math.min(...tops)>3) out.push({node:n,start:m.index,end:m.index+m[0].length,text:m[0]}); } }
    return out; }
  function layoutIssues(body, win){
    const out=[];
    // 보기/자료 박스 줄바꿈 소실
    body.querySelectorAll('div,td,table,p').forEach(e=>{ const cs=win.getComputedStyle(e);
      if(cs.borderTopStyle==='none'||cs.borderLeftStyle==='none') return;
      if(e.querySelector('table')) return;
      const t=boxText(e); if(!/[ㄱ-ㅎ]\.|\[[^\]]{1,30}\]/.test(t)) return;
      const bad=t.split('\n').some(line=>((line.match(/(^|[^가-힣A-Za-z])[ㄱ-ㅎ]\.\s/g)||[]).length>=2)||((line.match(/\[[^\]]{1,30}\]/g)||[]).length>=2));
      if(bad) out.push(['박스 줄바꿈 소실','[보기]/자료 항목이 한 줄로 붙음']); });
    // 표 칸 안 수식 줄바꿈
    body.querySelectorAll('td .katex').forEach(k=>{ const tops=new Set([...k.getClientRects()].map(r=>Math.round(r.top))); if(tops.size>1) out.push(['표 칸 수식 줄바꿈','표 칸 안 수식이 두 줄로 나뉨: '+((k.querySelector('annotation')||{}).textContent||'')]); });
    // 짧은 글자 끊김: (2), ①, cm 처럼 한글이 없는 짧은 덩어리가 두 줄로 나뉨(좁은 칸·그림 옆)
    for(const w of brokenTokens(body)) out.push(['짧은 글자 끊김','"'+w.text+'"가 두 줄로 나뉨']);
    // 이미지·수식 오류
    body.querySelectorAll('img').forEach(i=>{ if(i.complete&&!i.naturalWidth) out.push(['이미지 로드 실패',i.getAttribute('src')?.split('/').pop()||'']); });
    body.querySelectorAll('.katex-error').forEach(e=>out.push(['수식 렌더링 오류',e.textContent.slice(0,60)]));
    // 그림 과대
    const cw=body.getBoundingClientRect().width;
    body.querySelectorAll('img').forEach(i=>{ if(i.naturalWidth&&i.getBoundingClientRect().width>cw*0.9) out.push(['그림 크기','그림이 카드 폭 가득 표시됨(원본 대비 확인 필요)']); });
    // 중복 제거
    const seen=new Set(); return out.filter(r=>{const k=r.join('|'); if(seen.has(k)) return false; seen.add(k); return true;});
  }

  // ---------- 시험지 1개 검수 ----------
  // CMS 상세 페이지는 다른 창(iframe)에 넣을 수 없어서, 상세 페이지 HTML을 받아
  // CMS의 문항 뷰어(renderQuestionView)로 이 페이지 안 보이지 않는 곳에 직접 그려서 점검합니다.
  const PC_WIDTH = 640;          // PC 화면 카드 폭(px)
  function viewerInfo(d){ const inline=[...d.querySelectorAll('script:not([src])')].map(s=>s.textContent).find(t=>t.includes('renderQuestionView'))||'';
    return {css:[...d.querySelectorAll('link[rel=stylesheet]')].map(l=>l.href), js:[...d.querySelectorAll('script[src]')].map(s=>s.src).filter(u=>/question-viewer|katex/i.test(u)),
      base:((inline.match(/cdnBaseUrl\s*=\s*["']([^"']+)/)||[])[1]||'').replace(/\\\//g,'/')}; }
  async function ensureViewerInfo(v){
    if (window.renderQuestionView && window.renderPassageView) return;
    const have=new Set([...document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.href));
    for (const h of v.css) { if(have.has(h)) continue; const n=document.createElement('link'); n.rel='stylesheet'; n.href=h; document.head.appendChild(n); }
    if(!window.DongaQuestionViewer) for (const src of v.js) await new Promise((ok,ng)=>{ const n=document.createElement('script'); n.src=src; n.onload=ok; n.onerror=ng; document.head.appendChild(n); });
    const base=v.base;
    window.renderPassageView=window.renderPassageView||((target,doc)=>window.DongaQuestionViewer.renderPassage(target,{passageContent:(doc&&doc.content&&doc.content.passageHtml)||''},{imageBaseUrl:base}));
    window.renderQuestionView=(target,doc,layout)=>window.DongaQuestionViewer.render(target,doc,{imageBaseUrl:base,showAnswer:true,showExplanation:true,showModelAnswer:true,showGradingCriteria:true,layout:layout||undefined});
  }
  async function ensureViewer(detailDoc){ return ensureViewerInfo(viewerInfo(detailDoc)); }
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function waitImages(el){ const imgs=[...el.querySelectorAll('img')]; const t0=Date.now();
    while(imgs.some(i=>!i.complete)&&Date.now()-t0<8000) await sleep(100); }

  async function checkSheet(id, name){
    const rows=[]; const add=(n,itemId,kind,type,detail)=>rows.push({id,name,n,itemId,kind,type,detail});
    const box=document.createElement('div'); box.style.cssText='position:absolute;left:-30000px;top:0';
    try{
      const res=await fetch('/item/hml/detail.donga'+Q+'examDocumentId='+id);
      if(res.redirected&&/login/.test(res.url)) throw new Error('로그인이 풀렸습니다. 다시 로그인 후 시작을 누르세요');
      const d=new DOMParser().parseFromString(await res.text(),'text/html');
      await ensureViewer(d);
      if(!name) name=(d.body.innerText.match(/원본 파일\s*\n?\s*([^\n]+)/)||[])[1]?.replace('다운로드','').trim()||'';
      document.body.appendChild(box);
      // 문항 카드(세트 안 소문항 #1-1 포함)를 화면 순서대로
      const cards=[...d.querySelectorAll('.card')].map(c=>{const h=c.querySelector(':scope > .card-header'); const m=h&&h.textContent.match(/#([\d-]+)\s*문항ID\s*(\d+)/); const q=c.querySelector(':scope > .card-body .qv-item script'); return m&&q?{n:m[1],itemId:m[2],json:q.textContent}:null;}).filter(Boolean);
      const passEls=[...d.querySelectorAll('.qv-passage script')];
      for(const it of cards){ const body=document.createElement('div'); body.className='card-body'; body.style.cssText='width:'+PC_WIDTH+'px;padding:20px;box-sizing:border-box;background:#fff';
        const q=document.createElement('div'); q.className='qv-item'; q.dataset.qvLayout='card'; body.appendChild(q); box.appendChild(body); it.body=body;
        try{ window.renderQuestionView(q, JSON.parse(it.json), 'card'); }catch(e){ add(it.n,it.itemId,'화면','HTML 렌더링 실패',e.message); } }
      await waitImages(box);
      const win=window;
      let segs=null, hmlPass=[]; try{ const h=await loadHml(d); segs=h.items; hmlPass=h.passages; }catch(e){ add('', '', '내용', '원본 대조 불가', e.message); }
      // 지문 대조
      if(segs){ if(hmlPass.length!==passEls.length) add('', '', '내용', '지문 수 불일치', 'HML '+hmlPass.length+'개 / HTML '+passEls.length+'개');
        for(const [i,sc] of passEls.entries()){ if(!hmlPass[i]) break; const pb=document.createElement('div'); pb.className='card-body'; pb.style.cssText='width:'+PC_WIDTH+'px;padding:20px;box-sizing:border-box'; box.appendChild(pb);
          const q=document.createElement('div'); q.className='qv-passage'; pb.appendChild(q);
          try{ window.renderPassageView(q, JSON.parse(sc.textContent)); }catch(e){ add('지문'+(i+1),'','화면','지문 렌더링 실패',e.message); continue; }
          for(const h of diff(hmlTok(hmlPass[i]), hmlTok(htmlRaw(pb)))) add('지문'+(i+1),'','내용','지문 글자·수식 차이',h);
          for(const [t,dt] of layoutIssues(pb,window)) add('지문'+(i+1),'','화면',t,dt); } }
      if(segs&&segs.length!==cards.length) add('', '', '내용', '문항 수 불일치', 'HML '+segs.length+'개 / HTML '+cards.length+'개 (번호가 밀려 대조 결과가 부정확할 수 있음)');
      for(const [idx,it] of cards.entries()){
        const body=it.body;
        if(segs&&segs[idx]){ const seg=segs[idx], raw=htmlRaw(body), parts=htmlParts(raw);
          const htmlAll=hmlTok(raw.replace(/\u0000[^\u0001]*\u0001/g,''));  // 같은 방식(수식·본문 따로)으로 정규화
          for(const h of diff(hmlTok(seg), htmlAll)) add(it.n,it.itemId,'내용','글자·수식 차이',h);
          const ha=normAns((seg.split('(정답)')[1]||'').split(/\((풀이|채점\s*기준|해설)\)/)[0].replace(/⟦([^⟧]*)⟧/g,'$1'));
          const ta=normAns((parts['정답']||'').replace(/[⟦⟧]/g,''));
          if(seg.includes('(정답)')&&ha!==ta) add(it.n,it.itemId,'내용','정답 차이','HML: '+ha+' / HTML: '+ta);
          const hc=(seg.split('(정답)')[0].match(/[①②③④⑤]/g)||[]).length, tc=body.querySelectorAll('.d-choice').length;
          if(hc!==tc) add(it.n,it.itemId,'내용','선지 개수 차이','HML '+hc+'개 / HTML '+tc+'개');
        }
        const o1=overflowCount(body); if(o1) add(it.n,it.itemId,'화면','넘침(PC '+PC_WIDTH+'px)','수식·표·그림 '+o1+'곳이 카드 밖으로 넘침');
        for(const [t,dt] of layoutIssues(body,win)) add(it.n,it.itemId,'화면',t,dt);
      }
      // 좁은 화면(모바일)
      cards.forEach(it=>{ it.body.style.width=NARROW+'px'; });
      await sleep(50);
      cards.forEach(it=>{ const o=overflowCount(it.body); if(o) add(it.n,it.itemId,'화면','넘침(모바일 '+NARROW+'px)','수식·표·그림 '+o+'곳이 카드 밖으로 넘침'); });
      return {ok:true, items:cards.length, rows};
    }catch(e){ add('','','오류','검수 실패',e.message); return {ok:false, items:0, rows}; }
    finally{ box.remove(); }
  }

  // 문항 하나만 검사(바로 검사용). 시험지 카드 순서와 HML 원본은 시험지마다 한 번만 읽어 기억해 둠.
  // opts.json: 이 문항의 지금 HTML 데이터(있으면 다시 받지 않음) / opts.fresh: 기억해 둔 것을 버리고 새로 읽음
  const SHEETS={};
  async function sheetData(id,fresh){ if(!fresh&&SHEETS[id]) return SHEETS[id];
    if(!fresh){ let c=null; try{ c=JSON.parse(sessionStorage.getItem('hmlSheet:'+id)||'null'); }catch(e){} if(c&&c.cards&&c.viewer){ await ensureViewerInfo(c.viewer); return SHEETS[id]=c; } }
    const res=await fetch('/item/hml/detail.donga'+Q+'examDocumentId='+id,{credentials:'include'});
    if(/login/.test(res.url)) throw new Error('로그인이 풀렸습니다. 다시 로그인해 주세요');
    const d=new DOMParser().parseFromString(await res.text(),'text/html'); const viewer=viewerInfo(d); await ensureViewerInfo(viewer);
    const cards=[...d.querySelectorAll('.card')].map(c=>{const h=c.querySelector(':scope > .card-header'); const m=h&&h.textContent.match(/#([\d-]+)\s*문항ID\s*(\d+)/); const q=c.querySelector(':scope > .card-body .qv-item script'); return m&&q?{n:m[1],itemId:m[2],json:q.textContent}:null;}).filter(Boolean);
    let segs=null, err=''; try{ segs=(await loadHml(d)).items; }catch(e){ err=e.message; }
    try{ sessionStorage.setItem('hmlSheet:'+id,JSON.stringify({cards:cards.map(c=>({n:c.n,itemId:c.itemId})),segs,err,viewer})); }catch(e){}
    return SHEETS[id]={cards,segs,err,viewer}; }
  async function checkItem(id,itemId,opts){ opts=opts||{}; const rows=[]; const S=await sheetData(id,opts.fresh);
    let S2=S, idx=S.cards.findIndex(c=>c.itemId===String(itemId));
    if(idx<0||!(opts.json||S.cards[idx].json)){ if(!opts.fresh){ S2=await sheetData(id,true); idx=S2.cards.findIndex(c=>c.itemId===String(itemId)); } }
    if(idx<0) throw new Error('시험지 '+id+'에서 문항ID '+itemId+'를 찾지 못했습니다');
    const it=S2.cards[idx]; const add=(kind,type,detail)=>rows.push({n:it.n,itemId:it.itemId,kind,type,detail});
    const json=opts.json||it.json; const data=JSON.parse(json);
    if(!S2.segs) add('내용','원본 대조 불가',S2.err||'HML 원본을 읽지 못함');
    else if(S2.segs.length!==S2.cards.length) add('내용','문항 수 불일치','HML '+S2.segs.length+'개 / HTML '+S2.cards.length+'개 (번호가 밀려 대조 결과가 부정확할 수 있음)');
    const box=document.createElement('div'); box.style.cssText='position:absolute;left:-30000px;top:0'; document.body.appendChild(box);
    try{ const body=document.createElement('div'); body.className='card-body'; body.style.cssText='width:'+PC_WIDTH+'px;padding:20px;box-sizing:border-box;background:#fff';
      const q=document.createElement('div'); q.className='qv-item'; q.dataset.qvLayout='card'; body.appendChild(q); box.appendChild(body);
      try{ window.renderQuestionView(q,data,'card'); }catch(e){ add('화면','HTML 렌더링 실패',e.message); }
      await waitImages(box);
      const seg=S2.segs&&S2.segs[idx];
      if(seg){ const raw=htmlRaw(body), parts=htmlParts(raw); const htmlAll=hmlTok(raw.replace(/\u0000[^\u0001]*\u0001/g,''));
        for(const h of diff(hmlTok(seg), htmlAll)) add('내용','글자·수식 차이',h);
        const ha=normAns((seg.split('(정답)')[1]||'').split(/\((풀이|채점\s*기준|해설)\)/)[0].replace(/⟦([^⟧]*)⟧/g,'$1')); const ta=normAns((parts['정답']||'').replace(/[⟦⟧]/g,''));
        if(seg.includes('(정답)')&&ha!==ta) add('내용','정답 차이','HML: '+ha+' / HTML: '+ta);
        const hc=(seg.split('(정답)')[0].match(/[①②③④⑤]/g)||[]).length, tc=body.querySelectorAll('.d-choice').length;
        if(hc!==tc) add('내용','선지 개수 차이','HML '+hc+'개 / HTML '+tc+'개'); }
      // OMR 정답과 HTML 정답 비교
      const g=data.grading||{}; const htmlAns=((data.content||{}).answerText)||((htmlParts(htmlRaw(body))['정답'])||'').replace(/\u0000|\u0001|[⟦⟧]/g,'');
      const omrTxt=g.choices&&g.choices.length?g.choices.join(','):(g.value==null?'':String(g.value));
      const omr={mode:g.mode||'',value:omrTxt,answer:String(htmlAns||'').trim()};
      const circ=t=>[...String(t)].map(ch=>'①②③④⑤⑥⑦⑧⑨⑩'.indexOf(ch)+1).filter(x=>x>0);
      if(g.choices&&g.choices.length){ const a=[...new Set(g.choices.map(x=>parseInt(String(x).replace(/[^\d]/g,''),10)||circ(x)[0]).filter(Boolean))].sort((x,y)=>x-y);
        let b=[...new Set(circ(htmlAns))].sort((x,y)=>x-y); if(!b.length&&/^\s*\d+(\s*,\s*\d+)*\s*$/.test(htmlAns)) b=htmlAns.split(',').map(x=>+x).sort((x,y)=>x-y);
        if(a.join(',')!==b.join(',')) add('내용','OMR 정답 차이','OMR('+(g.mode||'선택')+'): '+a.map(x=>'①②③④⑤⑥⑦⑧⑨⑩'[x-1]||x).join(',')+' / HTML 정답: '+(htmlAns||'(없음)')); }
      else if(g.mode&&omrTxt===''&&!/서술|없음|none|essay/i.test(g.mode)){ add('내용','OMR 정답 비어 있음','OMR 방식 '+g.mode+' / HTML 정답: '+(htmlAns||'(없음)')); }
      else if(omrTxt!==''){ const nz=x=>norm(String(x)).replace(/\s+/g,'').replace(/[{}$]/g,''); if(nz(omrTxt)!==nz(htmlAns)) add('내용','OMR 정답 차이','OMR('+(g.mode||'값')+'): '+omrTxt+' / HTML 정답: '+(htmlAns||'(없음)')); }
      const o1=overflowCount(body); if(o1) add('화면','넘침(PC '+PC_WIDTH+'px)','수식·표·그림 '+o1+'곳이 카드 밖으로 넘침');
      for(const [t,dt] of layoutIssues(body,window)) add('화면',t,dt);
      body.style.width=NARROW+'px'; await sleep(30); const o2=overflowCount(body); if(o2) add('화면','넘침(모바일 '+NARROW+'px)','수식·표·그림 '+o2+'곳이 카드 밖으로 넘침');
      return {rows,n:it.n,data,omr}; }
    finally{ box.remove(); } }
  window.__hmlChecker2=Object.assign(window.__hmlChecker2||{},{brokenTokens,checkSheet,checkItem,norm,hmlTok,diff,ensureViewer});
})();
