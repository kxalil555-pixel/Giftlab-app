import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { gifts, users, chatUsers } from '../schema.js';
import { ensureUser, pub } from '../lib/game.js';

// Bitta sovg'aning to'liq ma'lumoti va HOZIRGI egasi — chatdagi sovg'a kartasidan "Ko'rish" uchun.
// Sovg'a keyin boshqaga o'tib ketgan bo'lsa ham ma'lumot ko'rinadi.
export default async function (input, ctx) {
  await ensureUser(ctx.initData.user);
  const g = await db.select().from(gifts).where(eq(gifts.id, Number(input.id))).get();
  if (!g || !g.upgraded) throw new EndpointError('Sovga topilmadi yoki ochilgan', { code: 'NOT_FOUND' });
  let o = await db.select().from(users).where(eq(users.id, g.owner)).get();
  if (!o) o = await db.select().from(chatUsers).where(eq(chatUsers.id, g.owner)).get();
  return { gift: pub(g), owner: { id: g.owner, name: (o && o.name) || 'Foydalanuvchi' } };
}
