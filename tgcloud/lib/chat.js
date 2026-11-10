import { db, EndpointError } from 'sdk';
import { eq, desc } from 'sdk/db';
import { messages, chatUsers, dialogs } from '../schema.js';
import { CHAT_KEEP } from './config.js';

export const nameOf = (u) => ([u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Foydalanuvchi').slice(0, 40);
// Sovg'a o'tkazilganda server qo'shadigan xizmat xabari belgisi (foydalanuvchi yoza olmaydi)
export const GIFT_TAG = '⟦g:';
export const roomKey = (me, peer) => `d${Math.min(me, peer)}_${Math.max(me, peer)}`;
export const pubMsg = (m) => ({ id: m.id, from: m.sender, name: m.name, text: m.body, ts: m.ts });

export async function ensureChatUser(u) {
  const name = nameOf(u), username = u.username || '';
  let row = await db.select().from(chatUsers).where(eq(chatUsers.id, u.id)).get();
  if (!row) {
    try { await db.insert(chatUsers).values({ id: u.id, name, username, lastTs: 0, banned: 0, lastBody: '' }).run(); } catch (e) {}
    row = (await db.select().from(chatUsers).where(eq(chatUsers.id, u.id)).get()) || { id: u.id, name, username, lastTs: 0, banned: 0, lastBody: '' };
  } else if (row.name !== name || row.username !== username) {
    await db.update(chatUsers).set({ name, username }).where(eq(chatUsers.id, u.id)).run();
    row = { ...row, name, username };
  }
  return row;
}

// xonadagi oxirgi n ta xabar (yangidan eskiga). orderBy/limit ishlamasa — oddiy usul.
export async function recent(room, n) {
  try {
    return await db.select().from(messages).where(eq(messages.room, room)).orderBy(desc(messages.id)).limit(n).all();
  } catch (e) {
    const all = await db.select().from(messages).where(eq(messages.room, room)).all();
    return all.sort((x, y) => y.id - x.id).slice(0, n);
  }
}

export async function nextMessageId() {
  let top = null;
  try { top = await db.select().from(messages).orderBy(desc(messages.id)).limit(1).get(); }
  catch (e) { top = (await db.select().from(messages).all()).reduce((m, x) => (!m || x.id > m.id ? x : m), null); }
  return (top ? top.id : 0) + 1;
}

export async function insertMessage(row) {
  let id = await nextMessageId();
  for (let t = 0; t < 6; t++) {
    try { await db.insert(messages).values({ id, ...row }).run(); return { id, ...row }; }
    catch (e) { id++; }
  }
  throw new EndpointError('Qayta urinib koring', { code: 'RETRY' });
}

// eng eskisini o'chirib, xonani CHAT_KEEP bilan cheklaydi
export async function prune(room) {
  const rows = await recent(room, CHAT_KEEP + 1);
  if (rows.length > CHAT_KEEP) await db.delete(messages).where(eq(messages.id, rows[rows.length - 1].id)).run();
}

export async function findDialog(me, peer) {
  const a = Math.min(me, peer), b = Math.max(me, peer);
  const list = await db.select().from(dialogs).where(eq(dialogs.a, a)).all();
  return list.find((d) => d.b === b) || null;
}

export async function touchDialog(me, peer, msg) {
  const a = Math.min(me, peer), b = Math.max(me, peer);
  const mine = me === a ? { readA: msg.id } : { readB: msg.id };
  const d = await findDialog(me, peer);
  const base = { lastId: msg.id, lastFrom: me, lastBody: msg.body.slice(0, 60), lastTs: msg.ts, ...mine };
  if (d) { await db.update(dialogs).set(base).where(eq(dialogs.id, d.id)).run(); return; }
  const all = await db.select().from(dialogs).all();
  let id = all.reduce((m, x) => Math.max(m, x.id), 0) + 1;
  for (let t = 0; t < 5; t++) {
    try { await db.insert(dialogs).values({ id, a, b, readA: 0, readB: 0, ...base }).run(); return; } catch (e) { id++; }
  }
}
