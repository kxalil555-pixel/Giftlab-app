import { allGifts } from '../lib/game.js';
import { db, api, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { gifts, users, dialogs, messages as messages_t } from '../schema.js';
import { WEBAPP_URL, COLS, colOf } from '../lib/config.js';
import { PATTERN_W, BACKDROP_W, EXTRA_BD, modelW } from '../lib/data.js';
import { ensureUser, findUser, isAdmin, pickW, ensureNums, bumpAll, lock } from '../lib/game.js';
import { ensureChatUser, roomKey, insertMessage, nextMessageId, prune, touchDialog, GIFT_TAG } from '../lib/chat.js';

// Faqat admin. Ommaviy sovg'a tarqatish (bozordan sotib olish + yaxshilash + berish — bitta qadamda).
//  { op:'users' }                                   -> { ids, left }   (admin bo'lmagan foydalanuvchilar ID lari va har kolleksiyada qolgan joy)
//  { op:'run', kinds:[0,1,..], items:[{to,n}] }      -> foydalanuvchilarga: har sovg'a tasodifiy kolleksiya/model/fon/naqsh bilan, YAXSHILANGAN holda, chatga karta + botdan xabar
//  { op:'run', kinds:[..], self:1, items:[{n}] }     -> adminning o'ziga (yaxshilangan holda, xabarsiz)
// Admin uchun Stars sarflanmaydi (cheksiz), lekin supply (kolleksiya zaxirasi) kamayadi.
const MAX_CALL = 60;      // bitta so'rovda eng ko'pi bilan nechta sovg'a (server vaqt limitiga tushmaslik uchun kichik)
const MAX_ITEMS = 30;     // bitta so'rovda eng ko'pi bilan nechta qabul qiluvchi
const MAX_CARDS = 60;     // bitta foydalanuvchining chatiga eng ko'pi bilan nechta karta (chat 120 ta xabar saqlaydi)
const PAR = 6;            // bir vaqtda nechta qabul qiluvchi qayta ishlansin

const notify = async (id, text) => {
  try { await api.sendMessage({ chat_id: id, text, reply_markup: WEBAPP_URL ? { inline_keyboard: [[{ text: '🎮 Ochish', web_app: { url: WEBAPP_URL } }]] } : undefined }); return true; } catch (e) { return false; }
};
// bir vaqtda ko'pi bilan `n` ta vazifa
async function pool(list, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, list.length) }, async () => { while (i < list.length) { const x = list[i++]; await fn(x); } }));
}
// qatorlarni 10 tadan parallel yozadi; yiqilganini ketma-ket, yangi ID bilan qayta urinadi
async function insertAll(table, rows, nextIdFn) {
  for (let i = 0; i < rows.length; i += 10) {
    const part = rows.slice(i, i + 10);
    const res = await Promise.allSettled(part.map((r) => db.insert(table).values(r).run()));
    for (let j = 0; j < part.length; j++) {
      if (res[j].status === 'fulfilled') continue;
      let ok = false;
      for (let t = 0; t < 6 && !ok; t++) { part[j].id = nextIdFn(); try { await db.insert(table).values(part[j]).run(); ok = true; } catch (e) {} }
      if (!ok) part[j].__bad = true;
    }
  }
  return rows.filter((r) => !r.__bad);
}

