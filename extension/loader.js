// HML 바로 검사 로더: 저장해 둔 검사 코드를 바로 씀. 처음 한 번만 받고, 그 뒤에는 패널의 '업데이트 확인' 버튼을 누를 때만 새 버전을 받음.
(() => {
  const BASE = 'https://kimbbab.github.io/hml-check/';
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  async function fetchCode() {
    const r = await fetch(BASE + 'quick.js?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('받기 실패(' + r.status + ')');
    const code = await r.text(); set('hmlQuickCode', code); set('hmlQuickCodeAt', String(Date.now()));
    return code;
  }
  const buildOf = c => ((c || '').match(/__hmlBuild='([^']*)'/) || [])[1] || '';
  // 패널의 '업데이트 확인' 버튼이 부름: 새 버전이 있으면 받아 두고 true
  window.__hmlQuickUpdate = async () => { const old = buildOf(get('hmlQuickCode')); const code = await fetchCode(); return { updated: buildOf(code) !== old, build: buildOf(code) }; };
  const start = code => { (0, eval)(code); if (window.__hmlQuick) window.__hmlQuick.boot(); };
  const cached = get('hmlQuickCode');
  if (cached) {
    start(cached);
  } else {
    fetchCode().then(start).catch(e => console.warn('[HML 바로 검사] 검사 코드를 받지 못했습니다', e));
  }
})();
