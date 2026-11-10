import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { perks } from '../schema.js';
import { STATUS_COUNT } from '../lib/config.js';
import { ensureUser } from '../lib/game.js';
import { getPerk, isPrem } from '../lib/perks.js';

// Emoji-status qo'yish (faqat Premium). input: { id: 0..STATUS_COUNT }  — 0 = olib tashlash, aks holda 1-asosli indeks
export default async function (input, ctx) {
  const u = ctx.initData.user;
  await ensureUser(u);
  const id = Math.floor(Number(input.id) || 0);
  if (id < 0 || id > STATUS_COUNT) throw new EndpointError('Noto‘g‘ri status', { code: 'BAD' });
  const cur = await getPerk(u.id);
  if (id > 0 && !isPrem(cur)) throw new EndpointError('Status faqat Premium uchun', { code: 'NEED_PREMIUM' });
  if (await db.select().from(perks).where(eq(perks.id, u.id)).get()) await db.update(perks).set({ status: id }).where(eq(perks.id, u.id)).run();
  else await db.insert(perks).values({ id: u.id, until: 0, status: id }).run();
  return { status: id };
}
