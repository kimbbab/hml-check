// AI 눈검수 배경: ① HML 캡처 이미지를 받아(확장 권한이라 CORS 제약 없음) 읽기 좋은 크기 조각으로 자르고 ② Claude API에 보냄.
// API 키는 chrome.storage.local(이 PC)에만 있고, 페이지로 돌려주지 않음.
const API = 'https://api.anthropic.com/v1/messages';
const PRICE = { 'claude-haiku-5-5': [0.1, 0.5], 'claude-sonnet-5-5': [2, 10], 'claude-opus-5-5': [4, 20] }; // 100만 토큰당 $ (입력, 출력)
const MODELS = Object.keys(PRICE);
const CAP = id => 'https://items.dongahub.com/itembank/item/' + id.slice(0, 3) + '/' + id + '/1/image/' + id;
const sleep = ms => new Promise(r => setTimeout(r, ms));

chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());
chrome.runtime.onMessage.addListener((msg, sender, send) => {
  const done = p => p.then(data => send({ ok: true, data }), e => send({ ok: false, error: String(e && e.message || e) }));
  if (msg.op === 'openOptions') { chrome.runtime.openOptionsPage(); send({ ok: true, data: {} }); return; }
  if (msg.op === 'testKey') { done(testKey()); return true; }
  if (msg.op === 'check') { done(check(msg.payload || {})); return true; }
  send({ ok: false, error: '모르는 요청' });
});

// ---------- 이미지: 폭 1000px 이하로 줄이고, 세로로 긴 것은 겹치게 잘라서 글자가 뭉개지지 않게 ----------
function b64(buf) { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); }
async function tiles(url) {
  const r = await fetch(url, { credentials: 'include', cache: 'no-store' });
  if (!r.ok) throw new Error('캡처 이미지를 받지 못함(' + r.status + ')');
  const blob = await r.blob();
  let bmp; try { bmp = await createImageBitmap(blob); } catch (e) { return [{ media: blob.type || 'image/png', data: b64(await blob.arrayBuffer()) }]; }
  const W = bmp.width, H = bmp.height, sc = Math.min(1, 1000 / W), tw = Math.round(W * sc);
  const step = Math.round(1300 / sc), over = Math.round(60 / sc), out = [];
  for (let y = 0; y < H && out.length < 8; y += step - over) {
    const h = Math.min(step, H - y); if (h < 20 && y > 0) break;
    const c = new OffscreenCanvas(tw, Math.max(1, Math.round(h * sc))), g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, y, W, h, 0, 0, c.width, c.height);
    out.push({ media: 'image/png', data: b64(await (await c.convertToBlob({ type: 'image/png' })).arrayBuffer()) });
    if (y + h >= H) break;
  }
  return out;
}

// ---------- 결과 형식 ----------
const SCHEMA = { type: 'object', additionalProperties: false, required: ['summary', 'content_diffs', 'auto_verdicts', 'capture_issues', 'solve', 'meta'], properties: {
  summary: { type: 'string' },
  content_diffs: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['where', 'hml', 'html', 'note'], properties: {
    where: { type: 'string', enum: ['문제', '선지', '정답', '풀이', '그림·표'] }, hml: { type: 'string' }, html: { type: 'string' }, note: { type: 'string' } } } },
  auto_verdicts: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['no', 'real', 'reason'], properties: { no: { type: 'integer' }, real: { type: 'boolean' }, reason: { type: 'string' } } } },
  capture_issues: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['detail'], properties: { detail: { type: 'string' } } } },
  solve: { type: 'object', additionalProperties: false, required: ['match', 'ai_answer', 'html_answer', 'note'], properties: {
    match: { type: 'string', enum: ['일치', '불일치', '판단 불가', '안 함'] }, ai_answer: { type: 'string' }, html_answer: { type: 'string' }, note: { type: 'string' } } },
  meta: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['field', 'ok', 'note', 'suggest'], properties: { field: { type: 'string' }, ok: { type: 'boolean' }, note: { type: 'string' }, suggest: { type: 'string' } } } }
} };
const SYSTEM = [
  '당신은 출판사의 중학교 수학 문항 검수 편집자입니다. 문제은행 CMS의 한 문항을 검수합니다.',
  '원본은 HML(한글 파일)에서 만든 캡처 이미지입니다(문제 이미지, 해답 이미지; 길면 여러 조각으로 잘려 있고 조각 사이는 조금 겹칩니다). 웹(HTML) 내용은 텍스트와 LaTeX($...$)로 주어집니다.',
  '',
  '할 일 1. 눈 대조: 원본 이미지와 HTML 내용이 같은지 처음부터 끝까지 비교합니다.',
  '- content_diffs: 숫자·문자·기호·부등호·부호·지수·첨자·단어가 다르거나 빠지거나 더 있는 곳, 수식이 깨진 곳, 선지 순서·내용이 다른 곳, 표 칸 값이 다른 곳. hml/html에는 해당 부분을 짧게 그대로 옮겨 적고, note에는 한 줄 설명.',
  '- 무시할 것: 줄바꿈 위치, 띄어쓰기, 글꼴, 굵기, 크기, 괄호 크기(\\left \\right), 같은 기호의 다른 표기, 빈칸 □ 모양, [그림] 자리(그림 내용은 HTML에 없으므로 비교하지 않음).',
  '- capture_issues: HTML은 맞는데 캡처 이미지 자체가 깨진 경우(수식과 글자가 겹침, ∽가 -처럼 보임 등)만 적습니다.',
  '- auto_verdicts: 자동 비교기가 찾은 차이 목록이 주어지면 각 번호(no)마다 실제로 HTML을 고쳐야 하면 real=true, 표기만 다르고 화면에서 같은 내용이면 real=false로 판정하고 reason을 한 문장으로 씁니다. 목록이 없으면 빈 배열.',
  '',
  '할 일 2. 문제풀이(요청된 경우만): 문제를 직접 풀어 HTML 정답과 비교합니다. 맞으면 일치, 확실히 다르면 불일치, 그림이 필요하거나 확신이 없으면 판단 불가. note에는 불일치·판단 불가일 때만 이유를 짧게. 요청이 없으면 match="안 함", 나머지는 빈 문자열.',
  '',
  '할 일 3. 메타정보(주어진 경우만): 각 항목(유형정보, 성취기준, 내용영역, 난이도 등)이 문항 내용과 맞는지 봅니다. 명백히 어긋날 때만 ok=false로 하고 note에 이유, suggest에 제안. 코드만 있어 판단할 수 없는 항목은 ok=true. 난이도는 크게 어긋날 때만 적습니다. 메타정보가 없으면 빈 배열.',
  '',
  'summary는 한 문장(예: "원본과 같음", "풀이 3행 지수 2→3 차이", "정답 불일치 의심"). 확실한 것만 보고하고, 애매한 눈 대조 차이는 note에 "확인 필요"라고 적습니다. 모든 글은 한국어로 짧게.'
].join('\n');

