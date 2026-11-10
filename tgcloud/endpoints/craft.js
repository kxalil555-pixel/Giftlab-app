import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { gifts } from '../schema.js';
import { PATTERN_W, BACKDROP_W, EXTRA_BD, EXTRA_CR } from '../lib/data.js';
import { ensureUser, pickW, pub, balanceOf, lock, requireSub, isAdmin, kindState, ksAdd, ksDel, nextNum, maxGiftId } from '../lib/game.js';

// Gift tayyorlash (craft): bir kolleksiyaning 1–4 ta yaxshilangan sovg'asi sarflanadi.
// Omad ehtimoli = 22% × sovg'alar soni (88% gacha). Omad kelsa — shu kolleksiyaning maxsus (craft) modelidagi yangi sovg'a;
// kelmasa — sarflangan sovg'alar yo'qoladi.
const STEP = 22;
let _nid = 0;

async function run(input, ctx) {
  const u = ctx.initData.user;
  const user = await ensureUser(u);
  const ids = [...new Set((Array.isArray(input.ids) ? input.ids : []).map(Number))];
  if (ids.length < 1 || ids.length > 4) throw new EndpointError('1 dan 4 tagacha sovg‘a tanlang', { code: 'BAD_COUNT' });
  const rows = [];
  for (const id of ids) {
    const g = await db.select().from(gifts).where(eq(gifts.id, id)).get();
    if (!g || g.owner !== u.id) throw new EndpointError('Sovga topilmadi', { code: 'NOT_FOUND' });
    if (!g.upgraded) throw new EndpointError('Faqat yaxshilangan sovg‘alar', { code: 'NOT_UP' });
    if (g.price) throw new EndpointError('Sotuvdagi sovg‘ani tanlab bo‘lmaydi', { code: 'LISTED' });
    rows.push(g);
  }
  const kind = rows[0].kind || 0;
  if (rows.some((g) => (g.kind || 0) !== kind)) throw new EndpointError('Hammasi bir kolleksiyadan bo‘lsin', { code: 'MIXED' });
  const cr = EXTRA_CR[kind];
  if (!cr) throw new EndpointError('Bu kolleksiyada tayyorlash yo‘q', { code: 'NO_CRAFT' });
  const chance = Math.min(88, STEP * ids.length);
  const adm = isAdmin(u.id);
  const win = adm || Math.random() * 100 < chance;
  if (input.check) return { chance };

  const st = await kindState(kind);
  for (const g of rows) { await db.delete(gifts).where(eq(gifts.id, g.id)).run(); ksDel(kind, g); }
  let gift = null;
  if (win) {
    const names = Object.keys(cr.tiers);
    const tier = adm && cr.tiers.legendary ? 'legendary' : names[pickW(names.map((t) => cr.tiers[t].p))];
    const list = cr.tiers[tier].m, model = list[Math.floor(Math.random() * list.length)];
    const pattern = pickW(PATTERN_W), bd = EXTRA_BD[kind];
    const backdrop = adm ? 1 : bd && bd.length ? bd[Math.floor(Math.random() * bd.length)] : pickW(BACKDROP_W);
    const num = nextNum(st);
    if (!_nid) _nid = (await maxGiftId()) + 1;
    let id = _nid, ok = false;
    const row = { owner: u.id, kind, upgraded: 1, model, pattern, backdrop, num, created: new Date().toISOString() };
    for (let t = 0; t < 12 && !ok; t++) { try { await db.insert(gifts).values({ id, ...row }).run(); ok = true; } catch (e) { id++; } }
    if (!ok) { _nid = 0; throw new EndpointError('Qayta urinib ko‘ring', { code: 'RETRY' }); }
    _nid = id + 1; ksAdd(kind, row);
    gift = pub({ id, ...row });
  }
  return { ok: win ? 1 : 0, chance, gift, burned: ids, balance: balanceOf(user) };
}

export default async (input, ctx) => {
  const user = await ensureUser(ctx.initData.user);
  await requireSub(user);
  return lock(() => run(input, ctx));
};
