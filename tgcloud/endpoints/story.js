import { db, EndpointError } from 'sdk';
import { eq } from 'sdk/db';
import { stories, chatUsers } from '../schema.js';
import { STORY_TTL_MS, STORY_MAX_PER_USER, STORY_TEXT_MAX, STORY_IMG_MAX, STORY_BG_COUNT } from '../lib/config.js';
import { lock, ensureUser, isAdmin } from '../lib/game.js';
import { ensureChatUser } from '../lib/chat.js';
import { perkMap, perkOf, photoMap } from '../lib/perks.js';

const BAD = /[\u0000-\u0008\u000b\u000c\u000e-\u001f​-‏‪-‮⁦-⁩]/g;
const LINK = /(https?:\/\/|www\.|t\.me\/|tg:\/\/|telegram\.me)/i;
const IMG = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

// Muddati o'tgan hikoyalarni o'chiradi (har so'rovda emas — 5 daqiqada bir marta)
let _lastPurge = 0;
async function purge(all) {
  if (Date.now() - _lastPurge < 300000) return;
  _lastPurge = Date.now();
  const cut = Date.now() - STORY_TTL_MS;
  for (const s of all.filter((x) => x.ts < cut)) { try { await db.delete(stories).where(eq(stories.id, s.id)).run(); } catch (e) {} }
}
const alive = (all) => { const cut = Date.now() - STORY_TTL_MS; return all.filter((x) => x.ts >= cut); };

// op: 'feed' (hikoyasi borlar ro'yxati) | 'get' {owner} (bitta odamning hikoyalari) | 'add' {kind,body,bg} | 'del' {id}
// Hikoyasi borlar ro'yxati 20 soniya keshlanadi (rasmli hikoyalar og'ir — har so'rovda butun jadval o'qilmasin)
let _feed = { t: 0, by: null };
const bust = () => { _feed.t = 0; };

async function run(input, ctx) {
  const u = ctx.initData.user;
  await ensureUser(u);
  const me = await ensureChatUser(u);
  const op = input.op || 'feed';

  if (op === 'feed') {
    if (!_feed.by || Date.now() - _feed.t > 20000) {
      const all = await db.select().from(stories).all();
      purge(all);
      const by0 = {};
      for (const s of alive(all)) { const a = (by0[s.owner] = by0[s.owner] || { id: s.owner, n: 0, last: 0 }); a.n++; a.last = Math.max(a.last, s.ts); }
      _feed = { t: Date.now(), by: by0 };
    }
    const by = _feed.by;
    const ids = Object.keys(by).map(Number);
    const [pk, ph] = await Promise.all([perkMap(ids), photoMap(ids)]);
    const out = [];
    for (const id of ids) {
      const cu = await db.select().from(chatUsers).where(eq(chatUsers.id, id)).get();
      if (cu && cu.banned) continue;
      const p = perkOf(pk, id);
      out.push({ id, name: (cu && cu.name) || 'Foydalanuvchi', photo: ph[id] || '', prem: p.prem, st: p.st, n: by[id].n, last: by[id].last, mine: id === u.id });
    }
    out.sort((a, b) => (b.mine ? 1 : 0) - (a.mine ? 1 : 0) || b.last - a.last);
    return { users: out };
  }

  if (op === 'get') {
    const owner = Number(input.owner);
    const rows = alive(await db.select().from(stories).where(eq(stories.owner, owner)).all()).sort((a, b) => a.id - b.id);
    return { stories: rows.map((s) => ({ id: s.id, kind: s.kind, body: s.body, bg: s.bg, ts: s.ts })) };
  }

  if (me.banned) throw new EndpointError('Siz bloklangansiz', { code: 'BANNED' });

  if (op === 'add') {
    const kind = input.kind === 'p' ? 'p' : 't';
    let body = String(input.body == null ? '' : input.body);
    if (kind === 'p') {
      if (!IMG.test(body) || body.length > STORY_IMG_MAX) throw new EndpointError('Rasm noto‘g‘ri yoki juda katta', { code: 'BAD' });
    } else {
      body = body.replace(/\r/g, '').replace(BAD, '').replace(/\n{3,}/g, '\n\n').trim();
      if (!body) throw new EndpointError('Bo‘sh hikoya', { code: 'EMPTY' });
      if (body.length > STORY_TEXT_MAX) throw new EndpointError('Matn juda uzun', { code: 'LONG' });
      if (!isAdmin(u.id) && LINK.test(body)) throw new EndpointError('Havola yuborish mumkin emas', { code: 'LINKS' });
    }
    const bg = Math.max(0, Math.min(STORY_BG_COUNT - 1, Math.floor(Number(input.bg) || 0)));
    const all = await db.select().from(stories).all();
    const mine = alive(all).filter((s) => s.owner === u.id);
    if (mine.length >= STORY_MAX_PER_USER) throw new EndpointError('Hikoyalar soni to‘ldi (24 soatdan keyin yangilanadi)', { code: 'LIMIT' });
    let id = all.reduce((m, s) => Math.max(m, s.id), 0) + 1;
    const row = { owner: u.id, kind, body, bg, ts: Date.now() };
    for (let t = 0; t < 5; t++) {
      try { await db.insert(stories).values({ id, ...row }).run(); bust(); return { ok: 1, id }; } catch (e) { id++; }
    }
    throw new EndpointError('Qayta urinib koring', { code: 'RETRY' });
  }

  if (op === 'del') {
    const s = await db.select().from(stories).where(eq(stories.id, Number(input.id))).get();
    if (!s) return { ok: 1 };
    if (s.owner !== u.id && !isAdmin(u.id)) throw new EndpointError('Ruxsat yo‘q', { code: 'FORBIDDEN' });
    await db.delete(stories).where(eq(stories.id, s.id)).run(); bust();
    return { ok: 1 };
  }
  throw new EndpointError('Noma’lum amal', { code: 'BAD' });
}

export default (input, ctx) => (input && input.op === 'add' ? lock(() => run(input, ctx)) : run(input, ctx));
