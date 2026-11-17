// HML 바로 검사 로더: 검사 코드(quick.js)를 웹에서 최신판으로 받아 실행. 받지 못하면 이 브라우저에 마지막으로 받아 둔 것을 씀.
(async () => {
  const BASE = 'https://kimbbab.github.io/hml-check/';
  let code = null;
  try {
    const r = await fetch(BASE + 'quick.js?t=' + Date.now(), { cache: 'no-store' });
    if (r.ok) { code = await r.text(); try { localStorage.setItem('hmlQuickCode', code); } catch (e) {} }
  } catch (e) {}
  if (!code) { try { code = localStorage.getItem('hmlQuickCode'); } catch (e) {} }
  if (!code) { console.warn('[HML 바로 검사] 검사 코드를 받지 못했습니다'); return; }
  (0, eval)(code);
  if (window.__hmlQuick) window.__hmlQuick.boot();
})();
