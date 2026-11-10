// Chat: Telegram uslubidagi chatlar ro'yxati, umumiy xona, shaxsiy yozishmalar va "Hadya yuborish" oynasi.
// Foydalanuvchi matni faqat textContent orqali qo'yiladi.
import { decorate } from './perks.js';
const hue = (id) => (Math.abs(Number(id)) * 47) % 360;
const initial = (n) => ((n || '?').trim().match(/[\p{L}\p{N}]/u) || ['?'])[0].toUpperCase();
const fmtTime = (ts) => {
  const d = new Date(ts), n = new Date();
  const hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return d.toDateString() === n.toDateString() ? hm : `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Sovg'a o'tkazilganda serverning o'zi shu belgili xabar qo'shadi (chatSend uni rad etadi).
const GIFT_RE = /^⟦g:(\d+),(\d+),(\d+),(\d+)(?:,(\d+))?(?:,(\d+))?⟧$/;

const SVG = {
  search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="10.500" cy="10.500" r="6.500"/><path d="M15.500 15.500L20 20"/></svg>',
  check1: '<svg viewBox="0 0 18 12" width="17" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6.500l3.500 3.500L13 2"/></svg>',
  check2: '<svg viewBox="0 0 22 12" width="21" height="12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M1.500 6.500L5 10 12 2M8.500 8.500L10 10l7.500-8"/></svg>',
  pin: '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M14.500 3l6.500 6.500-2 1-2.200-.3-3.100 3.100.6 4-1.500 1.500-3.600-3.600L5 20.500 3.500 19l4.300-4.400L4.200 11l1.500-1.500 4 .6 3.100-3.100L12.500 5z"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="none" stroke="currentColor" stroke-width="2.400" stroke-linecap="round" stroke-linejoin="round" d="M15 5l-7 7 7 7"/></svg>',
  group: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#fff" stroke-width="1.900" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="3.200"/><path d="M3.500 19c.5-3 2.800-4.700 5.500-4.700s5 1.700 5.500 4.700M16 6.300a3 3 0 010 5.400M17.500 14.600c1.800.5 3 2 3.300 4.400"/></svg>',
  gift: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.700" stroke-linecap="round" stroke-linejoin="round"><rect x="3.500" y="8.500" width="17" height="4" rx="1.200"/><path d="M5 12.500V20h14v-7.500M12 8.500V20M12 8.500C10 8.500 7.500 8 7.500 6.200 7.500 4.800 9 4.200 10.200 5 11.400 5.800 12 8.500 12 8.500zm0 0c2 0 4.500-.5 4.500-2.300 0-1.400-1.500-2-2.700-1.200C12.600 5.800 12 8.500 12 8.500z"/></svg>',
  x: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="none" stroke="currentColor" stroke-width="2.600" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>',
  star: '<svg class="star" viewBox="0 0 24 24" width="15" height="15"><path d="M12 2.600l2.800 6 6.500.7-4.900 4.400 1.400 6.400L12 16.700 6.200 20.100l1.400-6.400L2.700 9.300l6.500-.7z"/></svg>',
};

export function initChat(ctx) {
  const { call, tg, toast, haptic, el, errText, myId, myName, myPhoto, app } = ctx;
  const $ = (s) => document.querySelector(s);
  let R = null; // ochiq xona holati
  let G = null; // ochiq sovg'a oynasi
  let homeTimer = 0;
  let unreadN = 0;
  const H = { d: null, f: 'all', q: '', list: null, chips: null, view: null };

  // Profil rasmlari (Telegram photo_url) va Premium/status ma'lumoti: ID bo'yicha eslab qolinadi — chat, ro'yxat, sarlavhada bir xil ko'rinadi
  const PH = new Map(), PK = new Map();
  const remember1 = (id, photo, prem, st) => {
    id = Number(id); if (!id) return;
    if (photo) PH.set(id, photo);
    if (prem !== undefined) PK.set(id, { prem: prem ? 1 : 0, st: st || 0 });
  };
  const remember = (d) => {
    (d.dialogs || []).forEach((x) => remember1(x.peer, x.photo, x.prem, x.st));
    (d.people || []).forEach((x) => remember1(x.id, x.photo, x.prem, x.st));
    if (d.me) remember1(myId, d.me.photo, d.me.prem, d.me.st);
  };
  remember1(myId, myPhoto);
  const perk = (id) => PK.get(Number(id)) || null;
  const avatar = (id, name, cls = '') => {
    const a = el('span', 'av ' + cls); a.style.setProperty('--h', hue(id)); a.textContent = initial(name);
    const src = PH.get(Number(id));
    if (src) {
      const im = new Image(); im.alt = ''; im.draggable = false;
      im.onload = () => { a.textContent = ''; a.classList.add('ph'); a.append(im); };
      im.src = src;
    }
    return a;
  };
  const setDot = (n) => {
    unreadN = n; $('#chat-dot').classList.toggle('on', n > 0);
    const u = $('#room-unread'); if (u) { u.textContent = n > 0 ? String(n) : ''; u.classList.toggle('on', n > 0); }
  };
  const parseGift = (t) => {
    const m = GIFT_RE.exec(String(t || '')); if (!m) return null;
    const [id, b, p, mo, no, k] = m.slice(1).map((x) => Number(x || 0)); const C = app.cat();
    if (!C.backdrops[b] || !C.patterns[p] || !app.models(k)[mo]) return null;
    return { id, no, b, p, m: mo, k, up: 1, s: 0, h: 0, n: 0 };
  };
  const preview = (t) => (parseGift(t) ? '🎁 Hadya' : String(t || '').replace(/\s+/g, ' '));

  // ---------- Chatlar ro'yxati (Telegram uslubida)
  async function renderHome(view) {
    H.view = view;
    view.replaceChildren(el('div', 'empty', 'Yuklanmoqda…'));
    let d;
    const fp = loadFeed();
    try { d = await call('chatDialogs'); } catch (e) { view.replaceChildren(el('div', 'empty', errText(e))); return; }
    await fp;
    if (!view.isConnected || !view.classList.contains('v-chat')) return;
    remember(d); H.d = d; setDot(d.unread);
    buildHome(view);
  }

  function buildHome(view) {
    const wrap = el('div', 'tg-home');
    wrap.append(el('div', 'tg-title', '<h1>Chatlar</h1>'));
    H.bar = storiesBar(); wrap.append(H.bar);

    const talked = new Set((H.d.dialogs || []).map((x) => x.peer));
    const people = (H.d.people || []).filter((p) => !talked.has(p.id));
    if (people.length) {
      const ppl = el('div', 'tg-people');
      for (const p of people) {
        const b = el('button', 'tg-pp'); b.append(avatar(p.id, p.name, 'xl'));
        const n = el('span'); n.textContent = p.name; b.append(n);
        b.onclick = () => openRoom({ peer: p.id, name: p.name }); ppl.append(b);
      }
      wrap.append(ppl);
    }

    const sr = el('label', 'tg-search', SVG.search);
    const inp = el('input'); inp.type = 'search'; inp.placeholder = 'Qidiruv'; inp.autocomplete = 'off'; inp.value = H.q;
    inp.addEventListener('input', () => {
      H.q = inp.value; H.found = []; paintList();
      clearTimeout(H.ft); const q = H.q.trim();
      if (q.replace(/^@/, '').length < 2) return;
      H.ft = setTimeout(async () => {          // barcha foydalanuvchilar ichidan (ism yoki @username)
        try {
          const r = await call('chatFind', { q });
          if (H.q.trim() !== q) return;
          H.found = r.users || []; H.found.forEach((x) => remember1(x.id, x.photo, x.prem, x.st)); paintList();
        } catch (e) { /* mahalliy natijalar yetarli */ }
      }, 350);
    });
    sr.append(inp); wrap.append(sr);

    const chips = el('div', 'tg-chips'); H.chips = chips;
    [['all', 'Barchasi'], ['personal', 'Shaxsiy'], ['unread', 'O‘qilmagan']].forEach(([k, t]) => {
      const b = el('button', 'tg-chip' + (H.f === k ? ' on' : '')); b.dataset.f = k;
      const s = el('span'); s.textContent = t; b.append(s); b.append(el('i'));
      b.onclick = () => { H.f = k; haptic('light'); chips.querySelectorAll('.tg-chip').forEach((c) => c.classList.toggle('on', c.dataset.f === k)); paintList(); };
      chips.append(b);
    });
    wrap.append(chips);

    H.list = el('div', 'tg-list'); wrap.append(H.list);
    view.replaceChildren(wrap); paintList();
  }

  function rowEl(r) {
    if (r.hdr) { const h = el('div', 'tg-hdr'); h.textContent = r.hdr; return h; }
    const b = el('button', 'tg-row' + (r.unread ? ' unread' : ''));
    let av;
    if (r.g) { av = el('span', 'av lg grp', SVG.group); } else av = avatar(r.peer, r.name, 'lg');
    const body = el('span', 'tg-rb');
    const l1 = el('span', 'tg-r1'); const n = el('b'); n.textContent = r.name; if (!r.g) decorate(n, perk(r.peer), 16); l1.append(n);
    const meta = el('span', 'tg-meta');
    if (r.mine && !r.g) meta.append(el('i', 'tick' + (r.seen ? ' seen' : ''), r.seen ? SVG.check2 : SVG.check1));
    if (r.ts) { const t = el('time'); t.textContent = fmtTime(r.ts); meta.append(t); }
    l1.append(meta);
    const l2 = el('span', 'tg-r2'); const s = el('small');
    if ((r.mine && !r.g) || r.you) { const y = el('span', 'you'); y.textContent = 'Siz: '; s.append(y); }
    s.append(document.createTextNode(r.sub || '')); l2.append(s);
    if (r.g) l2.append(el('i', 'pin', SVG.pin)); else if (r.unread) l2.append(el('i', 'ud'));
    body.append(l1, l2); b.append(av, body);
    b.onclick = () => (r.g ? openRoom({ peer: 0, name: 'Umumiy chat' }) : openRoom({ peer: r.peer, name: r.name }));
    return b;
  }

  function paintList() {
    const d = H.d; if (!d || !H.list) return;
    const q = H.q.trim().replace(/^@/, '').toLowerCase();
    const hit = (name) => !q || name.toLowerCase().includes(q);
    const rows = [];
    if (H.f === 'all' && hit('Umumiy chat')) {
      const gl = d.global, you = !!gl && gl.from === myId;      // o'zim yozgan bo'lsam — "Siz: ..."
      rows.push({ g: 1, you, name: 'Umumiy chat', sub: gl ? (you ? preview(gl.text) : `${gl.name}: ${preview(gl.text)}`) : 'Birinchi bo‘lib yozing', ts: gl ? gl.ts : 0 });
    }
    const have = new Set();
    for (const x of d.dialogs) {
      have.add(x.peer);
      if (H.f === 'unread' && !x.unread) continue;
      if (!hit(x.name + ' ' + (x.username || ''))) continue;
      rows.push({ peer: x.peer, name: x.name, sub: preview(x.last), ts: x.ts, mine: x.mine, unread: x.unread, seen: !!x.seen });
    }
    if (q && H.f !== 'unread') {
      for (const p of d.people) if (!have.has(p.id) && hit(p.name)) { have.add(p.id); rows.push({ peer: p.id, name: p.name, sub: 'Yozishmani boshlang', ts: 0 }); }
      const shown = new Set(rows.filter((r) => r.peer).map((r) => r.peer));
      const extra = (H.found || []).filter((p) => !shown.has(p.id));
      if (extra.length) {
        rows.push({ hdr: 'Global qidiruv' });
        for (const p of extra) rows.push({ peer: p.id, name: p.name, sub: p.username ? '@' + p.username : 'Yozishmani boshlang', ts: 0 });
      }
    }
    const cs = H.chips.querySelectorAll('.tg-chip');
    const pc = d.dialogs.length;
    cs[1].lastChild.textContent = pc ? String(pc) : ''; cs[1].lastChild.className = pc ? 'n' : '';
    cs[2].lastChild.textContent = d.unread ? String(d.unread) : ''; cs[2].lastChild.className = d.unread ? 'n blue' : '';
    H.list.replaceChildren(...rows.map(rowEl));
    if (!rows.some((r) => !r.hdr)) H.list.append(el('div', 'hint mid', q ? 'Hech narsa topilmadi.' : H.f === 'unread' ? 'O‘qilmagan chat yo‘q.' : 'Hali yozishma yo‘q.'));
  }

  // ---------- Xona
  const room = () => $('#room'), box_ = () => $('#msgs');
  function fitViewport() {
    const vv = window.visualViewport; const r = room(); if (!r || r.classList.contains('hidden')) return;
    r.style.height = (vv ? vv.height : innerHeight) + 'px'; r.style.top = (vv ? vv.offsetTop : 0) + 'px';
    const m = box_(); if (R && R.stick) m.scrollTop = m.scrollHeight;
  }
  if (window.visualViewport) { visualViewport.addEventListener('resize', fitViewport); visualViewport.addEventListener('scroll', fitViewport); }

  function openRoom({ peer, name }) {
    R = { peer, name, msgs: [], last: 0, stick: true, admin: false, tmp: 0, timer: 0, busy: false, vis: [], cards: new Map() };
    const t = $('#room-title'); t.replaceChildren();
    const b = el('b'); b.textContent = peer ? name : 'Umumiy chat'; if (peer) decorate(b, perk(peer), 15);
    const s = el('small'); s.textContent = peer ? 'shaxsiy yozishma' : 'Hamma yozishi mumkin';
    t.append(b, s);
    const av = $('#room-av'); av.replaceChildren(peer ? avatar(peer, name, 'md') : el('span', 'av md grp', SVG.group));
    if (peer) av.firstChild.onclick = () => app.profile(peer);
    $('#cgift').classList.toggle('hidden', !peer);
    box_().replaceChildren(); $('#cin').value = ''; $('#cin').style.height = ''; $('#csend').disabled = true;
    room().classList.remove('hidden'); document.body.classList.add('in-room'); requestAnimationFrame(() => room().classList.add('open'));
    setDot(unreadN); fitViewport(); tick();
    R.timer = setInterval(tick, 3500);
  }
  function closeRoom() {
    if (!R) return; closeGifts(true); clearInterval(R.timer); R.vis.forEach((v) => v.destroy()); R = null;
    room().classList.remove('open'); document.body.classList.remove('in-room');
    setTimeout(() => { if (!R) room().classList.add('hidden'); }, 260);
    document.dispatchEvent(new CustomEvent('chat-closed'));
  }

  // Sovg'a o'tkazilgani haqidagi xizmat xabari + karta (Telegramdagidek)
  function giftMsg(x, g, mine) {
    let w = R.cards.get(x.id); if (w) return w;
    const C = app.cat(), name = R.name;
    w = el('div', 'gmsg');
    const note = el('div', 'gnote');
    note.textContent = mine ? `Siz ${name} ga unikal kolleksion hadya o‘tkazdingiz` : `${x.name} sizga unikal kolleksion hadya o‘tkazdi`;
    const card = el('div', 'gcard');
    const v = app.visual(420, 540); R.vis.push(v); card.append(v.el);
    v.backdrop(g.b, g.p); v.model(g.m, true, !app.anim(), false, g.k);
    card.append(el('i', 'grib', 'hadya'));
    const t = el('div', 'gt');
    const h = el('b'); h.textContent = `${mine ? 'Sizdan' : x.name + 'dan'} hadya`;
    const sub = el('em'); sub.textContent = `${app.gname(g)} #${g.no || '…'}`;
    const dl = el('dl');
    [['Model', app.models(g.k)[g.m].n], ['Fon', C.backdrops[g.b].n], ['Belgi', C.patterns[g.p].n]].forEach(([k, val]) => {
      const dt = el('dt'); dt.textContent = k; const dd = el('dd'); dd.textContent = val; dl.append(dt, dd);
    });
    const go = el('button', 'gview'); go.type = 'button'; go.textContent = 'Ko‘rish';
    go.onclick = () => { haptic('light'); app.showGift(g); };
    card.onclick = go.onclick;                       // butun kartani bosish ham ochadi
    t.append(h, sub, dl, go); card.append(t);
    w.append(note, card);
    if (x.id > 0) R.cards.set(x.id, w);
    return w;
  }

  function render() {
    const m = box_(); const near = m.scrollHeight - m.scrollTop - m.clientHeight < 80; if (near) R.stick = true;
    const frag = document.createDocumentFragment();
    if (!R.msgs.length) frag.append(el('div', 'hint mid', R.peer ? 'Yozishmani boshlang.' : 'Hali xabar yo‘q. Birinchi bo‘lib yozing!'));
    let prev = null;
    for (const x of R.msgs) {
      const mine = x.from === myId;
      const gf = R.peer ? parseGift(x.text) : null;
      if (gf) { frag.append(giftMsg(x, gf, mine)); prev = null; continue; }
      const first = !prev || prev.from !== x.from;
      const row = el('div', 'msg' + (mine ? ' mine' : '') + (x.pending ? ' pend' : '') + (first ? ' first' : ''));
      if (!mine) {
        if (first && !R.peer) {
          const a = avatar(x.from, x.name, 'sm'); a.onclick = () => app.profile(x.from); row.append(a);
        } else row.append(el('span', 'av sm ghost'));
      }
      const col = el('div', 'col');
      if (!mine && first && !R.peer) { const n = el('span', 'nm'); n.style.setProperty('--h', hue(x.from)); n.textContent = x.name; decorate(n, perk(x.from), 12); col.append(n); }
      const b = el('div', 'bub'); b.textContent = x.text; const tm = el('time'); tm.textContent = fmtTime(x.ts); b.append(tm);
      if (R.admin && !mine && x.id > 0) b.onclick = () => adminMenu(x);
      col.append(b); row.append(col); frag.append(row); prev = x;
    }
    m.replaceChildren(frag);
    if (R.stick) m.scrollTop = m.scrollHeight;
  }
  box_().addEventListener('scroll', () => { const m = box_(); if (R) R.stick = m.scrollHeight - m.scrollTop - m.clientHeight < 80; }, { passive: true });

  const sortMsgs = (my) => my.msgs.sort((a, b) => (a.pending ? 1 : 0) - (b.pending ? 1 : 0) || a.id - b.id);

  async function tick() {
    if (!R || R.busy || document.hidden) return;
    const my = R; R.busy = true;
    try {
      const r = await call('chatList', { peer: my.peer, since: my.last });
      if (R !== my) return;
      my.admin = r.admin;
      const have = new Set(my.msgs.map((x) => x.id));
      let changed = false;
      for (const x of r.msgs) { remember1(x.from, x.photo, x.prem, x.st); if (!have.has(x.id)) { my.msgs.push(x); changed = true; } my.last = Math.max(my.last, x.id); }
      // admin o'chirgan xabarlar
      if (r.live.length) {
        const live = new Set(r.live), lo = Math.min(...r.live), hi = Math.max(...r.live);
        const kept = my.msgs.filter((x) => x.pending || x.id < lo || x.id > hi || live.has(x.id));
        if (kept.length !== my.msgs.length) { my.msgs = kept; changed = true; }
      }
      sortMsgs(my);
      if (changed || !box_().childElementCount) render();
      if (r.banned) toast('Siz bloklangansiz');
    } catch (e) { /* keyingi urinishda */ }
    finally { if (R === my) my.busy = false; }
  }

  async function send() {
    if (!R) return; const inp = $('#cin'); const text = inp.value.trim(); if (!text) return;
    const my = R; const tmp = { id: -(++my.tmp), from: myId, name: myName, text, ts: Date.now(), pending: true };
    my.msgs.push(tmp); inp.value = ''; inp.style.height = ''; $('#csend').disabled = true; my.stick = true; render(); haptic('light');
    try {
      const r = await call('chatSend', { peer: my.peer, text });
      my.msgs = my.msgs.filter((x) => x !== tmp);
      remember1(myId, r.msg.photo, r.msg.prem, r.msg.st);
      if (!my.msgs.some((x) => x.id === r.msg.id)) my.msgs.push(r.msg);
      my.last = Math.max(my.last, r.msg.id); sortMsgs(my);
      if (R === my) render();
    } catch (e) {
      my.msgs = my.msgs.filter((x) => x !== tmp); if (R === my) { render(); if (!inp.value) { inp.value = text; $('#csend').disabled = false; } }
      toast(errText(e));
    }
  }

  function adminMenu(x) {
    const run = async (id) => {
      try {
        if (id === 'del') await call('chatAdmin', { action: 'del', id: x.id });
        else if (id === 'ban') await call('chatAdmin', { action: 'ban', uid: x.from });
        else return;
        if (id === 'del') { R.msgs = R.msgs.filter((m) => m.id !== x.id); render(); } else toast(`${x.name} bloklandi`);
      } catch (e) { toast(errText(e)); }
    };
    const msg = `${x.name}: ${x.text.slice(0, 80)}`;
    if (tg && tg.showPopup) tg.showPopup({ message: msg, buttons: [{ id: 'del', type: 'destructive', text: 'Xabarni o‘chirish' }, { id: 'ban', type: 'destructive', text: 'Foydalanuvchini bloklash' }, { type: 'cancel' }] }, run);
    else if (confirm(msg + '\n\nO‘chiraymi?')) run('del');
  }

  // ---------- "Hadya yuborish" oynasi
  function closeGifts(now) {
    if (!G) return; const g = G; G = null;
    g.dim.classList.remove('on'); g.sh.classList.remove('on');
    const fin = () => { g.reg.forEach((v) => v.destroy()); g.dim.remove(); g.sh.remove(); };
    if (now) fin(); else setTimeout(fin, 280);
  }

  function openGifts() {
    if (!R || !R.peer || G) return;
    haptic('light');
    const peer = R.peer, peerName = R.name;
    const dim = el('div', 'gs-dim'), sh = el('div', 'gs'); const reg = [];
    G = { dim, sh, reg };
    dim.onclick = () => closeGifts();

    sh.append(el('div', 'gs-grab'));
    const top = el('div', 'gs-top');
    const x = el('button', 'gs-x', SVG.x); x.type = 'button'; x.onclick = () => closeGifts();
    const ttl = el('h3'); ttl.textContent = 'Hadya yuborish';
    const bal = el('div', 'gs-bal'); const me0 = app.me();
    bal.append(el('small', '', 'Balans')); const bb = el('b', '', SVG.star);
    bb.append(document.createTextNode(me0.balance === null ? '∞' : app.fmt(me0.balance))); bal.append(bb);
    top.append(x, ttl, bal); sh.append(top);

    const body = el('div', 'gs-body'); sh.append(body);
    const dsc = el('p', 'gs-d'); const strong = el('b'); strong.textContent = peerName;
    dsc.append(strong, document.createTextNode('ga profilda saqlash yoki Yulduzlarga aylantirish mumkin bo‘lgan hadyalar bering. '));
    const what = el('a'); what.textContent = 'Yulduzlar nima ›'; what.onclick = () => toast('Stars — ilovadagi valyuta: sovg‘a olish va yaxshilash uchun');
    dsc.append(what); body.append(dsc);

    let tab = 'mine';
    const tabs = el('div', 'gs-tabs');
    const grid = el('div', 'gs-grid');
    const doTransfer = (g, btn) => {
      const go = async (ok) => {
        if (!ok) return; btn.disabled = true;
        try {
          const r = await call('send', { id: g.id, to: String(peer), chat: 1 });
          haptic('heavy'); try { tg.HapticFeedback.notificationOccurred('success'); } catch (e) {}
          closeGifts();
          if (R && R.peer === peer && r.msg && !R.msgs.some((m) => m.id === r.msg.id)) { R.msgs.push(r.msg); R.last = Math.max(R.last, r.msg.id); sortMsgs(R); R.stick = true; render(); }
          await app.reload(); toast(`${r.to} ga yuborildi`);
        } catch (e) { toast(errText(e)); btn.disabled = false; }
      };
      const t = `${app.gname(g)} #${g.no || '…'} ni ${peerName} ga o‘tkazasizmi?`;
      if (tg && tg.showConfirm) tg.showConfirm(t, go); else go(confirm(t));
    };
    const paint = () => {
      reg.forEach((v) => v.destroy()); reg.length = 0; grid.replaceChildren();
      tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === tab));
      const me = app.me();
      if (tab === 'all') {
        grid.append(app.tile({ id: 0, up: 0, s: me.price, h: 0, n: 0 }, 0, reg, () => { closeGifts(); setTimeout(app.buy, 200); }));
        return;
      }
      const list = [...me.gifts].filter((g) => tab === 'mine' || g.up).sort((a, b) => (b.n || 0) - (a.n || 0));
      if (!list.length) { grid.append(el('div', 'gs-empty', tab === 'mine' ? 'Sizda hali hadya yo‘q. Do‘kondan sotib oling.' : 'Kolleksion hadyalar yo‘q. Oddiy hadyani yaxshilab noyob qiling.')); return; }
      list.forEach((g, i) => {
        const it = el('div', 'gs-it'); it.append(app.tile(g, i, reg, () => {}));
        const b = el('button', 'gs-btn'); b.type = 'button';
        if (g.up) { b.textContent = 'O‘tkazish'; b.onclick = () => doTransfer(g, b); }
        else { b.textContent = 'Yaxshilash'; b.classList.add('up'); b.onclick = () => { closeGifts(); setTimeout(() => app.upgrade(g), 200); }; }
        it.append(b); grid.append(it);
      });
    };
    [['all', 'Barcha hadyalar'], ['mine', 'Hadyalarim'], ['col', 'Kolleksion hadyalar']].forEach(([k, t]) => {
      const b = el('button', 'gs-tab'); b.type = 'button'; b.dataset.t = k; b.textContent = t;
      b.onclick = () => { tab = k; haptic('light'); paint(); }; tabs.append(b);
    });
    body.append(tabs, grid); paint();

    document.body.append(dim, sh);
    requestAnimationFrame(() => requestAnimationFrame(() => { dim.classList.add('on'); sh.classList.add('on'); }));
  }

  // ---------- Hikoyalar (24 soat): panel, ko'rish, qo'shish
  const BGS = ['linear-gradient(160deg,#4facfe,#00c6fb)', 'linear-gradient(160deg,#a18cd1,#fbc2eb)', 'linear-gradient(160deg,#f6a35d,#fd6d6d)', 'linear-gradient(160deg,#43c59e,#2b8fd6)',
    'linear-gradient(160deg,#ff7eb3,#ff758c)', 'linear-gradient(160deg,#667eea,#764ba2)', 'linear-gradient(160deg,#f093fb,#f5576c)', 'linear-gradient(160deg,#2c3e50,#4b6584)'];
  const seenGet = () => { try { return JSON.parse(localStorage.getItem('st_seen')) || {}; } catch (e) { return {}; } };
  const seenSet = (id, ts) => { try { const m = seenGet(); if ((m[id] || 0) < ts) { m[id] = ts; localStorage.setItem('st_seen', JSON.stringify(m)); } } catch (e) {} };
  const ago = (ts) => { const m = Math.max(0, Math.floor((Date.now() - ts) / 60000)); return m < 1 ? 'hozirgina' : m < 60 ? `${m} daqiqa oldin` : `${Math.floor(m / 60)} soat oldin`; };

  async function loadFeed() {
    try {
      const r = await call('story', { op: 'feed' });
      H.s = r.users || []; H.fts = Date.now();
      H.s.forEach((u) => remember1(u.id, u.photo, u.prem, u.st));
    } catch (e) { H.s = H.s || []; }
  }
  function repaintBar() {
    if (!H.bar || !H.bar.isConnected) return;
    const nb = storiesBar(); H.bar.replaceWith(nb); H.bar = nb;
  }

  function storiesBar() {
    const bar = el('div', 'tg-stories');
    const seen = seenGet(), feed = H.s || [];
    const mineU = feed.find((x) => x.mine);
    const item = (id, name, n, last, label, plus) => {
      const b = el('div', 'tg-st'); b.setAttribute('role', 'button'); b.tabIndex = 0;
      const ring = el('span', 'st-ring ' + (!n ? 'none' : last > (seen[id] || 0) ? 'new' : 'old'));
      ring.append(avatar(id, name, 'xl'));
      if (plus) { const p = el('i', 'st-plus', '+'); p.onclick = (e) => { e.stopPropagation(); haptic('light'); openAdd(); }; ring.append(p); }
      const l = el('span', 'st-nm'); l.textContent = label;
      b.append(ring, l);
      b.onclick = () => { haptic('light'); if (n) openStory({ id, name }); else if (plus) openAdd(); };
      return b;
    };
    bar.append(item(myId, myName, mineU ? mineU.n : 0, mineU ? mineU.last : 0, 'Mening hikoyam', true));
    for (const u of feed.filter((x) => !x.mine)) bar.append(item(u.id, u.name, u.n, u.last, String(u.name || '').split(' ')[0] || 'Foydalanuvchi', false));
    return bar;
  }

  let SV = null;
  function closeStory() {
    if (!SV) return;
    clearTimeout(SV.t); const n = SV.root; SV = null;
    n.classList.remove('on'); setTimeout(() => n.remove(), 220);
    loadFeed().then(repaintBar);
  }
  async function openStory(u) {
    if (SV) return;
    let list = [];
    try { list = (await call('story', { op: 'get', owner: u.id })).stories || []; } catch (e) { toast(errText(e)); return; }
    if (!list.length) { toast('Hikoya yo‘q'); loadFeed().then(repaintBar); return; }
    const mine = u.id === myId, canDel = mine || !!(app.me() && app.me().admin);
    const root = el('div', 'sv'), stage = el('div', 'sv-stage');
    const bars = el('div', 'sv-bars'); list.forEach(() => bars.append(el('i', '', '<b></b>')));
    const head = el('div', 'sv-head'), meta = el('div', 'sv-meta');
    const nm = el('b'); nm.textContent = mine ? 'Mening hikoyam' : u.name; if (!mine) decorate(nm, perk(u.id), 14);
    const tm = el('small'); meta.append(nm, tm);
    const x = el('button', 'sv-x', SVG.x); x.type = 'button'; x.onclick = closeStory;
    head.append(avatar(u.id, u.name, 'md'), meta);
    if (canDel) {
      const del = el('button', 'sv-del'); del.type = 'button'; del.textContent = 'O‘chirish';
      del.onclick = () => {
        const s = list[SV.i], go = async (ok) => {
          if (!ok) return;
          try { await call('story', { op: 'del', id: s.id }); } catch (e) { toast(errText(e)); return; }
          list.splice(SV.i, 1); bars.lastChild.remove();
          if (!list.length) { closeStory(); return; }
          show(Math.min(SV.i, list.length - 1));
        };
        clearTimeout(SV.t);
        const t = 'Bu hikoyani o‘chirasizmi?';
        if (tg && tg.showConfirm) tg.showConfirm(t, (ok) => { if (ok) go(true); else show(SV.i); }); else if (confirm(t)) go(true); else show(SV.i);
      };
      head.append(del);
    }
    head.append(x);
    const show = (i) => {
      SV.i = i; clearTimeout(SV.t);
      [...bars.children].forEach((b, k) => { b.className = k < i ? 'done' : ''; });
      const cur = bars.children[i]; void cur.offsetWidth; cur.className = 'run';
      const s = list[i]; stage.replaceChildren();
      if (s.kind === 'p') { stage.style.background = '#000'; const im = new Image(); im.alt = ''; im.src = s.body; stage.append(im); }
      else { stage.style.background = BGS[s.bg % BGS.length]; const t = el('div', 'sv-txt'); t.textContent = s.body; stage.append(t); }
      tm.textContent = ago(s.ts); seenSet(u.id, s.ts); haptic('light');
      SV.t = setTimeout(next, 5000);
    };
    const next = () => { if (SV.i + 1 < list.length) show(SV.i + 1); else closeStory(); };
    const prev = () => show(Math.max(0, SV.i - 1));
    const zl = el('button', 'sv-z l'), zr = el('button', 'sv-z r'); zl.type = zr.type = 'button'; zl.onclick = prev; zr.onclick = next;
    root.append(stage, el('div', 'sv-shade'), zl, zr, bars, head);
    SV = { root, i: 0, t: 0 };
    document.body.append(root); requestAnimationFrame(() => root.classList.add('on'));
    show(0);
  }

  // Rasmni siqish: eng uzun tomoni 1080px, JPEG ~250 KB dan oshmasin
  async function shrink(file) {
    const url = URL.createObjectURL(file);
    try {
      const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Rasm ochilmadi')); i.src = url; });
      let max = 1080;
      for (let t = 0; t < 5; t++) {
        const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
        const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(im.naturalWidth * k)); cv.height = Math.max(1, Math.round(im.naturalHeight * k));
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
        for (const q of [0.8, 0.7, 0.58, 0.46]) { const d = cv.toDataURL('image/jpeg', q); if (d.length <= 250000) return d; }
        max = Math.round(max * 0.78);
      }
      throw new Error('Rasm juda katta');
    } finally { URL.revokeObjectURL(url); }
  }

  let SA = null;
  function openAdd() {
    if (SA) return;
    let mode = 't', bg = 0, img = '', busy = false;
    const root = el('div', 'sa'); SA = root;
    const top = el('div', 'sa-top'), x = el('button', 'sa-x', SVG.x); x.type = 'button';
    const ttl = el('b'); ttl.textContent = 'Yangi hikoya'; top.append(x, ttl);
    const stage = el('div', 'sa-stage');
    const ta = el('textarea', 'sa-ta'); ta.maxLength = 200; ta.placeholder = 'Matn yozing…'; ta.rows = 4;
    const pv = el('img', 'sa-pv'); pv.alt = '';
    const empty = el('div', 'sa-empty'); empty.textContent = 'Rasm tanlang';
    stage.append(ta, pv, empty);
    const tabs = el('div', 'sa-tabs');
    const tb = [['t', 'Matn'], ['p', 'Rasm']].map(([k, t]) => { const b = el('button'); b.type = 'button'; b.dataset.m = k; b.textContent = t; b.onclick = () => { mode = k; haptic('light'); paint(); }; tabs.append(b); return b; });
    const dots = el('div', 'sa-dots');
    BGS.forEach((g, i) => { const d = el('button'); d.type = 'button'; d.style.background = g; d.onclick = () => { bg = i; haptic('light'); paint(); }; dots.append(d); });
    const pick = el('div', 'sa-pick');
    const mkIn = (cap) => { const f = el('input'); f.type = 'file'; f.accept = 'image/*'; if (cap) f.setAttribute('capture', 'environment'); f.hidden = true;
      f.onchange = async () => { const file = f.files && f.files[0]; f.value = ''; if (!file) return; try { img = await shrink(file); paint(); } catch (e) { toast(e.message || 'Rasm ochilmadi'); } }; return f; };
    const f1 = mkIn(false), f2 = mkIn(true);
    const b1 = el('button', 'sa-b'); b1.type = 'button'; b1.textContent = 'Galereya'; b1.onclick = () => f1.click();
    const b2 = el('button', 'sa-b'); b2.type = 'button'; b2.textContent = 'Kamera'; b2.onclick = () => f2.click();
    pick.append(b1, b2, f1, f2);
    const post = el('button', 'btn sa-post'); post.type = 'button'; post.textContent = 'Joylash';
    function paint() {
      tb.forEach((b) => b.classList.toggle('on', b.dataset.m === mode));
      stage.style.background = mode === 't' ? BGS[bg] : '#000';
      ta.style.display = mode === 't' ? '' : 'none'; dots.style.display = mode === 't' ? '' : 'none';
      pick.style.display = mode === 'p' ? '' : 'none';
      pv.style.display = mode === 'p' && img ? '' : 'none'; if (img) pv.src = img;
      empty.style.display = mode === 'p' && !img ? '' : 'none';
      [...dots.children].forEach((d, i) => d.classList.toggle('on', i === bg));
      post.disabled = busy || (mode === 't' ? !ta.value.trim() : !img);
    }
    ta.oninput = paint;
    const close = () => { SA = null; root.classList.remove('on'); setTimeout(() => root.remove(), 220); };
    x.onclick = close;
    post.onclick = async () => {
      if (busy) return; busy = true; paint();
      try {
        await call('story', { op: 'add', kind: mode, body: mode === 't' ? ta.value.trim() : img, bg });
        haptic('medium'); toast('Hikoya joylandi'); close(); loadFeed().then(repaintBar);
      } catch (e) { toast(errText(e)); busy = false; paint(); }
    };
    root.append(top, stage, tabs, dots, pick, post);
    document.body.append(root); requestAnimationFrame(() => root.classList.add('on')); paint();
  }

  const cin = $('#cin');
  cin.addEventListener('input', () => { $('#csend').disabled = !cin.value.trim(); cin.style.height = 'auto'; cin.style.height = Math.min(110, cin.scrollHeight) + 'px'; });
  $('#composer').addEventListener('submit', (e) => { e.preventDefault(); send(); });
  $('#cgift').onclick = openGifts;
  $('#room-back').onclick = closeRoom;
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });

  // ---------- O'qilmaganlar belgisi + ro'yxatni yangilab turish
  async function pollUnread() {
    if (R || document.hidden) return;
    try {
      const d = await call('chatDialogs'); setDot(d.unread); remember(d);
      if (Date.now() - (H.fts || 0) > 60000 && H.bar && H.bar.isConnected) loadFeed().then(repaintBar);
      if (H.view && H.view.isConnected && H.view.classList.contains('v-chat') && H.list && H.list.isConnected) { H.d = d; paintList(); }
    } catch (e) {}
  }
  clearInterval(homeTimer); homeTimer = setInterval(pollUnread, 15000);
  const openDM = (peer, name) => { if (R && R.peer === peer) return; if (R) { closeRoom(); setTimeout(() => openRoom({ peer, name }), 280); } else openRoom({ peer, name }); };
  return { renderHome, pollUnread, openRoom, openDM, openAdd, refreshFeed: () => loadFeed().then(repaintBar) };
}
