/* HML 바로 검사 2026-11-17 10:26 */
(function(){window.__hmlBuild='2026-11-17 10:26';document.documentElement.setAttribute('data-hml-quick','2026-11-17 10:26');
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
      K.last={id:String(id),sid:String(sid),n,data,rows:mine,at:Date.now()};   // AI 눈검수(ver3)가 읽음
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

})();
