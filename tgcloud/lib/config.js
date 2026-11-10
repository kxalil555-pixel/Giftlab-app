// Admin: Stars CHEKSIZ
export const ADMIN_IDS = [6792508834];

// Birinchi push dan keyin chiqqan Mini App manzili (oxirida /)
export const WEBAPP_URL = 'https://app9070748208.tgcloud.ai/';

// ---- Kolleksiyalar. open=false — sotuvda yo'q ("Tugadi"), lekin egalaridagi sovg'alar o'z holicha qoladi.
export const COLS = [
  { k: 0, name: 'Plush Pepe', supply: 3000, price: 500, open: true },
  { k: 1, name: 'Durov’s Cap', supply: 3000, price: 200, open: true },
  { k: 2, name: 'B-Day Candle', supply: 3000, price: 200, open: true },
  { k: 3, name: 'Desk Calendar', supply: 3000, price: 200, open: true },
  // <<GEN:COLS (tools/add_gifts.py shu yerga yozadi)
  { k: 4, name: "Heart Locket", supply: 1500, price: 400, open: true },
  { k: 5, name: "Algorithm Cup", supply: 200, price: 555, open: true },
  { k: 6, name: "Durov Skins", supply: 2000, price: 300, open: true },
  { k: 7, name: "Durov’s Glasses", supply: 5000, price: 1000, open: true },
  { k: 8, name: "Faith Amulet", supply: 5000, price: 1000, open: true },
  { k: 9, name: "Happy Brownie", supply: 6000, price: 1000, open: true },
  { k: 10, name: "Heels", supply: 6000, price: 1000, open: true },
  { k: 11, name: "Mood Pack", supply: 6000, price: 1000, open: true },
  { k: 12, name: "Papakha", supply: 6000, price: 1000, open: true },
  { k: 13, name: "West Side", supply: 6000, price: 1000, open: true },
  { k: 14, name: "Resistance Dog", supply: 10000, price: 5000, open: true },
// GEN:COLS>>
];
export const colOf = (k) => COLS.find((c) => c.k === (Number(k) || 0)) || COLS[0];
export const OPEN_KIND = (COLS.find((c) => c.open) || COLS[0]).k;
export const UPGRADE_PRICE = 25;   // upgrade narxi (⭐)
export const SELL_RATE = 0.86;     // oddiy sovg'ani Stars'ga almashtirish (narxning 86%)
export const START_STARS = 0;      // oddiy foydalanuvchi boshlang'ich balansi
// Bir martalik bonus: har bir foydalanuvchi (yangi ham, eski ham) botga/ilovaga kirganda BONUS_STARS oladi, mavjud balansga QO'SHILADI.
// Yana bir marta berish uchun BONUS_KEY ni o'zgartiring (masalan 'bonus2'). BONUS_STARS = 0 bo'lsa o'chadi.
export const BONUS_STARS = 100000;
export const BONUS_KEY = 'bonus1';

// ---- Chat
export const CHAT_MAX_LEN = 300;   // xabar uzunligi
export const CHAT_KEEP = 120;      // har bir xonada saqlanadigan oxirgi xabarlar soni
export const CHAT_LIST = 50;       // bir marta qaytariladigan xabarlar
export const CHAT_GAP_MS = 1500;   // ketma-ket xabar orasidagi eng kam vaqt

// ---- Yuklama: ro'yxatdan o'tgan foydalanuvchilar soni shu sondan oshsa, HAMMA uchun animatsiyalar avtomatik o'chadi.
// Ilova qotmasligi uchun. 0 qilsangiz bu funksiya o'chadi.
export const ANIM_MAX_USERS = 150;

export const MIN_PRICE = 70;       // bozordagi eng kam narx (⭐)
export const MARKET_CUT = 0.95;    // sotuvchi oladigan ulush

// ---- Majburiy obuna: kanal @username (yoki -100... ID). Bo'sh qoldirilsa obuna talab qilinmaydi.
// Bot kanalda ADMIN bo'lishi shart.
export const CHANNEL = '@upgredo';
export const CHANNEL_URL = '';   // maxfiy kanal bo'lsa taklif havolasi (https://t.me/+...)

// ---- Stars sotib olish (Telegram Stars -> ilovadagi Stars)
export const STAR_RATE = 50;     // 1 ta Telegram Star = 50 ta ilova Stars (10 000 Stars = 200 Telegram Stars)
export const TG_MIN = 20;        // eng kam to'lov (Telegram Stars) = 1 000 Stars
export const TG_MAX = 200;       // eng ko'p to'lov (Telegram Stars) = 10 000 Stars
// Ro'yxatdagi tayyor paketlar (ilova Stars). Narxi = paket / STAR_RATE (Telegram Stars)
export const STAR_PACKS = [1000, 5000, 7500, 10000];

// ---- Premium (ilovadagi Stars bilan sotib olinadi). m = oy, price = Stars
export const PREMIUM_PLANS = [
  { m: 3, price: 200 },
  { m: 6, price: 300 },
  { m: 12, price: 500 },
];
export const MONTH_MS = Math.round(30.4375 * 24 * 3600 * 1000);   // 12 oy = 365 kun
export const STATUS_COUNT = 14;       // miniapp/data/status.json dagi emoji-statuslar soni (Premium uchun)

// ---- Hikoyalar
export const STORY_TTL_MS = 24 * 3600 * 1000;   // hikoya 24 soat ko'rinadi
export const STORY_MAX_PER_USER = 10;           // bitta foydalanuvchining faol hikoyalari
export const STORY_TEXT_MAX = 200;
export const STORY_IMG_MAX = 260000;            // rasm (data URL) eng ko'pi bilan ~260 KB
export const STORY_BG_COUNT = 8;                // matnli hikoya fonlari soni (mijozda)
