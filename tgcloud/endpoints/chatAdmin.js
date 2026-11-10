import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { messages, chatUsers } from '../schema.js';
import { isAdmin } from '../lib/game.js';

// Faqat admin: xabarni o'chirish, odamni bloklash / blokdan chiqarish
export default async function (input, ctx) {
  const u = ctx.initData.user;
  if (!isAdmin(u.id)) throw new EndpointError('Ruxsat yo‘q', { code: 'FORBIDDEN' });
  if (input.action === 'del') {
    await db.delete(messages).where(eq(messages.id, Number(input.id))).run();
  } else if (input.action === 'ban' || input.action === 'unban') {
    const uid = Number(input.uid);
    if (isAdmin(uid)) throw new EndpointError('Adminni bloklab bo‘lmaydi', { code: 'FORBIDDEN' });
    await db.update(chatUsers).set({ banned: input.action === 'ban' ? 1 : 0 }).where(eq(chatUsers.id, uid)).run();
  } else throw new EndpointError('Noma’lum amal', { code: 'BAD' });
  return { ok: true };
}
