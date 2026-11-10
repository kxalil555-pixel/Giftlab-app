import { db, api, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { perks } from '../schema.js';
import { PREMIUM_PLANS, MONTH_MS, WEBAPP_URL } from '../lib/config.js';
import { lock, ensureUser, assertFunds, addStars, balanceOf, requireSub } from '../lib/game.js';
import { getPerk, isPrem } from '../lib/perks.js';

// Premium sotib olish (ilovadagi Stars bilan). input: { plan: 3 | 6 | 12 }  (oy)
// Allaqachon Premium bo'lsa — muddat ustiga qo'shiladi.
async function run(input, ctx) {
  const u = ctx.initData.user;
  const user = await ensureUser(u);
  await requireSub(user);
  const plan = PREMIUM_PLANS.find((p) => p.m === Number(input.plan));
  if (!plan) throw new EndpointError('Noto‘g‘ri reja', { code: 'BAD' });
  assertFunds(user, plan.price);
  const cur = await getPerk(u.id);
  const base = isPrem(cur) ? cur.until : Date.now();
  const until = base + plan.m * MONTH_MS;
  if (await db.select().from(perks).where(eq(perks.id, u.id)).get()) await db.update(perks).set({ until }).where(eq(perks.id, u.id)).run();
  else await db.insert(perks).values({ id: u.id, until, status: 0 }).run();
  await addStars(user, -plan.price);
  try {
    api.sendMessage({
      chat_id: u.id, text: `💎 Premium faollashdi: ${plan.m} oy\nTugash sanasi: ${new Date(until).toISOString().slice(0, 10)}`,
      reply_markup: WEBAPP_URL ? { inline_keyboard: [[{ text: '🎮 Ochish', web_app: { url: WEBAPP_URL } }]] } : undefined,
    }).catch(() => {});
  } catch (e) {}
  return { until, balance: balanceOf(user) };
}

export default (input, ctx) => lock(() => run(input, ctx));
