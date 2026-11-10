import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { gifts } from '../schema.js';
import { UPGRADE_PRICE, colOf } from '../lib/config.js';
import { MODEL_W, CAP_MODEL_W, PATTERN_W, BACKDROP_W, EXTRA_BD, modelW } from '../lib/data.js';
import { ensureUser, assertFunds, addStars, pickW, pub, balanceOf, kindState, nextNum, ksUp, lock } from '../lib/game.js';

import { requireSub } from '../lib/game.js';
async function run(input, ctx) {
  const u = ctx.initData.user;
  const user = await ensureUser(u);
  const g = await db.select().from(gifts).where(eq(gifts.id, Number(input.id))).get();
  if (!g || g.owner !== u.id) throw new EndpointError('Sovga topilmadi', { code: 'NOT_FOUND' });
  if (g.upgraded) throw new EndpointError('Allaqachon yaxshilangan', { code: 'DONE' });

  // Natija FAQAT serverda, noyoblik foizlariga qarab tanlanadi
  const kind = g.kind || 0;
  const model = pickW(modelW(kind)), pattern = pickW(PATTERN_W);
  const bdList = EXTRA_BD[kind];   // ba'zi kolleksiyalar faqat tanlangan fonlardan chiqadi
  const backdrop = bdList && bdList.length ? bdList[Math.floor(Math.random() * bdList.length)] : pickW(BACKDROP_W);
  // Raqam: eng kichik bo'sh son. So'rovlar navbat (lock) bilan ishlaydi, shuning uchun num hech qachon bo'sh qolmaydi.
  const st = await kindState(kind);   // xotiradagi hisob (bazani o'qimaydi)
  let num = nextNum(st);
  const want = input.num;
  if (want !== undefined && want !== null && want !== '') {
    const n = Number(want), max = colOf(kind).supply;
    if (!Number.isInteger(n) || n < 1 || n > max) throw new EndpointError(`Raqam 1 dan ${max} gacha bo‘lsin`, { code: 'BAD_NUM' });
    if (st.used.has(n)) throw new EndpointError('Bu raqam band', { code: 'TAKEN' });
    num = n;
  }
  if (input.check) return { free: 1, num };
  assertFunds(user, UPGRADE_PRICE);
  await db.update(gifts).set({ upgraded: 1, model, pattern, backdrop, num }).where(eq(gifts.id, g.id)).run();
  await addStars(user, -UPGRADE_PRICE); ksUp(kind, num);
  return { gift: pub({ ...g, upgraded: 1, model, pattern, backdrop, num }), balance: balanceOf(user) };
}

export default async (input, ctx) => {
  const user = await ensureUser(ctx.initData.user);
  await requireSub(user);   // Telegram API chaqiruvi navbatdan tashqarida
  return lock(() => run(input, ctx));
};
