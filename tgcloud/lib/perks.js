import { db } from 'sdk';
import { eq } from 'sdk/db';
import { perks, users, chatUsers } from '../schema.js';
import { STATUS_COUNT } from './config.js';

// Kam ID bo'lsa — har biri alohida (tez), ko'p bo'lsa — butun jadval bir marta
async function rowsFor(table, want) {
  try {
    if (want.size <= 25) return (await Promise.all([...want].map((id) => db.select().from(table).where(eq(table.id, id)).get()))).filter(Boolean);
    return (await db.select().from(table).all()).filter((r) => want.has(r.id));
  } catch (e) { return []; }
}

export const isPrem = (p) => !!p && p.until > Date.now();

export async function getPerk(id) {
  // Jadval hali yaratilmagan bo'lsa (migrate qilinmagan) ham asosiy ilova ishlashda davom etadi
  let r = null;
  try { r = await db.select().from(perks).where(eq(perks.id, Number(id))).get(); } catch (e) {}
  return r || { id: Number(id), until: 0, status: 0 };
}

// Premium va status ma'lumotini ID lar bo'yicha oladi: { id: { prem: 0|1, st: 0..N } }
// Premium tugagan bo'lsa status ham ko'rinmaydi.
export async function perkMap(ids) {
  const want = new Set(ids.map(Number).filter(Boolean));
  const out = {};
  if (!want.size) return out;
  for (const r of await rowsFor(perks, want)) out[r.id] = { prem: isPrem(r) ? 1 : 0, st: isPrem(r) && r.status > 0 && r.status <= STATUS_COUNT ? r.status : 0 };
  return out;
}
export const perkOf = (map, id) => map[id] || { prem: 0, st: 0 };

// Profil rasmlari (Telegram photo_url): users jadvalida — har so'rovda yangilanadi (ensureUser)
export async function photoMap(ids) {
  const want = new Set(ids.map(Number).filter(Boolean));
  const out = {};
  if (!want.size) return out;
  for (const r of await rowsFor(users, want)) if (r.photo) out[r.id] = r.photo;
  return out;
}

// Ism / username bo'yicha qidirish uchun
export async function allChatUsers() {
  try { return await db.select().from(chatUsers).all(); } catch (e) { return []; }
}
