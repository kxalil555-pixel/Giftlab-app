import { db, api, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { animVip, users } from '../schema.js';
import { WEBAPP_URL } from '../lib/config.js';
import { isAdmin, findUser } from '../lib/game.js';

// Faqat admin: doimiy animatsiya (VIP) funksiyasini foydalanuvchiga berish / olib qo'yish.
//  { op:'list' }              -> { items:[{id,name,username}] }
//  { op:'add',    to:'ID|@u' } -> beriladi, botdan xabar boradi
//  { op:'remove', to:'ID|@u' } -> olib qo'yiladi
const notify = async (id, text) => {
  try { await api.sendMessage({ chat_id: id, text, reply_markup: WEBAPP_URL ? { inline_keyboard: [[{ text: '🎮 Ochish', web_app: { url: WEBAPP_URL } }]] } : undefined }); } catch (e) {}
};

export default async function (input, ctx) {
  const u = ctx.initData.user;
  if (!isAdmin(u.id)) throw new EndpointError('Ruxsat yoq', { code: 'FORBIDDEN' });

  if (input.op === 'list') {
    const rows = await db.select().from(animVip).all();
    const names = new Map((await db.select().from(users).all()).map((x) => [x.id, x]));
    return { items: rows.map((r) => { const x = names.get(r.id) || {}; return { id: r.id, name: x.name || '', username: x.username || '' }; }) };
  }
  if (input.op === 'resolve') {
    const w = await findUser(input.to);
    if (!w) throw new EndpointError('Foydalanuvchi topilmadi: ' + String(input.to).slice(0, 40), { code: 'NO_USER' });
    return { id: w.id };
  }
  if (input.op !== 'add' && input.op !== 'remove') throw new EndpointError('Notogri amal', { code: 'BAD' });

  const to = await findUser(input.to);
  if (!to) throw new EndpointError('Foydalanuvchi topilmadi (u ilovaga kirgan bolishi kerak)', { code: 'NO_USER' });
  const has = await db.select().from(animVip).where(eq(animVip.id, to.id)).get();
  if (input.op === 'add') {
    if (!has) await db.insert(animVip).values({ id: to.id, ts: new Date().toISOString() }).run();
    notify(to.id, '⚡ Sizga doimiy animatsiya funksiyasi berildi! Endi sovg‘a animatsiyalari hech qachon o‘chmaydi.');
  } else {
    if (has) await db.delete(animVip).where(eq(animVip.id, to.id)).run();
    notify(to.id, 'ℹ️ Doimiy animatsiya funksiyasi o‘chirildi.');
  }
  return { ok: 1, id: to.id, name: to.name, on: input.op === 'add' ? 1 : 0 };
}
