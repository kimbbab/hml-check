// HML 바로 검사(ver2) + AI 눈검수(ver3) 로더: 저장해 둔 코드를 바로 씀. 처음 한 번만 받고, 그 뒤에는 '업데이트 확인' 버튼을 누를 때만 새 버전을 받음.
(() => {
  const BASE = 'https://kimbbab.github.io/hml-check/';
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const FILES = [['quick.js', 'hmlQuickCode', /__hmlBuild='([^']*)'/], ['ai3.js', 'hmlAi3Code', /__hmlAi3Build='([^']*)'/]];
  async function fetchOne(f) {
    const r = await fetch(BASE + f[0] + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error(f[0] + ' 받기 실패(' + r.status + ')');
    const code = await r.text(); set(f[1], code); return code;
  }
  const buildOf = (f, c) => ((c || '').match(f[2]) || [])[1] || '';
  const label = () => FILES.map(f => buildOf(f, get(f[1]))).join(' / AI ');
  window.__hmlQuickUpdate = async () => { const old = label(); for (const f of FILES) await fetchOne(f); const now = label(); return { updated: now !== old, build: now }; };
  async function start() {
    const codes = [];
    for (const f of FILES) codes.push(get(f[1]) || await fetchOne(f));
    // ver2 확장이 함께 켜져 있으면 바로 검사는 그쪽 것을 쓰고 AI 칸만 붙임
    if (!document.documentElement.hasAttribute('data-hml-quick')) { (0, eval)(codes[0]); if (window.__hmlQuick) window.__hmlQuick.boot(); }
    (0, eval)(codes[1]);
  }
  start().catch(e => console.warn('[HML AI 눈검수] 검사 코드를 받지 못했습니다', e));
})();
