/* HML 다시 저장 2026-11-18 08:18 */
window.__hmlResaveBuild='2026-11-18 08:18';
/* HML 다시 저장(한 문항): CMS 문항 수정 화면에서 버튼 하나로
 * 한글 편집기를 열어 지문·지문해석·문제·해답을 차례로 열고 저장(수식 크기 재계산 + 캡처 새로 만들기)한다.
 * 글자 ∽는 캡처에서 겹쳐 그려져서 수식 ∽로 바꾼 뒤 저장한다.
 * 저장 결과는 화면에 채워지기만 하고, [전체 반영]은 사람이 누른다.
 * 문항 상세 화면에서는 수정 화면으로 옮겨 가서 바로 실행한다.
 */
(function () {
  'use strict';
  if (window.__hmlResave1) return;

  var SLOTS = ['passage', 'translation', 'question', 'explain'];
  var KO = { passage: '지문', translation: '지문해석', question: '문제', explain: '해답' };
  var HASH = '#hmlResave';
  var busy = false;

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  async function until(fn, ms, what) {
    var t0 = Date.now();
    while (Date.now() - t0 < ms) {
      var v; try { v = fn(); } catch (e) { if (e && e.hard) throw e; v = null; }
      if (v) return v;
      await sleep(250);
    }
    throw new Error('시간 초과: ' + what);
  }
  function hard(msg) { var e = new Error(msg); e.hard = true; return e; }

  function closeModals(win) {
    try {
      Array.prototype.forEach.call(win.document.querySelectorAll('.modal.show'), function (m) {
        var b = m.querySelector('[data-alert-ok], .btn-primary[data-bs-dismiss], [data-bs-dismiss=modal]');
        if (b) b.click();
      });
    } catch (e) {}
  }

  // 글자 ∽ → 수식 ∽ (수식 안의 ∽는 찾기에 걸리지 않음)
  function fixSim(ed) {
    var H = ed.document.getElementById('webhwpFrame').contentWindow.HwpCtrl, n = 0;
    for (var k = 0; k < 100; k++) {
      H.MovePos(2);
      var act = H.CreateAction('RepeatFind'), set = act.CreateSet();
      act.GetDefault(set);
      set.SetItem('FindString', '∽'); set.SetItem('Direction', 0); set.SetItem('IgnoreMessage', 1);
      if (!act.Execute(set)) break;
      H.Run('Delete');
      var ea = H.CreateAction('EquationCreate'), es = ea.CreateSet();
      ea.GetDefault(es);
      es.SetItem('String', '∽'); es.SetItem('BaseUnit', 1100);
      if (!ea.Execute(es)) throw hard('∽ 수식 넣기 실패');
      n++;
    }
    return n;
  }

  // ---------- 버튼 ----------
  var box = document.createElement('div');
  box.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:2147483000;font:13px/1.5 sans-serif;display:flex;flex-direction:column;align-items:flex-start;gap:4px';
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.textContent = '한글 다시 저장';
  btn.title = '한글 편집기에서 지문·문제·해답을 열고 저장합니다(수식 겹침 해결). 저장 뒤 [전체 반영]은 직접 누르세요.';
  btn.style.cssText = 'padding:8px 14px;border:0;border-radius:8px;background:#206bc4;color:#fff;font-weight:bold;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.25)';
  var msg = document.createElement('div');
  msg.style.cssText = 'max-width:360px;background:#fff;border:1px solid #ccc;border-radius:6px;padding:4px 8px;display:none;white-space:pre-wrap';
  var upd = document.createElement('a');
  upd.href = '#'; upd.textContent = '업데이트 확인';
  upd.style.cssText = 'font-size:11px;color:#888';
  box.appendChild(msg); box.appendChild(btn); box.appendChild(upd);
  document.body.appendChild(box);

  function say(t, color) { msg.style.display = t ? 'block' : 'none'; msg.style.color = color || '#222'; msg.textContent = t; }

  upd.onclick = function (e) {
    e.preventDefault();
    if (!window.__hmlResaveUpdate) { say('확장에서만 업데이트할 수 있습니다.'); return; }
    say('확인 중...');
    window.__hmlResaveUpdate().then(function (r) {
      say(r.updated ? '새 버전(' + r.build + ')을 받았습니다. 새로고침하면 적용됩니다.' : '최신판입니다(' + r.build + ').');
    }).catch(function (err) { say('업데이트 확인 실패: ' + err.message, '#c00'); });
  };

  var isModify = /\/item\/all\/modify\.donga/.test(location.pathname);
  var isDetail = /\/item\/all\/detail\.donga/.test(location.pathname);
  if (!isModify && !isDetail) { box.remove(); return; }

  if (isDetail) {
    // 상세 화면: 수정 화면으로 옮겨 가서 바로 실행
    btn.onclick = function () {
      var id = new URLSearchParams(location.search).get('itemId');
      if (!id) { say('문항 ID를 찾지 못했습니다.', '#c00'); return; }
      location.href = '/item/all/modify.donga?itemId=' + encodeURIComponent(id) + HASH;
    };
    window.__hmlResave1 = { boot: function () {} };
    return;
  }

  // ---------- 수정 화면 ----------
  async function run(ed) {
    var owner = document.querySelector('[data-editor-url]');
    var slots = SLOTS.filter(function (s) { var x = window.webhwpSlot && window.webhwpSlot(s); return x && x.url; });
    if (!slots.length) throw hard('저장할 한글 파일이 없습니다.');
    var status = function () { var s = ed.document.querySelector('[data-webhwp-status]'); return s ? s.textContent.trim() : ''; };

    say('한글 편집기를 여는 중...');
    await until(function () { return ed.document.readyState === 'complete' && ed.document.querySelector('[data-webhwp-action=save]'); }, 60000, '편집기 열기');
    if (slots.indexOf('question') >= 0) await until(function () { return /열었습니다/.test(status()); }, 90000, '문제 열기');
    else await sleep(3000);

    var done = [], sims = 0;
    for (var i = 0; i < slots.length; i++) {
      var s = slots[i];
      var b = ed.document.querySelector('[data-webhwp-open][data-slot=' + s + ']');
      if (!b) throw hard(KO[s] + ' 버튼이 없습니다.');
      closeModals(ed);
      if (!b.classList.contains('active')) {
        say(KO[s] + ' 여는 중...');
        ed.document.querySelector('[data-webhwp-status]').textContent = '';
        b.click();
        await until(function () {
          if (/못했습니다/.test(status())) throw hard(KO[s] + ' 파일을 열지 못했습니다.');
          return /열었습니다/.test(status()) && b.classList.contains('active');
        }, 90000, KO[s] + ' 열기');
      }
      await sleep(600);
      sims += fixSim(ed);
      say(KO[s] + ' 저장 중...');
      closeModals(ed);
      var before = window.webhwpSavedHml[s] || '';
      ed.document.querySelector('[data-webhwp-action=save]').click();
      await until(function () {
        if (/실패|읽지 못했습니다/.test(status())) throw hard(KO[s] + ' 저장 실패: ' + status());
        return (window.webhwpSavedHml[s] || '') !== before && window.webhwpSavedImage[s];
      }, 120000, KO[s] + ' 저장');
      await until(function () { return !/중입니다/.test(status()); }, 60000, KO[s] + ' 다시 열기');
      await sleep(300); closeModals(ed);
      done.push(KO[s]);
    }
    try { ed.close(); } catch (e) {}
    return done.join('·') + ' 저장 완료' + (sims ? ' (∽ ' + sims + '곳 수식으로)' : '');
  }

  function start() {
    if (busy) return;
    var owner = document.querySelector('[data-editor-url]');
    if (!owner || typeof window.webhwpSlot !== 'function') { say('한글 편집기 버튼을 찾지 못했습니다.', '#c00'); return; }
    // 팝업은 클릭 안에서 바로 열어야 막히지 않음
    var ed = window.open(owner.dataset.editorUrl, 'webhwpEditor', 'width=1280,height=900,resizable=yes,scrollbars=yes');
    if (!ed) { say('팝업이 막혔습니다. 주소창 오른쪽에서 팝업을 허용한 뒤 다시 누르세요.', '#c00'); return; }
    busy = true; btn.disabled = true; btn.style.opacity = '.6';
    run(ed).then(function (t) {
      say(t + '\n→ 이제 [전체 반영]을 누르세요.', '#0a7a2f');
      var ap = Array.prototype.find.call(document.querySelectorAll('button'), function (x) { return /전체 반영/.test(x.textContent) && x.offsetParent; });
      if (ap) { ap.scrollIntoView({ block: 'center' }); ap.style.outline = '3px solid #f59f00'; ap.style.outlineOffset = '2px'; }
    }).catch(function (e) {
      say('멈춤: ' + (e.message || e), '#c00');
    }).then(function () { busy = false; btn.disabled = false; btn.style.opacity = '1'; });
  }

  btn.onclick = start;

  window.__hmlResave1 = {
    boot: function () {
      // 상세 화면에서 넘어온 경우: 팝업은 사용자 클릭이 필요해서 버튼만 강조
      if (location.hash === HASH) {
        history.replaceState(null, '', location.pathname + location.search);
        btn.style.outline = '3px solid #f59f00';
        say('[한글 다시 저장]을 누르세요.');
      }
    }
  };
})();