async function key() { const s = await chrome.storage.local.get('apiKey'); if (!s.apiKey) throw new Error('API 키가 없습니다. 칸 오른쪽 위 [API 키] 버튼으로 넣어 주세요.'); return s.apiKey; }
async function call(body) {
  const k = await key();
  const headers = { 'content-type': 'application/json', 'x-api-key': k, 'anthropic-version': '2026-10-21', 'anthropic-dangerous-direct-browser-access': 'true' };
  if (body.model !== 'claude-haiku-5-5') { body.fallbacks = 'default'; headers['anthropic-beta'] = 'server-side-fallback-2026-07-01'; }
  for (let t = 0; t < 5; t++) {
    const r = await fetch(API, { method: 'POST', headers, body: JSON.stringify(body) });
    if (r.status === 429 || r.status === 529 || r.status >= 500) { const ra = +r.headers.get('retry-after') || 0; await sleep(Math.max(ra * 1000, 1500 * (t + 1) * (t + 1))); continue; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const m = (j.error && j.error.message) || ('HTTP ' + r.status); throw new Error(r.status === 401 ? 'API 키가 맞지 않습니다' : m.slice(0, 200)); }
    return j;
  }
  throw new Error('API가 바빠서 여러 번 실패했습니다. 잠시 뒤 다시 눌러 주세요.');
}
async function testKey() { await call({ model: 'claude-haiku-5-5', max_tokens: 16, messages: [{ role: 'user', content: 'ok' }] }); return {}; }

async function check(p) {
  const id = String(p.itemId || ''); if (!/^\d{4,}$/.test(id)) throw new Error('문항ID가 이상합니다');
  const model = MODELS.includes(p.model) ? p.model : 'claude-haiku-5-5';
  let warn = '';
  const [q, a] = await Promise.all([tiles(CAP(id) + '_Q.png'), tiles(CAP(id) + '_A.png').catch(e => { warn = '해답 캡처 없음'; return []; })]);
  const content = [];
  content.push({ type: 'text', text: '원본 문제 캡처 (' + q.length + '조각)' });
  q.forEach(t => content.push({ type: 'image', source: { type: 'base64', media_type: t.media, data: t.data } }));
  if (a.length) { content.push({ type: 'text', text: '원본 해답 캡처 (' + a.length + '조각)' }); a.forEach(t => content.push({ type: 'image', source: { type: 'base64', media_type: t.media, data: t.data } })); }
  const diffs = (p.diffs || []).slice(0, 40).map((d, i) => (i + 1) + '. [' + d.type + '] ' + String(d.detail || '').slice(0, 400)).join('\n');
  const meta = p.meta && Object.keys(p.meta).length ? Object.entries(p.meta).map(([k, v]) => k + ': ' + v).join('\n') : '';
  content.push({ type: 'text', text: '[HTML 내용]\n' + String(p.html || '').slice(0, 30000) +
    '\n\n[자동 비교기가 찾은 차이]\n' + (diffs || '(없음)') +
    '\n\n[문제풀이] ' + (p.solve ? '요청함' : '요청 안 함') +
    '\n\n[메타정보]\n' + (meta || '(없음)') });
  const body = { model, max_tokens: 16000, system: SYSTEM, messages: [{ role: 'user', content }],
    output_config: { effort: p.solve ? 'medium' : 'low', format: { type: 'json_schema', schema: SCHEMA } } };
  const j = await call(body);
  if (j.stop_reason === 'refusal') throw new Error('AI가 이 문항 답변을 거절했습니다');
  if (j.stop_reason === 'max_tokens') throw new Error('답이 너무 길어 잘렸습니다');
  const tb = (j.content || []).find(b => b.type === 'text');
  let result; try { result = JSON.parse(tb ? tb.text : '{}'); } catch (e) { throw new Error('AI 답을 읽지 못했습니다'); }
  const u = j.usage || {}, pr = PRICE[j.model] || PRICE[model];
  const cost = ((u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) * 1.25 + (u.cache_read_input_tokens || 0) * 0.1) / 1e6 * pr[0] + (u.output_tokens || 0) / 1e6 * pr[1];
  const s = await chrome.storage.local.get(['costTotal', 'calls', 'costSince']);
  const total = (s.costTotal || 0) + cost;
  await chrome.storage.local.set({ costTotal: total, calls: (s.calls || 0) + 1, costSince: s.costSince || Date.now() });
  return { result, model: j.model || model, usage: u, cost, total, tiles: q.length + a.length, warn };
}
