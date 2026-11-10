import { db, api, EndpointError } from 'sdk';
import { eq, sql } from 'sdk/db';
import { users } from '../schema.js';
import { WEBAPP_URL } from '../lib/config.js';
import { isAdmin, lock } from '../lib/game.js';

// Faqat admin: bir nechta foydalanuvchiga bir xil miqdorda Stars berish (mijoz jami summani teng bo'lib, bo'laklab yuboradi).
//  { ids:[...], amount }  -> har bir ID ga `amount` Stars qo'shiladi va botdan xabar boradi
const MAX_IDS = 40;
const MAX_AMOUNT = 1e12;   // bitta foydalanuvchiga
const f = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const notify = async (id, text) => {
  try { await api.sendMessage({ chat_id: id, text, reply_markup: WEBAPP_URL ? { inline_keyboard: [[{ text: '🎮 Ochish', web_app: { url: WEBAPP_URL } }]] } : undefined }); return true; } catch (e) { return false; }
};

async function main(input, ctx) {
  const u = ctx.initData.user;
  if (!isAdmin(u.id)) throw new EndpointError('Ruxsat yoq', { code: 'FORBIDDEN' });
  const amount = Math.floor(Number(input.amount) || 0);
  const ids = [...new Set((Array.isArray(input.ids) ? input.ids : []).map(Number))].filter((x) => Number.isInteger(x) && x > 0 && !isAdmin(x)).slice(0, MAX_IDS);
  if (!ids.length || amount < 1 || amount > MAX_AMOUNT) throw new EndpointError('Notogri miqdor', { code: 'BAD' });

  const done = await lock(async () => {
    const ok = [];
    for (let i = 0; i < ids.length; i += 10) {
      await Promise.all(ids.slice(i, i + 10).map(async (id) => {
        const row = await db.select().from(users).where(eq(users.id, id)).get();
        if (!row) return;
        await db.update(users).set({ balance: sql`${users.balance} + ${amount}` }).where(eq(users.id, id)).run();
        ok.push(id);
      }));
    }
    return ok;
  });

  const res = [];
  for (let i = 0; i < done.length; i += 25) {
    res.push(...await Promise.all(done.slice(i, i + 25).map((id) => notify(id, `⭐ Sizga ${f(amount)} Stars berildi!`))));
    if (i + 25 < done.length) await new Promise((x) => setTimeout(x, 1000));
  }
  return { ok: done.length, missing: ids.length - done.length, notified: res.filter(Boolean).length, amount };
}

export default async function (input, ctx) {
  try { return await main(input, ctx); } catch (e) {
    if (e instanceof EndpointError) throw e;
    console.error('bulkStars xato', e && e.stack || e);
    throw new EndpointError('Xato: ' + String((e && e.message) || e).slice(0, 160), { code: 'ERR' });
  }
}
