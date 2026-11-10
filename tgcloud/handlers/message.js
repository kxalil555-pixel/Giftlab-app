import { db, api } from 'sdk';
import { eq } from 'sdk/db';
import { users, settings, adminState } from '../schema.js';
import { WEBAPP_URL } from '../lib/config.js';
import { ensureUser, isAdmin, isSub, getChannel, R } from '../lib/game.js';
import { credit } from '../lib/pay.js';

const B_CH = '📢 Kanal ulash', B_BC = '📨 Xabar tarqatish', B_DEL = '🗑 Kanalni o‘chirish', B_X = '❌ Bekor qilish', B_SUB = '✅ Obuna bo‘ldim';
const kb = (rows) => ({ keyboard: rows.map((r) => r.map((text) => ({ text }))), resize_keyboard: true });
const say = (chat_id, text, reply_markup) => api.sendMessage({ chat_id, text, reply_markup, disable_web_page_preview: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getMode(id) { const r = await db.select().from(adminState).where(eq(adminState.id, id)).get(); return (r && r.mode) || ''; }
async function setMode(id, mode) {
  const r = await db.select().from(adminState).where(eq(adminState.id, id)).get();
  if (r) await db.update(adminState).set({ mode }).where(eq(adminState.id, id)).run();
  else await db.insert(adminState).values({ id, mode }).run();
}

async function adminMenu(chat, note) {
  const c = await getChannel();
  await say(chat, `${note ? note + '\n\n' : ''}🛠 Admin panel\nMajburiy kanal: ${c ? `${c.title} (${c.url})` : 'ulanmagan'}`, kb([[B_CH], [B_BC], ...(c ? [[B_DEL]] : [])]));
}

// "@nom", "t.me/nom", "https://t.me/nom" yoki -100... ID
const parseCh = (t) => {
  const s = t.trim().replace(/^https?:\/\//, '').replace(/^t\.me\//, '').replace(/^@/, '');
  if (/^-?\d{6,}$/.test(s)) return s;
  return /^[A-Za-z][A-Za-z0-9_]{3,}$/.test(s) ? '@' + s : null;
};

async function connect(chat, text) {
  const id = parseCh(text);
  if (!id) return say(chat, 'Noto‘g‘ri nom. Masalan: @kanal_nomi\n\nQayta yuboring yoki bekor qiling.');
  let info, me;
  try { info = R(await api.getChat({ chat_id: id })); me = R(await api.getMe()); }
  catch (e) { return say(chat, '❌ Kanal topilmadi. Nomni tekshiring va botni kanalga ADMIN qilib qo‘shing.'); }
  try {
    const m = R(await api.getChatMember({ chat_id: info.id, user_id: me.id }));
    if (!['administrator', 'creator'].includes(m.status)) throw new Error('not admin');
  } catch (e) { return say(chat, '❌ Bot kanalda admin emas. Botni kanalga administrator qilib qo‘shing va qayta yuboring.'); }
  let url = info.username ? 'https://t.me/' + info.username : '';
  if (!url) { try { url = R(await api.exportChatInviteLink({ chat_id: info.id })); } catch (e) {} }
  const row = { channel: String(info.id), url, title: info.title || String(id) };
  const old = await db.select().from(settings).where(eq(settings.id, 1)).get();
  if (old) await db.update(settings).set(row).where(eq(settings.id, 1)).run(); else await db.insert(settings).values({ id: 1, ...row }).run();
  await setMode(chat, '');
  return adminMenu(chat, `✅ Kanal ulandi: ${row.title}\nEndi hamma foydalanuvchi shu kanalga obuna bo‘lishi shart.`);
}

async function broadcast(adminId, msg) {
  await setMode(adminId, '');
  const all = await db.select().from(users).all();
  await say(adminId, `⏳ Yuborilmoqda: ${all.length} ta foydalanuvchi…`);
  let ok = 0, bad = 0;
  for (let i = 0; i < all.length; i += 25) {
    await Promise.all(all.slice(i, i + 25).map(async (u) => {
      try { await api.copyMessage({ chat_id: u.id, from_chat_id: msg.chat.id, message_id: msg.message_id }); ok++; } catch (e) { bad++; }
    }));
    if (i + 25 < all.length) await sleep(1100);
  }
  return adminMenu(adminId, `📨 Tarqatildi\n✅ Yetib bordi: ${ok}\n❌ Yetmadi: ${bad}`);
}

async function openApp(chat) {
  await say(chat, '✅ Rahmat! Obuna tasdiqlandi.', { remove_keyboard: true });
  await api.sendMessage({ chat_id: chat, text: '🎁 Sovg‘alarni yig‘ing, yaxshilang va noyob NFT oling!', reply_markup: { inline_keyboard: [[{ text: '🎮 O‘yinni ochish', web_app: { url: WEBAPP_URL } }]] } });
  try { await api.setChatMenuButton({ chat_id: chat, menu_button: { type: 'web_app', text: 'O‘yin', web_app: { url: WEBAPP_URL } } }); } catch (e) {}
}

export default async function (msg) {
  if (!msg.from || !msg.chat || msg.chat.type !== 'private') return;
  const uid = msg.from.id, text = (msg.text || '').trim();
  await ensureUser(msg.from);
  if (msg.successful_payment) return credit(msg);

  if (isAdmin(uid)) {
    if (/^\/admin(@\w+)?$/.test(text)) { await setMode(uid, ''); return adminMenu(uid); }
    if (text === B_X) { await setMode(uid, ''); return adminMenu(uid, 'Bekor qilindi.'); }
    if (text === B_CH) { await setMode(uid, 'ch'); return say(uid, '📢 Kanal username ini yuboring (masalan @kanal_nomi).\n\nBotni avval kanalga admin qilib qo‘shing.', kb([[B_X]])); }
    if (text === B_BC) { await setMode(uid, 'bc'); return say(uid, '📨 Tarqatiladigan xabarni yuboring (matn, rasm, video — istalgani).\n\nU barcha foydalanuvchilarga yuboriladi.', kb([[B_X]])); }
    if (text === B_DEL) { await db.delete(settings).where(eq(settings.id, 1)).run(); return adminMenu(uid, '🗑 Kanal o‘chirildi. Obuna talab qilinmaydi.'); }
    if (!text.startsWith('/')) {
      const mode = await getMode(uid);
      if (mode === 'ch' && text) return connect(uid, text);
      if (mode === 'bc') return broadcast(uid, msg);
    } else await setMode(uid, '');
  }

  if (!(/^\/start(@\w+)?(\s|$)/.test(text) || text === B_SUB)) return;
  if (!WEBAPP_URL) return say(uid, 'WEBAPP_URL hali yozilmagan (tgcloud/lib/config.js).');

  if (await isSub(uid)) return openApp(uid);
  const c = await getChannel();
  if (text === B_SUB) await say(uid, '❗️ Hali obuna bo‘lmagansiz. Avval kanalga obuna bo‘ling.');
  await api.sendMessage({ chat_id: uid, text: '📢 Botdan foydalanish uchun kanalimizga obuna bo‘ling:', reply_markup: { inline_keyboard: [[{ text: 'Kanalga o‘tish', url: c.url }]] } });
  return say(uid, 'Obuna bo‘lgach, pastdagi tugmani bosing 👇', kb([[B_SUB]]));
}
