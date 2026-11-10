import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { gifts } from '../schema.js';
import { ensureUser, kindState, ksDel } from '../lib/game.js';

// Sovg'ani o'chirish (faqat egasi)
export default async function (input, ctx) {
  const u = ctx.initData.user;
  await ensureUser(u);
  const g = await db.select().from(gifts).where(eq(gifts.id, Number(input.id))).get();
  if (!g || g.owner !== u.id) throw new EndpointError('Sovga topilmadi', { code: 'NOT_FOUND' });
  await kindState(g.kind || 0);
  await db.delete(gifts).where(eq(gifts.id, g.id)).run(); ksDel(g.kind || 0, g);
  return { ok: 1 };
}
