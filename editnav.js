/* HML 수정 도우미 2026-11-20 18:17 */
(function(){window.__hmlBuild='2026-11-20 18:17';document.documentElement.setAttribute('data-hml-quick','2026-11-20 18:17');
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
      // 모바일 넘침은 고칠 필요 없음(11/20 형순 님) → 지적 안 함
      if(window.__hmlMobileCheck) cards.forEach(it=>{ const o=overflowCount(it.body); if(o) add(it.n,it.itemId,'화면','넘침(모바일 '+NARROW+'px)','수식·표·그림 '+o+'곳이 카드 밖으로 넘침'); });
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
      if(window.__hmlMobileCheck){ body.style.width=NARROW+'px'; await sleep(30); const o2=overflowCount(body); if(o2) add('화면','넘침(모바일 '+NARROW+'px)','수식·표·그림 '+o2+'곳이 카드 밖으로 넘침'); }
      return {rows,n:it.n,data,omr}; }
    finally{ box.remove(); } }
  window.__hmlChecker2=Object.assign(window.__hmlChecker2||{},{brokenTokens,checkSheet,checkItem,norm,hmlTok,diff,ensureViewer});
})();

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

window.__hmlEdit.open();})();
