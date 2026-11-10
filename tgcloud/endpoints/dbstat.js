import { db, EndpointError } from 'sdk';
import * as ops from 'sdk/db';
import { eq } from 'sdk/db';
import { gifts, users } from '../schema.js';
import { isAdmin, ensureUser, ensureNums, pub } from '../lib/game.js';
import { getPerk } from '../lib/perks.js';
import { isVip } from '../lib/vip.js';

// Faqat admin uchun, diagnostika. Sovg'alar jadvalini sahifalab sanaydi yoki `me` funksiyasini qadamma-qadam tekshiradi.
//  dbstat                      -> jadval statistikasi (o'qiydi)
//  dbstat "{step:'user'}"      -> me ning bitta qadami: user | nums | perk | mine | stats | vip | count
export default async function (input, ctx) {
  const t0 = Date.now();
  const u = ctx && ctx.initData && ctx.initData.user;
  if (!u || !isAdmin(u.id)) throw new EndpointError('Ruxsat yoq', { code: 'FORBIDDEN' });

  if (input && input.step) {
    const s = String(input.step);
    let info = '';
    if (s === 'user') { const r = await ensureUser(u); info = 'balans=' + r.balance; }
    else if (s === 'nums') { await ensureNums(true); info = 'tayyor'; }
    else if (s === 'perk') { const p = await getPerk(u.id); info = JSON.stringify(p).slice(0, 80); }
    else if (s === 'mine') { const r = await db.select().from(gifts).where(eq(gifts.owner, u.id)).all(); const j = JSON.stringify(r.map(pub)); info = 'sovg\'alar=' + r.length + ', JSON=' + Math.round(j.length / 1024) + ' KB'; }
    else if (s === 'stats') { const r = await db.select().from(gifts).all(); info = 'jami sovg\'a=' + r.length; }
    else if (s === 'vip') { info = 'vip=' + (await isVip(u.id)); }
    else if (s === 'count') { info = 'foydalanuvchilar=' + (await db.select().from(users).all()).length; }
    else throw new EndpointError('Noma\'lum qadam', { code: 'BAD' });
    return { step: s, info, ms: Date.now() - t0 };
  }

  const { gt, asc } = ops;
  const paged = !!(gt && asc);
  const owners = {}, kinds = {}, seen = new Set();
  let total = 0, upgraded = 0, noNum = 0, dup = 0, onMarket = 0, last = 0, pages = 0, note = 'ok';
  for (;;) {
    let rows;
    try {
      let q = db.select().from(gifts);
      if (paged) q = q.where(gt(gifts.id, last)).orderBy(asc(gifts.id));
      rows = await q.limit(1500).all();
    } catch (e) { note = 'xato: ' + String((e && e.message) || e).slice(0, 140); break; }
    if (!rows.length) break;
    for (const g of rows) {
      total++;
      const ok = 'u' + g.owner, kk = 'k' + (g.kind || 0);
      owners[ok] = (owners[ok] || 0) + 1;
      kinds[kk] = (kinds[kk] || 0) + 1;
      if (g.price > 0) onMarket++;
      if (g.upgraded) {
        upgraded++;
        if (!g.num) noNum++;
        else { const k = (g.kind || 0) + ':' + g.num; if (seen.has(k)) dup++; else seen.add(k); }
      }
    }
    pages++;
    if (!paged) { note = 'faqat birinchi 1500 ta (sahifalash yoq)'; break; }
    last = rows[rows.length - 1].id;
    if (rows.length < 1500) break;
    if (pages >= 80) { note = 'cheklandi (120 000 dan ko\'p)'; break; }
  }
  const top = Object.entries(owners).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => id + ': ' + n);
  return { total, upgraded, noNum, dup, onMarket, adminOwns: owners['u' + u.id] || 0, topOwners: top, byKind: Object.entries(kinds).map(([k, n]) => k + ': ' + n), pages, ms: Date.now() - t0, note };
}
