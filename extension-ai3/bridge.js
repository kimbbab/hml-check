// 페이지(AI 눈검수 칸) ↔ 확장 배경(sw.js) 연결. API 키는 여기로 오가지 않음.
window.addEventListener('message', e => {
  const d = e.data;
  if (e.source !== window || !d || d.__hmlAI3 !== 'req') return;
  const reply = (ok, data, error) => window.postMessage({ __hmlAI3: 'res', rid: d.rid, ok, data, error }, location.origin);
  if (d.op === 'ping') { reply(true, { v: chrome.runtime.getManifest().version }); return; }
  try {
    chrome.runtime.sendMessage({ op: d.op, payload: d.payload }, r => {
      if (chrome.runtime.lastError) reply(false, null, chrome.runtime.lastError.message);
      else if (!r) reply(false, null, '응답 없음');
      else reply(r.ok, r.data, r.error);
    });
  } catch (err) { reply(false, null, '확장이 새로 설치됐습니다. 페이지를 새로 고쳐 주세요.'); }
});
