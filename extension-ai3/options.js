const $ = id => document.getElementById(id);
const st = t => { $('st').textContent = t; };
async function show() {
  const s = await chrome.storage.local.get(['apiKey', 'costTotal', 'calls', 'costSince']);
  $('key').placeholder = s.apiKey ? '저장됨: ' + s.apiKey.slice(0, 10) + '…' + s.apiKey.slice(-4) : 'sk-ant-...';
  $('cost').textContent = '누적 약 $' + (s.costTotal || 0).toFixed(3) + ' (약 ' + Math.round((s.costTotal || 0) * 1450).toLocaleString() + '원) · ' + (s.calls || 0) + '문항' + (s.costSince ? ' · ' + new Date(s.costSince).toLocaleDateString() + '부터' : '');
}
$('save').onclick = async () => { const k = $('key').value.trim(); if (!/^sk-ant-/.test(k)) { st('sk-ant- 로 시작하는 Claude API 키를 넣어 주세요.'); return; } await chrome.storage.local.set({ apiKey: k }); $('key').value = ''; st('저장했습니다.'); show(); };
$('del').onclick = async () => { await chrome.storage.local.remove('apiKey'); st('키를 지웠습니다.'); show(); };
$('test').onclick = async () => { st('시험 중…'); const r = await chrome.runtime.sendMessage({ op: 'testKey' }); st(r.ok ? '키가 작동합니다.' : '안 됩니다: ' + r.error); };
$('reset').onclick = async () => { await chrome.storage.local.set({ costTotal: 0, calls: 0, costSince: Date.now() }); show(); };
show();
