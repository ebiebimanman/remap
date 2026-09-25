/* =========================================================
   りまっぷ 紹介サイト
   - ハッシュルーティング（300ms フェード）
   - ヘッダーメニューの開閉（300ms フェード）
   - バグ報告フォーム（Apps Script へ POST + 4秒トースト）
   ========================================================= */
(function () {
  'use strict';

  /* バグ報告の送信先（Google Apps Script のウェブアプリ URL）。
     設定手順は docs/bug-report-form/README.md を参照。 */
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycbzIISZ_mwOYhbpsyoU6lARLI3kG8kn3Y1L6DkbqtoXbe4QIQjMNfAzw-WCekyndLY2zUg/exec';

  var FADE = 300;      // フェード時間（styles.css の --fade と揃える）
  var TOAST_MS = 4000; // トースト表示時間
  var MAX_LEN = 1000;  // バグ報告の最大文字数

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fade = reduceMotion ? 0 : FADE;

  /* -------------------------------------------------------
     ルーティング
     ------------------------------------------------------- */
  var views = Array.prototype.slice.call(document.querySelectorAll('.view'));
  var routes = {};
  views.forEach(function (el) { routes[el.dataset.route] = el; });

  var current = null;
  var swapTimer = null;

  /* PC では3画面を横並びにするので、切り替えずに全部見せる。
     ブレークポイントは styles.css の PC 用メディアクエリと揃えること。 */
  var wideMQ = window.matchMedia('(min-width: 1120px)');

  function routeFromHash() {
    var raw = (location.hash || '').replace(/^#/, '');
    if (!raw || raw === '/') return '/';
    return routes[raw] ? raw : '/';
  }

  function show(el) {
    el.hidden = false;
    // reflow を挟んでからクラスを付けてフェードインさせる
    void el.offsetWidth;
    el.classList.add('is-shown');
    current = el;
  }

  function showAll() {
    clearTimeout(swapTimer);
    views.forEach(function (el) {
      el.hidden = false;
      el.classList.add('is-shown');
    });
    current = null;
  }

  function render(initial) {
    if (wideMQ.matches) { showAll(); return; }

    var next = routes[routeFromHash()];
    if (!next || next === current) return;

    clearTimeout(swapTimer);

    if (!current || initial) {
      views.forEach(function (el) {
        if (el !== next) { el.hidden = true; el.classList.remove('is-shown'); }
      });
      show(next);
      return;
    }

    var prev = current;
    prev.classList.remove('is-shown');
    swapTimer = setTimeout(function () {
      prev.hidden = true;
      show(next);
      window.scrollTo(0, 0);
    }, fade);
  }

  window.addEventListener('hashchange', function () {
    closeMenu();
    render(false);
  });

  function onWidthChange() {
    if (wideMQ.matches) {
      closeMenu();
      showAll();
      return;
    }
    // スマホ幅に戻ったら、いま開いているハッシュの画面だけに戻す
    clearTimeout(swapTimer);
    views.forEach(function (el) {
      el.hidden = true;
      el.classList.remove('is-shown');
    });
    current = null;
    render(true);
  }

  if (wideMQ.addEventListener) wideMQ.addEventListener('change', onWidthChange);
  else if (wideMQ.addListener) wideMQ.addListener(onWidthChange); // 旧 Safari

  /* -------------------------------------------------------
     アップデート予定リストの上端フェード
     一番上にいるときは隠し、スクロールして隠れているカードが
     あるときだけ表示する
     ------------------------------------------------------- */
  var listUpdate = document.querySelector('.list-update');
  var listUpdateWrap = document.querySelector('.list-update-wrap');

  if (listUpdate && listUpdateWrap) {
    var syncListFade = function () {
      listUpdateWrap.classList.toggle('is-scrolled', listUpdate.scrollTop > 0);
    };
    listUpdate.addEventListener('scroll', syncListFade);
    syncListFade();
  }

  /* -------------------------------------------------------
     ヘッダーメニュー
     ------------------------------------------------------- */
  var menuBtn = document.getElementById('menuBtn');
  var menu = document.getElementById('menu');

  function openMenu() {
    menu.classList.add('is-open');
    menuBtn.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  }

  menuBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (menu.classList.contains('is-open')) closeMenu();
    else openMenu();
  });

  menu.addEventListener('click', function (e) { e.stopPropagation(); });

  document.addEventListener('click', function () { closeMenu(); });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  // メニュー項目タップ後は閉じる（同じ画面を再選択して hashchange が起きない場合の保険）
  Array.prototype.forEach.call(menu.querySelectorAll('.menu-item'), function (a) {
    a.addEventListener('click', function () { setTimeout(closeMenu, 0); });
  });

  /* -------------------------------------------------------
     バグ報告フォーム
     ------------------------------------------------------- */
  var form = document.getElementById('bugForm');
  var textarea = document.getElementById('bugText');
  var submit = document.getElementById('bugSubmit');
  var honeypot = document.getElementById('bugHoneypot');
  var errorEl = document.getElementById('bugError');
  var wrap = textarea ? textarea.closest('.text-input') : null;
  var toast = document.getElementById('toast');
  var toastTimer = null;
  var sending = false;

  function sync() {
    var len = textarea.value.length;
    submit.disabled = sending || len < 1 || len > MAX_LEN;
    wrap.classList.toggle('is-filled', len > 0);
  }

  function setError(msg) {
    if (!msg) {
      errorEl.hidden = true;
      errorEl.textContent = '';
      return;
    }
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  function setSending(on) {
    sending = on;
    submit.classList.toggle('is-sending', on);
    submit.textContent = on ? '送信中…' : '送信';
    textarea.readOnly = on;
    sync();
  }

  function showToast() {
    clearTimeout(toastTimer);
    toast.classList.add('is-open');
    toastTimer = setTimeout(function () {
      toast.classList.remove('is-open');
    }, TOAST_MS);
  }

  function onSent() {
    textarea.value = '';
    setError('');
    setSending(false);
    showToast();
  }

  function sendToEndpoint(body) {
    // multipart/form-data はプリフライトが飛ばないので Apps Script でも受けられる
    var data = new FormData();
    data.append('message', body);
    data.append('ua', navigator.userAgent);
    data.append('website', honeypot ? honeypot.value : '');

    setSending(true);
    setError('');

    fetch(ENDPOINT, { method: 'POST', body: data })
      .then(function (res) { return res.json(); })
      .then(function (result) {
        if (result && result.ok) onSent();
        else throw new Error(result && result.error || 'failed');
      })
      .catch(function (err) {
        // 原因の切り分け用。利用者にはそのまま見せない
        if (window.console) console.warn('[bug-report]', err);
        setSending(false);
        setError('送信できませんでした。時間をおいてもう一度お試しください。');
      });
  }

  if (form) {
    textarea.addEventListener('input', function () {
      setError('');
      sync();
    });
    sync();

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (sending) return;

      var body = textarea.value.trim();
      if (body.length < 1 || body.length > MAX_LEN) return;

      if (!ENDPOINT) {
        setError('送信先が未設定です。');
        return;
      }
      sendToEndpoint(body);
    });
  }

  /* -------------------------------------------------------
     初期表示
     ------------------------------------------------------- */
  render(true);
})();
