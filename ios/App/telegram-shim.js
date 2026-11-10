/* Telegram.WebApp o'rnini bosuvchi qatlam (iOS native ilova uchun). WKUserScript orqali sahifadan oldin kiritiladi. */
(function () {
  var cfg = window.__GIFTS_CFG || {};
  var post = function (m) { try { window.webkit.messageHandlers.native.postMessage(m); } catch (e) {} };
  var pend = {}, seq = 0;
  window.__nativeReply = function (id, err, res) { var f = pend[id]; delete pend[id]; if (f) f(err, res); };
  var user = cfg.user || { id: 1, first_name: 'Guest', username: 'guest' };
  var dark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  var W = {
    initData: 'ios.' + btoa(unescape(encodeURIComponent(JSON.stringify({ user: user })))).replace(/=+$/, '') + '.' + 'x'.repeat(24),
    initDataUnsafe: { user: user }, platform: 'ios', version: '8.0', colorScheme: dark ? 'dark' : 'light',
    ready: function () {}, expand: function () {}, close: function () {}, disableVerticalSwipes: function () {}, enableVerticalSwipes: function () {},
    setHeaderColor: function () {}, setBackgroundColor: function () {}, setBottomBarColor: function () {},
    onEvent: function () {}, offEvent: function () {}, isVersionAtLeast: function () { return true; },
    HapticFeedback: {
      impactOccurred: function (s) { post({ t: 'haptic', k: s || 'light' }); },
      notificationOccurred: function (s) { post({ t: 'haptic', k: 'n_' + (s || 'success') }); },
      selectionChanged: function () { post({ t: 'haptic', k: 'select' }); }
    },
    openLink: function (u) { post({ t: 'open', u: u }); },
    openTelegramLink: function (u) { post({ t: 'open', u: u }); },
    openInvoice: function (u, cb) { if (cb) cb('cancelled'); },
    showConfirm: function (m, cb) { var id = ++seq; pend[id] = function (e, r) { cb && cb(!!r); }; post({ t: 'confirm', id: id, m: String(m) }); },
    showPopup: function (p, cb) { var id = ++seq; pend[id] = function (e, r) { cb && cb(r); }; post({ t: 'popup', id: id, p: p }); },
    showAlert: function (m, cb) { var id = ++seq; pend[id] = function () { cb && cb(); }; post({ t: 'confirm', id: id, m: String(m), alert: 1 }); },
    Serverless: {
      call: function (name, input, cb) {
        var id = ++seq; pend[id] = function (e, r) { cb(e, r); };
        post({ t: 'call', id: id, name: name, input: input || {} });
      }
    }
  };
  window.Telegram = { WebApp: W };
})();
