import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { gifts } from '../schema.js';
import { colOf, SELL_RATE } from '../lib/config.js';
import { ensureUser, addStars, balanceOf, kindState, ksDel } from '../lib/game.js';

// Faqat oddiy (yaxshilanmagan) sovg'ani Stars'ga almashtirish
export default async function (input, ctx) {
  const u = ctx.initData.user;
  const user = await ensureUser(u);
  const g = await db.select().from(gifts).where(eq(gifts.id, Number(input.id))).get();
  if (!g || g.owner !== u.id) throw new EndpointError('Sovga topilmadi', { code: 'NOT_FOUND' });
  if (g.upgraded) throw new EndpointError('Yaxshilangan sovgani almashtirib bolmaydi', { code: 'UPGRADED' });
  await kindState(g.kind || 0);
  await db.delete(gifts).where(eq(gifts.id, g.id)).run(); ksDel(g.kind || 0, g);
  const got = Math.floor(colOf(g.kind).price * SELL_RATE);
  await addStars(user, got);
  return { got, balance: balanceOf(user) };
}
