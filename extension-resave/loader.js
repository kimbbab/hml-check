// HML 다시 저장 로더: 저장해 둔 코드를 바로 씀. 처음 한 번만 받고, 그 뒤에는 버튼 밑 '업데이트 확인'을 누를 때만 새 버전을 받음.
(() => {
  const BASE = 'https://kimbbab.github.io/hml-check/';
  const KEY = 'hmlResaveCode';
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  async function fetchCode() {
    const r = await fetch(BASE + 'resave.js?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error('받기 실패(' + r.status + ')');
    const code = await r.text(); set(KEY, code);
    return code;
  }
  const buildOf = c => ((c || '').match(/__hmlResaveBuild='([^']*)'/) || [])[1] || '';
  window.__hmlResaveUpdate = async () => { const old = buildOf(get(KEY)); const code = await fetchCode(); return { updated: buildOf(code) !== old, build: buildOf(code) }; };
  const start = code => { (0, eval)(code); if (window.__hmlResave1) window.__hmlResave1.boot(); };
  const cached = get(KEY);
  if (cached) start(cached);
  else fetchCode().then(start).catch(e => console.warn('[HML 다시 저장] 코드를 받지 못했습니다', e));
})();
