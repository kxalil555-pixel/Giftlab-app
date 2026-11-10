import { allGifts } from '../lib/game.js';
import { db, api, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { gifts } from '../schema.js';
import { WEBAPP_URL, COLS, colOf } from '../lib/config.js';
import { MODEL_W, CAP_MODEL_W, PATTERN_W, BACKDROP_W, modelW } from '../lib/data.js';
import { ensureUser, isAdmin, findUser, pickW, freeNum, ensureNums, pub, lock, bumpAll } from '../lib/game.js';
import { ensureChatUser, roomKey, insertMessage, prune, touchDialog, pubMsg, GIFT_TAG } from '../lib/chat.js';

const notify = async (id, text) => {
  try { await api.sendMessage({ chat_id: id, text, reply_markup: WEBAPP_URL ? { inline_keyboard: [[{ text: '🎮 Ochish', web_app: { url: WEBAPP_URL } }]] } : undefined }); } catch (e) {}
};

// -1 / bo'sh / null => tasodifiy (noyoblik vazni bo'yicha), aks holda indeks tekshiriladi
const pickIdx = (v, w, label) => {
  if (v === null || v === undefined || v === '' || Number(v) < 0) return pickW(w);
  const n = Number(v);
  if (!Number.isInteger(n) || n >= w.length) throw new EndpointError(`${label} noto‘g‘ri`, { code: 'BAD' });
  return n;
};

// Faqat admin: tayyor (yaxshilangan) sovg'ani tanlangan model/fon/naqsh/raqam bilan foydalanuvchiga hadya qilish
async function run(input, ctx) {
  const u = ctx.initData.user;
  if (!isAdmin(u.id)) throw new EndpointError('Ruxsat yoq', { code: 'FORBIDDEN' });
  const to = await findUser(input.to);
  if (!to) throw new EndpointError('Foydalanuvchi topilmadi (u ilovaga kirgan bolishi kerak)', { code: 'NO_USER' });

  const kind = Number(input.kind) || 0;
  if (!COLS.some((c) => c.k === kind)) throw new EndpointError('Kolleksiya noto‘g‘ri', { code: 'BAD' });
  const col = colOf(kind);
  const model = pickIdx(input.model, modelW(kind), 'Model');
  const pattern = pickIdx(input.pattern, PATTERN_W, 'Naqsh');
  const backdrop = pickIdx(input.backdrop, BACKDROP_W, 'Fon');

  await ensureNums(true); bumpAll();
  let all = await allGifts();
  let num;
  if (input.num === null || input.num === undefined || String(input.num).trim() === '') {
    num = freeNum(all, kind);
  } else {
    num = Number(input.num);
    if (!Number.isInteger(num) || num < 1 || num > col.supply) throw new EndpointError(`Raqam 1 dan ${col.supply} gacha bo‘lsin`, { code: 'BAD' });
    const taken = all.find((g) => g.upgraded && (g.kind || 0) === kind && g.num === num);
    if (taken) {
      const mode = String(input.taken || 'err');
      if (mode === 'renum') {
        // Eski sovg'a egasida qoladi, lekin raqami eng katta bo'sh raqamga (max+1) almashadi
        const top = all.filter((g) => g.upgraded && (g.kind || 0) === kind).reduce((m, g) => Math.max(m, g.num || 0), 0);
        await db.update(gifts).set({ num: top + 1 }).where(eq(gifts.id, taken.id)).run();
        notify(taken.owner, `ℹ️ Sovg'angiz #${num} raqami admin tomonidan #${top + 1} ga almashtirildi.`);
      } else if (mode === 'del') {
        await db.delete(gifts).where(eq(gifts.id, taken.id)).run();
        notify(taken.owner, `ℹ️ Sovg'angiz ${col.name} #${num} admin tomonidan olib qo‘yildi.`);
      } else {
        throw new EndpointError(`#${num} band (sovg‘a ID ${taken.id}, egasi ${taken.owner})`, { code: 'NUM_TAKEN' });
      }
      all = await allGifts();
    }
  }

  // Soni: 1..100 (bir nechta bo'lsa 2-sovg'adan boshlab raqam avtomatik, model/fon/naqsh esa tanlangan yoki har safar tasodifiy)
  const count = Math.max(1, Math.min(100, Math.floor(Number(input.count)) || 1));
  let id = all.reduce((m, g) => Math.max(m, g.id), 0) + 1;
  const made = [];
  let short = 0;
  for (let i = 0; i < count; i++) {
    let n = num, mo = model, pa = pattern, bd = backdrop;
    if (i > 0) {
      n = freeNum(all, kind);
      if (n > col.supply) { short = count - i; break; }   // zaxira tugadi
      mo = pickIdx(input.model, modelW(kind), 'Model'); pa = pickIdx(input.pattern, PATTERN_W, 'Naqsh'); bd = pickIdx(input.backdrop, BACKDROP_W, 'Fon');
    }
    const row = { owner: to.id, kind, upgraded: 1, model: mo, pattern: pa, backdrop: bd, num: n, created: new Date().toISOString(), pinned: 0, price: 0, hidden: 0 };
    let ok = false;
    for (let t = 0; t < 8 && !ok; t++) {
      try { await db.insert(gifts).values({ id, ...row }).run(); ok = true; } catch (e) { id++; }
    }
    if (!ok) { if (!made.length) throw new EndpointError('Qayta urinib koring', { code: 'RETRY' }); short = count - i; break; }
    all.push({ id, ...row }); made.push({ id, ...row }); id++;
  }

  notify(to.id, made.length === 1 ? `🎁 Sizga ${col.name} #${made[0].num} sovg'a qilindi!` : `🎁 Sizga ${made.length} ta ${col.name} sovg'a qilindi! (#${made[0].num} … #${made[made.length - 1].num})`);

  // Chatda ham ko'rinadi: admin → qabul qiluvchi yozishmasiga sovg'a kartalari (o'ziga bo'lsa — yo'q)
  let msg = null;
  if (to.id !== u.id) {
    try {
      const me = await ensureChatUser(u);
      await ensureChatUser({ id: to.id, first_name: to.name, username: to.username || '' });
      const room = roomKey(u.id, to.id);
      let m = null;
      for (const g of made.slice(0, 60)) {
        m = await insertMessage({ room, sender: u.id, name: me.name, body: `${GIFT_TAG}${g.id},${g.backdrop},${g.pattern},${g.model},${g.num},${kind}⟧`, ts: Date.now() });
      }
      if (m) { await prune(room); await touchDialog(u.id, to.id, m); msg = pubMsg(m); }
    } catch (e) {}
  }
  const first = made[0];
  return { ok: 1, to: to.name, gift: pub(first), num: first.num, msg, made: made.length, short };
}

export default (input, ctx) => lock(() => run(input, ctx));