async function work(input, u) {
  const kinds = [...new Set((Array.isArray(input.kinds) ? input.kinds : []).map(Number))].filter((k) => COLS.some((c) => c.k === k && c.open));
  if (!kinds.length) throw new EndpointError('Kolleksiya tanlanmagan', { code: 'BAD' });
  const self = !!input.self;
  const items = (Array.isArray(input.items) ? input.items : []).slice(0, MAX_ITEMS)
    .map((x) => ({ to: x && x.to, n: Math.floor(Number(x && x.n) || 0) })).filter((x) => x.n > 0);
  const total = items.reduce((s, x) => s + x.n, 0);
  if (!items.length || total > MAX_CALL) throw new EndpointError('Noto‘g‘ri miqdor', { code: 'BAD' });

  bumpAll();
  const all = await allGifts();
  const cnt = {}, used = {}, ptr = {};
  let nextId = 1;
  for (const g of all) {
    const k = g.kind || 0;
    cnt[k] = (cnt[k] || 0) + 1;
    if (g.upgraded && g.num) (used[k] || (used[k] = new Set())).add(g.num);
    if (g.id >= nextId) nextId = g.id + 1;
  }
  const takeNum = (k) => { const s = used[k] || (used[k] = new Set()); let n = ptr[k] || 1; while (s.has(n)) n++; s.add(n); ptr[k] = n + 1; return n; };
  const room = () => kinds.filter((k) => (cnt[k] || 0) < colOf(k).supply);

  const me = await ensureUser(u);
  const meChat = self ? null : await ensureChatUser(u);
  let nextMsg = 0, nextDlg = 1; const dmap = new Map();
  if (!self) {
    nextMsg = await nextMessageId();
    const dl = await db.select().from(dialogs).all();
    for (const d of dl) { dmap.set(d.a + '_' + d.b, d); if (d.id >= nextDlg) nextDlg = d.id + 1; }
  }
  const msgs = [], byKind = {};
  let made = 0, okUsers = 0, failed = 0, short = 0;

  await pool(items, PAR, async (it) => {
    let to = me;
    if (!self) {
      to = await findUser(String(it.to));
      if (!to || isAdmin(to.id)) { failed++; return; }
    }
    // 1) xotirada sovg'alarni tayyorlaymiz (raqam va ID lar shu yerning o'zida band qilinadi)
    const rows = [];
    for (let i = 0; i < it.n; i++) {
      const open = room();
      if (!open.length) { short += it.n - i; break; }
      const kind = open[Math.floor(Math.random() * open.length)];
      const model = pickW(modelW(kind)), pattern = pickW(PATTERN_W);
      const bd = EXTRA_BD[kind];
      const backdrop = bd && bd.length ? bd[Math.floor(Math.random() * bd.length)] : pickW(BACKDROP_W);
      cnt[kind] = (cnt[kind] || 0) + 1;
      rows.push({ id: nextId++, owner: to.id, kind, upgraded: 1, model, pattern, backdrop, num: takeNum(kind), created: new Date().toISOString(), pinned: 0, price: 0, hidden: 0 });
    }
    if (!rows.length) { failed++; return; }
    // 2) bazaga parallel yozamiz
    const got = await insertAll(gifts, rows, () => nextId++);
    const lost = rows.length - got.length;
    if (lost) { short += lost; for (const r of rows) if (r.__bad) { cnt[r.kind]--; used[r.kind].delete(r.num); } }
    if (!got.length) { failed++; return; }
    okUsers++; made += got.length;
    for (const g of got) { const nm = colOf(g.kind).name; byKind[nm] = (byKind[nm] || 0) + 1; }
    if (self) return;

    // 3) chat: admin -> qabul qiluvchi (kartalar), yozishma ro'yxati
    try {
      await ensureChatUser({ id: to.id, first_name: to.name, username: to.username || '' });
      const rk = roomKey(u.id, to.id);
      const ts = Date.now();
      const cards = got.slice(0, MAX_CARDS).map((g) => ({ id: nextMsg++, room: rk, sender: u.id, name: meChat.name, body: `${GIFT_TAG}${g.id},${g.backdrop},${g.pattern},${g.model},${g.num},${g.kind}⟧`, ts }));
      const saved = await insertAll(messages_t, cards, () => nextMsg++);
      const last = saved[saved.length - 1];
      if (last) {
        const a = Math.min(u.id, to.id), b = Math.max(u.id, to.id);
        const base = { lastId: last.id, lastFrom: u.id, lastBody: last.body.slice(0, 60), lastTs: last.ts, ...(u.id === a ? { readA: last.id } : { readB: last.id }) };
        const d = dmap.get(a + '_' + b);
        if (d) { await db.update(dialogs).set(base).where(eq(dialogs.id, d.id)).run(); await prune(rk); }
        else {
          const row = { id: nextDlg++, a, b, readA: 0, readB: 0, ...base };
          try { await db.insert(dialogs).values(row).run(); dmap.set(a + '_' + b, row); } catch (e) { await touchDialog(u.id, to.id, last); }
        }
      }
    } catch (e) {}

    const lines = got.slice(0, 12).map((g) => `• ${colOf(g.kind).name} #${g.num}`);
    if (got.length > 12) lines.push(`…va yana ${got.length - 12} ta`);
    msgs.push({ id: to.id, text: `🎁 Sizga ${got.length} ta sovg'a qilindi!\n${lines.join('\n')}` });
  });
  bumpAll();
  return { msgs, made, okUsers, failed, short, byKind };
}

export default async function (input, ctx) {
  const u = ctx.initData.user;
  if (!isAdmin(u.id)) throw new EndpointError('Ruxsat yoq', { code: 'FORBIDDEN' });
  try {
    if (input.op === 'ping') return { ok: 1, t: Date.now() };
    if (input.op === 'users') {
      const ids = (await db.select().from(users).all()).filter((x) => !isAdmin(x.id)).map((x) => x.id);
      const rows = await allGifts();
      const left = [];   // massiv (indeks = kolleksiya raqami). Butun sonli kalitli obyekt serverdan qaytarib bo'lmaydi
      for (const c of COLS) left[c.k] = c.open ? Math.max(0, c.supply - rows.filter((g) => (g.kind || 0) === c.k).length) : 0;
      for (let i = 0; i < left.length; i++) if (left[i] == null) left[i] = 0;
      return { ids, left };
    }
    if (input.op !== 'run') throw new EndpointError('Notogri amal', { code: 'BAD' });

    const r = await lock(() => work(input, u));
    // Botdan xabarlar navbatdan TASHQARIDA, Telegram limitiga mos (25 tadan guruh)
    let notified = 0;
    for (let i = 0; i < r.msgs.length; i += 25) {
      const res = await Promise.all(r.msgs.slice(i, i + 25).map((m) => notify(m.id, m.text)));
      notified += res.filter(Boolean).length;
      if (i + 25 < r.msgs.length) await new Promise((x) => setTimeout(x, 1000));
    }
    return { ok: 1, made: r.made, users: r.okUsers, failed: r.failed, short: r.short, notified, byKind: r.byKind };
  } catch (e) {
    if (e instanceof EndpointError) throw e;
    console.error('bulk xato', e && e.stack || e);
    throw new EndpointError('Xato: ' + String((e && e.message) || e).slice(0, 160), { code: 'ERR' });
  }
}
