import { EndpointError as __EE } from 'sdk';
import { allGifts } from '../lib/game.js';
import { db } from 'sdk';
import { gifts, users } from '../schema.js';
import { COLS, UPGRADE_PRICE, SELL_RATE, MIN_PRICE, ANIM_MAX_USERS, STAR_RATE, STAR_PACKS, TG_MIN, TG_MAX, PREMIUM_PLANS, STATUS_COUNT } from '../lib/config.js';
import { getPerk, isPrem } from '../lib/perks.js';
import { isVip } from '../lib/vip.js';
import { eq } from 'sdk/db';
import * as dbops from 'sdk/db';
import { ensureUser, isAdmin, pub, balanceOf, ensureNums, statsCache, kindState } from '../lib/game.js';

// Foydalanuvchilar sonini har so'rovda emas, 60 soniyada bir marta sanaymiz
let userCount = { n: 0, t: 0 };
async function countUsers() {
  if (Date.now() - userCount.t > 900000) {
    try { userCount = { n: (await db.select().from(users).all()).length, t: Date.now() }; } catch (e) { userCount.t = Date.now(); }
  }
  return userCount.n;
}

async function __h(input, ctx) {
  const u = ctx.initData.user;
  const user = await ensureUser(u);
  await ensureNums();
  const perk = await getPerk(u.id);
  // Ko'p sovg'ali (12k+) foydalanuvchida javob juda katta bo'lib "Server error" berardi: sahifalab o'qiymiz, ilovaga eng yangi MINE_MAX tasini beramiz
  const MINE_MAX = 1000;
  let rows = [];
  const { and, gt, asc } = dbops;
  if (and && gt && asc) {
    let last = 0;
    for (;;) {
      const part = await db.select().from(gifts).where(and(eq(gifts.owner, u.id), gt(gifts.id, last))).orderBy(asc(gifts.id)).limit(1500).all();
      if (!part.length) break;
      for (const r of part) rows.push(r);
      last = part[part.length - 1].id;
      if (part.length < 1500) break;
    }
  } else rows = await db.select().from(gifts).where(eq(gifts.owner, u.id)).all();
  rows.sort((a, b) => b.id - a.id);
  const total = rows.length;
  if (total > MINE_MAX) {
    const keep = rows.slice(0, MINE_MAX);
    if (user.wear && !keep.some((g) => g.id === user.wear)) { const w = rows.find((g) => g.id === user.wear); if (w) keep.push(w); }
    rows = keep;
  }
  const mine = rows.map(pub);
  if (!statsCache.v || Date.now() - statsCache.t > 15000) {      // xotiradagi hisoblagichlardan (bazani o'qimaydi)
    const out = [];
    for (const c of COLS) {
      const st = await kindState(c.k);
      out.push({ k: c.k, name: c.name, open: c.open, supply: c.supply, price: c.price, sell: Math.floor(c.price * SELL_RATE),
        sold: Math.min(st.count, c.supply), issued: st.issued, first: st.first, last: st.last });
    }
    statsCache.v = out; statsCache.t = Date.now();
  }
  return {
    admin: isAdmin(u.id),
    vip: (await isVip(u.id)) ? 1 : 0,
    balance: balanceOf(user),
    cols: statsCache.v,
    upgradePrice: UPGRADE_PRICE,
    wear: user.wear || 0,
    prem: isPrem(perk) ? perk.until : 0, status: isPrem(perk) ? perk.status : 0, plans: PREMIUM_PLANS, statusCount: STATUS_COUNT,
    photo: user.photo || '',
    minPrice: MIN_PRICE,
    starRate: STAR_RATE, packs: STAR_PACKS, tgMin: TG_MIN, tgMax: TG_MAX,
    lite: ANIM_MAX_USERS > 0 && (await countUsers()) > ANIM_MAX_USERS,
    gifts: mine, total,
  };
}

// Diagnostika: serverdagi haqiqiy xato matni ilovada ko'rinadi (log yo'q bo'lgani uchun)
export default async function (input, ctx) {
  try { return await __h(input, ctx); }
  catch (e) {
    if (e && e.code && e.name === 'EndpointError') throw e;
    console.error('me.js xato', e && e.stack || e);
    throw new __EE('[me] ' + String((e && e.message) || e).slice(0, 180), { code: 'SERVER' });
  }
}
