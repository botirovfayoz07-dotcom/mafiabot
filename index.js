/*
 * ================= MAFIA BOT =================
 * Ishga tushirish:  npm install  →  .env.example ni .env ga nusxalab to'ldiring  →  npm start
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');

/* ======================= SOZLAMALAR ======================= */
const CONFIG = {
  BOT_TOKEN: 'BU_YERGA_BOT_TOKEN',
  MONGO_URI: 'mongodb://127.0.0.1:27017/mafia',
  ADMIN_IDS: [111111111],                       // adminlar Telegram ID lari
  OFFICIAL_GROUP_URL: 'https://t.me/your_group', // rasmiy guruh silkasi
  GIF_NIGHT: '', GIF_DAY: '', GIF_VOTE: '',     // GIF file_id (admin botga GIF yuborsa, bot file_id qaytaradi)
};
const env = (k, d) => process.env[k] || d;
const BOT_TOKEN = env('BOT_TOKEN', CONFIG.BOT_TOKEN);
const MONGO_URI = env('MONGO_URI', CONFIG.MONGO_URI);
const ADMINS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(s => +s.trim()).filter(Boolean) : CONFIG.ADMIN_IDS;
const OFFICIAL_GROUP = env('OFFICIAL_GROUP_URL', CONFIG.OFFICIAL_GROUP_URL);
const GIFS = { night: env('GIF_NIGHT', CONFIG.GIF_NIGHT), day: env('GIF_DAY', CONFIG.GIF_DAY), vote: env('GIF_VOTE', CONFIG.GIF_VOTE) };

const MIN_PLAYERS = 4, MAX_PLAYERS = 20;
const T = { reg: 90, night: 45, day: 45, vote: 20, confirm: 15, last: 30, kami: 15 }; // soniya
const PRICE = { shield: 50, docs: 80, activeRole: 5 }; // 🛡 💵, 📂 💵, 🎎 💎

/* ======================= MONGODB ======================= */
const User = mongoose.model('User', new mongoose.Schema({
  id: { type: Number, unique: true, index: true },
  name: String, username: String,
  money: { type: Number, default: 70 },
  gems: { type: Number, default: 0 },
  shield: { type: Number, default: 0 },
  docs: { type: Number, default: 0 },
  activeRole: { type: Number, default: 0 },
  pendingRole: { type: String, default: null },
  games: { type: Number, default: 0 },
  wins: { type: Number, default: 0 },
  winStreak: { type: Number, default: 0 },
  streakRoles: { type: [String], default: [] },
}, { timestamps: true }), 'mafia_users'); // alohida kolleksiya (boshqa loyiha indekslari bilan to'qnashmaydi)

/* ======================= ROLLAR ======================= */
const ROLES = {
  civilian: { n: '👨🏼 Tinch axoli', team: 'citizen', d: 'Siz - 👨🏼 Tinch axolisiz.\nSizning vazifangiz mafiani topish va ovoz berish jarayonida ularni osish.' },
  don: { n: '🤵🏻 Don', team: 'mafia', d: 'Siz- 🤵🏻 Donsiz (Mafia sardori)!\nBu tunda kim o\'lishini siz xal qilasiz...' },
  mafia: { n: '🤵🏼 Mafia', team: 'mafia', d: 'Siz - 🤵🏼 Mafiasiz!\nDonga bo\'ysunasiz va sizga qarshilik qilganlarni o\'ldirasiz. Don o\'lsa siz yangi Don bo\'lishingiz mumkin.' },
  commissar: { n: '🕵️ Komissar Katani', team: 'citizen', d: 'Siz- 🕵️ Komissar Katani!\nShaharning asosiy ximoyachisi va mafia kushandasi...\nHar tunda bitta odamni tekshirishingiz yoki otib tashlashingiz mumkin.' },
  sergeant: { n: '👮🏼‍♂️ Serjant', team: 'citizen', d: 'Siz- 👮🏼‍♂️ Serjantsiz!\nKomissar Katanining yordamchisi. U sizni o\'zining qilayotgan ishlaridan xabardor qilib turadi. Agar komissar o\'lsa uning o\'rnini siz egallaysiz.' },
  doctor: { n: '👨🏼‍⚕️ Shifokor', team: 'citizen', d: 'Siz- 👨🏼‍⚕️ Shifokorsiz!\nTunda kimnidir qutqarib qolishingiz mumkin... (O\'zingizni faqat bir marta davolay olasiz)' },
  killer: { n: '🔪 Qotil', team: 'solo', d: 'Siz- 🔪 Qotilsiz!\nShaxardagi xamma o\'lishi kerak, sizdan tashqari albatta :)' },
  lover: { n: '💃🏼 Ma\'shuqa', team: 'citizen', d: 'Siz- 💃🏼 Ma\'shuqasiz!\nBu shavqatsiz shaxarda tirik qolishingiz kerak. Bir kun davomida har qanday shaxsni zararsizlantirish uchun o\'z maxoratingizni ko\'rsating :)\n(Tanlangan odam tunda harakat qila olmaydi va ertasi kuni ovoz bera olmaydi.)' },
  lawyer: { n: '👨🏼‍💼 Advokat', team: 'mafia', d: 'Siz- 👨🏼‍💼 Advokatsiz!\nTunda kimni ximoya qilishni tanlaysiz. Agar siz mafiani tanlasangiz, 🕵️ Komissar Katani uni taniy olmaydi va unga 👨🏼 Tinch axoli bo\'lib ko\'rinadi. Siz mafia tarafdasiz.' },
  suicide: { n: '🤦🏼‍♂️ Suidsid', team: 'solo', d: 'Sen 🤦🏼‍♂️ Suidsidsan!\nMaqsading — shahar seni kunduzgi yig\'ilishda osishi. Lekin buni so\'rama: tan olishga hech kim ishonmaydi, tinch aholiga seni osish foydali emas. Shubhali tut, lekin me\'yorida — mafiya deb o\'ylashsin.' },
  wanderer: { n: '🧙🏼‍♂️ Daydi', team: 'citizen', d: 'Siz- 🧙🏼‍♂️ Daydisiz!\nSiz xoxlagan odamning uyiga shisha olish uchun borishingiz va qotillikning guvohi bo\'lib qolishingiz mumkin.' },
  lucky: { n: '🤞 Omadli', team: 'citizen', d: 'Siz - 🤞 Omadli.\nSizning vazifangiz mafia va yovuzlarni shahar yig\'ilishida osish. Agar omadingiz kelsa, siz omon qolasiz. (Hujumda omon qolish ehtimoli 50%)' },
  kamikaze: { n: '💣 Kamikaze', team: 'citizen', d: 'Siz - 💣 Kamikaze!\nTun va Kunda siz tinch axolisiz, ammo sizni osishganda, siz xohlagan o\'yinchini o\'zingiz bilan qabrga olib ketishingiz mumkin' },
  journalist: { n: '📰 Jurnalist', team: 'citizen', d: 'Siz- 📰 Jurnalistsiz!\nSensatsiyalar o\'z-o\'zidan yozilmaydi. Tunda ikki fuqaroni tanlang: manbalaringiz ular bir qayiqdami yoki turli qayiqdami — shivirlab aytadi. Manbalar ism va rollarni aytmaydi — g\'oya uchun ishlaydi.' },
  bodyguard: { n: '🛡 Tansoqchi', team: 'citizen', d: 'Siz — 🛡 Tansoqchi.\nIsh oddiy: mijoz bilan o\'q orasida turish. Maoshi kam, lekin halol. (Mijozingizga hujum bo\'lsa, uning o\'rniga siz o\'lasiz.)' },
  mayor: { n: '🏛 Mer', team: 'citizen', d: '🏛 Mer — ma\'muriy ta\'sirga ega oddiy aholi: kunduzgi ovoz berishda uning ovozi ikki ovoz sifatida hisoblanadi.' },
};
const ROLE_ORDER = Object.keys(ROLES);
const ROLE_ACT = { don: 'kill', mafia: 'sug', lawyer: 'law', doctor: 'heal', killer: 'ckill', lover: 'love', journalist: 'j1', wanderer: 'wander', bodyguard: 'guard' };
const ACT_ANN = {
  kill: '🤵🏻 <b>Mafia</b> qurbonni tanladi...', law: '👨🏼‍💼 <b>Advokat</b> mijozini himoya qilishga ketdi...',
  chk: '🕵️ <b>Komissar Katani</b> hujjatlarni tekshirishga ketdi...', shoot: '🕵️ <b>Komissar Katani</b> qurolini o\'qlab, ov izlab ketdi...',
  heal: '👨🏼‍⚕️ <b>Shifokor</b> kimnidir qutqarishga shoshildi...', ckill: '🔪 <b>Qotil</b> ovga chiqdi...',
  love: '💃🏼 <b>Ma\'shuqa</b> kimnidir mehmonga chaqirdi...', j: '📰 <b>Jurnalist</b> manbalar bilan uchrashishga ketdi...',
  wander: '🧙🏼‍♂️ <b>Daydi</b> shisha yig\'ish uchun ko\'chaga chiqdi...', guard: '🛡 <b>Tansoqchi</b> mijozini qo\'riqlashga ketdi...',
};
const PROMPT = {
  kill: '🤵🏻 Don, bu tun kimni o\'ldiramiz?', sug: '🤵🏼 Mafia, Donga kimni tavsiya qilasiz?', law: '👨🏼‍💼 Kimni himoya qilasiz?',
  heal: '👨🏼‍⚕️ Kimni davolaysiz?', ckill: '🔪 Kimni o\'ldirasiz?', love: '💃🏼 Kimni zararsizlantirasiz?',
  j1: '📰 Birinchi fuqaroni tanlang:', j2: '📰 Ikkinchi fuqaroni tanlang:', wander: '🧙🏼‍♂️ Kimning uyiga borasiz?',
  guard: '🛡 Kimni qo\'riqlaysiz?', chk: '🔍 Kimni tekshirasiz?', shoot: '🔫 Kimni otasiz?',
};
const KILL_BY = { mafia: '🤵🏻 Mafia', killer: '🔪 Qotil', commissar: '🕵️ Komissar Katani' };

/* ======================= YORDAMCHILAR ======================= */
const bot = new Telegraf(BOT_TOKEN);
let BOT_USER = '';
const games = new Map();      // chatId -> Game
const userGame = new Map();   // userId -> chatId
const adminState = new Map(); // adminId -> {mode}

const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
const kb = rows => ({ inline_keyboard: rows });
const btn = (text, data) => ({ text, callback_data: data });
const ubtn = (text, url) => ({ text, url });
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const sleepMs = ms => new Promise(r => setTimeout(r, ms));
const mm = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const link = p => `<a href="tg://user?id=${p.id}">${esc(p.name)}</a>`;
const isAdmin = id => ADMINS.includes(id);

const send = (chat, text, extra = {}) =>
  bot.telegram.sendMessage(chat, text, { parse_mode: 'HTML', disable_web_page_preview: true, ...extra }).catch(e => { console.error('send:', e.message); return null; });
const dm = send;
const gifCache = {};
async function gif(chat, key, caption) {
  const opt = { caption, parse_mode: 'HTML' };
  try {
    const ready = GIFS[key] || gifCache[key];
    if (ready) return await bot.telegram.sendAnimation(chat, ready, opt);
    const file = path.join(__dirname, 'gifs', `${key}.gif`);
    if (fs.existsSync(file)) {
      const m = await bot.telegram.sendAnimation(chat, { source: fs.createReadStream(file) }, opt);
      if (m?.animation?.file_id) gifCache[key] = m.animation.file_id; // keyingi safar tez yuboriladi
      return m;
    }
  } catch (e) { console.error('gif:', e.message); }
  return send(chat, caption);
}
const fullName = u => [u.first_name, u.last_name].filter(Boolean).join(' ') || 'Noma\'lum';
const ensureUser = u => User.findOneAndUpdate({ id: u.id }, { $set: { name: fullName(u), username: u.username || null } }, { upsert: true, new: true, setDefaultsOnInsert: true });

/* ======================= O'YIN SINFI ======================= */
class Game {
  constructor(chatId, title) {
    this.chatId = chatId; this.title = title;
    this.players = new Map(); this.started = false; this.stopped = false;
    this.phase = 'reg'; this.round = 0; this.regMsg = null; this.regEnd = 0; this.extended = 0;
    this.acts = new Map(); this.jtmp = new Map(); this.votes = new Map(); this.blockedDay = new Set();
    this.lw = null; this.kami = null; this.confirm = null;
  }
  sleep(ms) { return new Promise(r => { this._r = r; this._t = setTimeout(() => { this._r = null; r(); }, ms); }); }
  wake() { clearTimeout(this._t); const r = this._r; this._r = null; if (r) r(); }
  stop() { this.stopped = true; clearInterval(this.regTimer); this.wake(); }
}
const alive = g => [...g.players.values()].filter(p => p.alive);
const ofRole = (g, role) => alive(g).filter(p => p.role === role);
const isMafia = p => ROLES[p.role].team === 'mafia';

function cleanup(g) {
  g.stop();
  for (const id of g.players.keys()) if (userGame.get(id) === g.chatId) userGame.delete(id);
  games.delete(g.chatId);
}

/* ======================= REGISTRATSIYA ======================= */
function regText(g) {
  const list = g.players.size
    ? [...g.players.values()].map((p, i) => `┃ <b>${i + 1}.</b> 👤 ${link(p)}`).join('\n')
    : '<i>Hozircha hech kim yo\'q...</i>';
  const left = Math.max(0, Math.ceil((g.regEnd - Date.now()) / 1000));
  return `🎭 <b>MAFIA — yangi o'yin!</b>\n━━━━━━━━━━━━━━━━━━\n\n👥 <b>O'yinchilar (${g.players.size}/${MAX_PLAYERS}):</b>\n${list}\n\n⏳ <b>Qolgan vaqt:</b> ${mm(left)}\n📌 Boshlash uchun kamida <b>${MIN_PLAYERS}</b> ta o'yinchi kerak.\n\n👇 Qo'shilish uchun tugmani bosing va botda <b>START</b> ni bosing.`;
}
const regKb = g => kb([[ubtn('🙋‍♂️ Qo\'shilish', `https://t.me/${BOT_USER}?start=join_${g.chatId}`)]]);
async function refreshReg(g) {
  if (!g.regMsg || g.started) return;
  try { await bot.telegram.editMessageText(g.chatId, g.regMsg, undefined, regText(g), { parse_mode: 'HTML', reply_markup: regKb(g) }); } catch (e) { /* o'zgarmagan */ }
}
async function openRegistration(ctx) {
  const chatId = ctx.chat.id;
  if (games.has(chatId)) return ctx.reply('⚠️ Bu guruhda o\'yin allaqachon bor.');
  const g = new Game(chatId, ctx.chat.title);
  g.regEnd = Date.now() + T.reg * 1000;
  games.set(chatId, g);
  const m = await send(chatId, regText(g), { reply_markup: regKb(g) });
  g.regMsg = m?.message_id;
  g.regTimer = setInterval(() => {
    if (Date.now() >= g.regEnd) { clearInterval(g.regTimer); beginGame(g); } else refreshReg(g);
  }, 5000);
}

async function joinGame(ctx, chatId) {
  const g = games.get(chatId), uid = ctx.from.id;
  if (!g || g.started) return ctx.reply('❌ Bu guruhda hozir ro\'yxatdan o\'tish ochiq emas.');
  if (userGame.has(uid) && userGame.get(uid) !== chatId) return ctx.reply('⚠️ Siz boshqa o\'yindasiz.');
  if (g.players.has(uid)) return ctx.reply('✅ Siz allaqachon ro\'yxatdasiz.');
  if (g.players.size >= MAX_PLAYERS) return ctx.reply('❌ O\'yin to\'lgan.');
  await ensureUser(ctx.from);
  g.players.set(uid, { id: uid, name: fullName(ctx.from), role: null, alive: true, left: false });
  userGame.set(uid, chatId);
  await ctx.reply(`✅ Siz <b>${esc(g.title)}</b> guruhidagi o'yinga qo'shildingiz!\nO'yin boshlanishini kuting.`, { parse_mode: 'HTML' });
  refreshReg(g);
}

/* ======================= ROL TAQSIMOTI ======================= */
function buildRoles(n) {
  const mafN = Math.max(1, Math.floor(n / 3)), civN = Math.max(1, Math.floor(n / 4));
  const mafPool = ['don', 'mafia', 'lawyer', 'mafia', 'mafia', 'mafia', 'mafia'];
  const spec = ['commissar', 'doctor', 'sergeant', 'lover', 'journalist', 'killer', 'lucky', 'bodyguard', 'wanderer', 'suicide', 'kamikaze', 'mayor'];
  const roles = mafPool.slice(0, mafN);
  for (let i = 0; i < n - mafN - civN; i++) roles.push(spec[i]);
  while (roles.length < n) roles.push('civilian');
  return shuffle(roles);
}

async function beginGame(g) {
  if (g.started || g.stopped) return;
  clearInterval(g.regTimer);
  if (g.players.size < MIN_PLAYERS) {
    try { await bot.telegram.deleteMessage(g.chatId, g.regMsg); } catch (e) {}
    await send(g.chatId, '😕 <b>O\'yin bekor qilindi</b> — o\'yinchilar yetarli emas.');
    return cleanup(g);
  }
  g.started = true; g.phase = 'start';
  try { await bot.telegram.deleteMessage(g.chatId, g.regMsg); } catch (e) {}
  await send(g.chatId, '🎮 <b>O\'yin boshlandi!</b>\n\nBir necha soniya ichida bot sizga rol va uning tavsifi bilan shaxsiy xabar yuboradi.',
    { reply_markup: kb([[ubtn('🎭 Sizning rolingiz', `https://t.me/${BOT_USER}`)]]) });

  const ps = shuffle([...g.players.values()]);
  const roles = buildRoles(ps.length);
  ps.forEach((p, i) => { p.role = roles[i]; });

  // Foydalanuvchi imkoniyatlari: himoya, hujjat, faol rol
  for (const p of ps) {
    const u = await User.findOne({ id: p.id });
    p.items = [];
    if (!u) continue;
    if (u.shield > 0) { p.shield = true; p.items.push('🛡 Himoya (birinchi hujumdan saqlaydi)'); }
    if (u.docs > 0) { p.docs = true; p.items.push('📂 Hujjatlar (komissar sizni tinch aholi deb biladi)'); }
    const upd = {};
    if (u.shield > 0) upd.shield = u.shield - 1;
    if (u.docs > 0) upd.docs = u.docs - 1;
    if (u.activeRole > 0 && u.pendingRole && p.role !== u.pendingRole) {
      const holder = ps.find(x => x.role === u.pendingRole && !x.forced);
      if (holder) { holder.role = p.role; p.role = u.pendingRole; p.forced = true; upd.activeRole = u.activeRole - 1; upd.pendingRole = null; p.items.push('🎎 Faol rol ishlatildi'); }
    }
    if (Object.keys(upd).length) await User.updateOne({ id: p.id }, { $set: upd });
  }
  for (const p of ps) { if (p.role === 'doctor') p.selfHealed = false; }

  const mafTeam = ps.filter(isMafia);
  await Promise.allSettled(ps.map(p => {
    let t = `🎭 <b>Sizning rolingiz:</b> ${ROLES[p.role].n}\n\n${ROLES[p.role].d}`;
    if (isMafia(p)) t += `\n\n🤵🏻 <b>Mafia jamoasi:</b>\n` + mafTeam.map(x => `• ${esc(x.name)} — ${ROLES[x.role].n}`).join('\n');
    if (p.items.length) t += `\n\n🎒 <b>Faollashgan imkoniyatlar:</b>\n` + p.items.join('\n');
    return dm(p.id, t);
  }));
  await sleepMs(4000);
  runGame(g);
}

/* ======================= O'YIN SIKLI ======================= */
async function runGame(g) {
  try {
    while (!g.stopped) {
      await nightPhase(g); if (g.stopped || await finishIfWon(g)) break;
      await morning(g); if (g.stopped || await finishIfWon(g)) break;
      await dayPhase(g); if (g.stopped) break;
      await votePhase(g); if (g.stopped || await finishIfWon(g)) break;
    }
  } catch (e) {
    console.error('runGame:', e);
    await send(g.chatId, '⚠️ Xatolik yuz berdi, o\'yin to\'xtatildi.');
    cleanup(g);
  }
}

const aliveList = g => alive(g).map((p, i) => `${i + 1}. ${link(p)}`).join('\n');

/* ---------- TUN ---------- */
function promote(g) {
  if (!ofRole(g, 'don').length) {
    const m = ofRole(g, 'mafia')[0];
    if (m) { m.role = 'don'; dm(m.id, '🤵🏻 Don o\'ldi! Endi <b>siz yangi Donsiz</b>.'); }
  }
  if (!ofRole(g, 'commissar').length) {
    const s = ofRole(g, 'sergeant')[0];
    if (s) { s.role = 'commissar'; dm(s.id, '🕵️ Komissar o\'ldi! Endi <b>siz Komissar Katanisiz</b>.'); }
  }
}
const targetsFor = (g, p, type) => {
  const al = alive(g);
  switch (type) {
    case 'kill': case 'sug': return al.filter(x => !isMafia(x));
    case 'law': return al.filter(isMafia);
    case 'heal': return al.filter(x => x.id !== p.id || !p.selfHealed);
    case 'j1': return al.filter(x => x.id !== p.id);
    case 'j2': return al.filter(x => x.id !== p.id && x.id !== g.jtmp.get(p.id));
    default: return al.filter(x => x.id !== p.id);
  }
};
const targetsKb = (g, p, type) => kb(targetsFor(g, p, type).map(x => [btn(`👤 ${x.name}`, `n:${g.chatId}:${type}:${x.id}`)]));

async function sendNightMenu(g, p) {
  if (p.role === 'commissar')
    return dm(p.id, '🕵️ Komissar, bu tun nima qilasiz?', { reply_markup: kb([[btn('🔍 Tekshirish', `c:${g.chatId}:chk`), btn('🔫 Otish', `c:${g.chatId}:shoot`)]]) });
  const t = ROLE_ACT[p.role]; if (!t) return;
  return dm(p.id, `🌙 <b>${g.round}-tun</b>\n${PROMPT[t]}`, { reply_markup: targetsKb(g, p, t) });
}

async function nightPhase(g) {
  g.phase = 'night'; g.round++; g.acts = new Map(); g.jtmp = new Map(); g.blockedDay = new Set();
  promote(g);
  g.needed = new Set(alive(g).filter(p => ROLE_ACT[p.role] && p.role !== 'mafia').map(p => p.id));
  await gif(g.chatId, 'night', `🌙 <b>${g.round}-TUN</b>\n━━━━━━━━━━━━━━━━━━\nShahar uyquga ketdi... Ko'chalarda faqat maxsus rollar yuribdi.\n\n⏳ <b>${T.night} soniya</b>`);
  await send(g.chatId, `👥 <b>Tirik o'yinchilar (${alive(g).length}):</b>\n${aliveList(g)}`);
  await Promise.allSettled(alive(g).map(p => sendNightMenu(g, p)));
  if (g.needed.size) await g.sleep(T.night * 1000); else await g.sleep(T.night * 1000 / 3);
  if (g.stopped) return;
  g.phase = 'resolving';
  await resolveNight(g);
}

function nightDoneCheck(g) { if ([...g.needed].every(id => g.acts.has(id) || !g.players.get(id)?.alive)) g.wake(); }

const teamOf = p => (isMafia(p) ? 'mafia' : ROLES[p.role].team === 'solo' ? p.role : 'citizen');

async function resolveNight(g) {
  const P = id => g.players.get(id);
  const acts = g.acts;
  // 1) Ma'shuqa
  const blocked = new Set();
  for (const [aid, a] of acts) if (a.type === 'love' && P(aid).alive) blocked.add(a.t);
  for (const id of blocked) {
    if (P(id)?.alive) { acts.delete(id); dm(id, '💃🏼 Ma\'shuqa sizni o\'ziga olib qoldi — bu tun hech narsa qila olmadingiz va ertaga ovoz bera olmaysiz.'); }
  }
  g.blockedDay = blocked;
  const lawProt = new Set([...acts.values()].filter(a => a.type === 'law').map(a => a.t));

  // 2) Hujumlar
  const attacks = [];
  const don = ofRole(g, 'don')[0];
  let ka = don && acts.get(don.id)?.type === 'kill' ? acts.get(don.id) : null;
  if (!ka) for (const [aid, a] of acts) if (a.type === 'sug') ka = a;
  if (ka) attacks.push({ t: ka.t, by: 'mafia' });
  for (const [aid, a] of acts) {
    if (a.type === 'ckill') attacks.push({ t: a.t, by: 'killer' });
    if (a.type === 'shoot') attacks.push({ t: a.t, by: 'commissar' });
  }
  const guards = [...acts].filter(([id, a]) => a.type === 'guard' && P(id).alive).map(([id, a]) => ({ bg: id, t: a.t, used: false }));
  const healed = new Set([...acts].filter(([id, a]) => a.type === 'heal' && P(id).alive).map(([id, a]) => a.t));
  const deaths = new Map();
  const addDeath = (id, by) => { if (!deaths.has(id)) deaths.set(id, new Set()); deaths.get(id).add(by); };

  for (const at of attacks) {
    const v = P(at.t); if (!v || !v.alive) continue;
    const gd = guards.find(x => x.t === at.t && !x.used);
    if (gd) { gd.used = true; addDeath(gd.bg, at.by); dm(at.t, '🛡 Tansoqchi sizni himoya qilib, o\'z jonini fido qildi!'); continue; }
    if (healed.has(at.t)) { dm(at.t, '👨🏼‍⚕️ Shifokor sizni o\'limdan qutqardi!'); continue; }
    if (v.role === 'lucky' && Math.random() < 0.5) { dm(at.t, '🤞 Omadingiz keldi — hujumdan omon qoldingiz!'); continue; }
    if (v.shield) { v.shield = false; dm(at.t, '🛡 Himoyangiz sizni o\'limdan saqladi!'); continue; }
    addDeath(at.t, at.by);
  }
  for (const [id, by] of deaths) { const p = P(id); p.alive = false; p.deathBy = [...by]; p.deathType = 'night'; }
  g.nightDeaths = [...deaths.keys()];

  // 3) Axborot rollari
  for (const [aid, a] of acts) {
    const me = P(aid);
    if (a.type === 'chk') {
      const t = P(a.t);
      let res;
      if (t.role === 'killer') res = '🔪 Qotil';
      else if (isMafia(t) && !lawProt.has(t.id) && !t.docs) res = '🤵🏻 Mafia';
      else res = '👨🏼 Tinch axoli';
      dm(aid, `🔍 Tekshiruv natijasi: <b>${esc(t.name)}</b> — ${res}`);
      ofRole(g, 'sergeant').forEach(s => dm(s.id, `🕵️ Komissar bu tun <b>${esc(t.name)}</b> ni tekshirdi.`));
    }
    if (a.type === 'shoot') ofRole(g, 'sergeant').forEach(s => dm(s.id, `🕵️ Komissar bu tun <b>${esc(P(a.t).name)}</b> ni otdi.`));
    if (a.type === 'j') {
      const same = teamOf(P(a.t)) === teamOf(P(a.t2));
      dm(aid, `📰 Manbalar shivirladi: <b>${esc(P(a.t).name)}</b> va <b>${esc(P(a.t2).name)}</b> — ${same ? '🛶 <b>bir qayiqda</b>' : '🚣 <b>turli qayiqda</b>'}.`);
    }
    if (a.type === 'wander') {
      const vis = [...acts].filter(([id, x]) => id !== aid && !['sug', 'wander'].includes(x.type) && (x.t === a.t || x.t2 === a.t)).map(([id]) => P(id).name);
      dm(aid, `🧙🏼‍♂️ Siz <b>${esc(P(a.t).name)}</b> uyi oldida shisha terdingiz.\n` + (vis.length ? `U yerga kelganlar: <b>${vis.map(esc).join(', ')}</b>` : 'Hech kimni ko\'rmadingiz.'));
    }
    if (a.type === 'heal') dm(aid, `👨🏼‍⚕️ Siz bu tun <b>${esc(P(a.t).name)}</b> ni kuzatdingiz.`);
  }
}

/* ---------- TONG ---------- */
async function morning(g) {
  g.phase = 'morning';
  const ds = (g.nightDeaths || []).map(id => g.players.get(id));
  let t = `🌅 <b>${g.round}-TONG OTDI</b>\n\n`;
  if (!ds.length) t += '🕊 Bu tun hech kim o\'lmadi. Shahar tinch uyg\'ondi.';
  else {
    t += `☠️ <b>QURBONLAR RO'YXATI</b>\n━━━━━━━━━━━━━━━━━━\n`;
    ds.forEach((p, i) => {
      const by = (p.deathBy || []).map(b => KILL_BY[b]).join(' + ');
      t += `\n🩸 <b>${i + 1}.</b> ${link(p)} — ${ROLES[p.role].n}\n      ╰ ⚰️ <i>${by} tomonidan o'ldirildi</i>\n`;
    });
    t += '\n━━━━━━━━━━━━━━━━━━';
  }
  await send(g.chatId, t);
  for (const p of ds) { await lastWords(g, p); if (g.stopped) return; }
}

async function lastWords(g, p) {
  if (p.left) return send(g.chatId, `🤐 <b>${esc(p.name)}</b> o'yindan chiqib ketgan — <i>oxirgi so'z yozilmadi.</i>`);
  g.phase = 'last'; g.lw = { id: p.id, text: null };
  await send(g.chatId, `🕯 <b>${esc(p.name)}</b> oxirgi so'zini aytishi mumkin... (${T.last} soniya)\n<i>Xabarni shu guruhga yozing.</i>`);
  await g.sleep(T.last * 1000);
  const txt = g.lw?.text; g.lw = null;
  if (g.stopped) return;
  if (txt) await send(g.chatId, `📣 <b>O'limidan oldin kimdir (${esc(p.name)}) qichqirganini eshitdi:</b>\n\n❝ <i>${esc(txt)}</i> ❞\n\n<i>— Rahmat, ey ${esc(p.name)}... Uning joni jannatda bo'lsin.</i> 🕯`);
  else await send(g.chatId, `🤐 <b>${esc(p.name)}</b> — <i>oxirgi so'z yozilmadi.</i>`);
}

/* ---------- KUN ---------- */
async function dayPhase(g) {
  g.phase = 'day';
  await gif(g.chatId, 'day', `☀️ <b>${g.round}-KUN</b>\n━━━━━━━━━━━━━━━━━━\nMuhokama vaqti! Kim mafia? Ayblang, himoya qiling.\n\n⏳ <b>${T.day} soniya</b>`);
  await send(g.chatId, `👥 <b>Tirik o'yinchilar (${alive(g).length}):</b>\n${aliveList(g)}`);
  await g.sleep(T.day * 1000);
}

/* ---------- OVOZ BERISH ---------- */
async function votePhase(g) {
  g.phase = 'vote'; g.votes = new Map();
  const voters = alive(g).filter(p => !g.blockedDay.has(p.id));
  await gif(g.chatId, 'vote', `🗳 <b>OVOZ BERISH</b>\n━━━━━━━━━━━━━━━━━━\nKimni osamiz? Ovozni <b>bot ichida</b> tanlang.\n\n⏳ <b>${T.vote} soniya</b>`);
  await send(g.chatId, '👇 Ovoz berish uchun botga o\'ting', { reply_markup: kb([[ubtn('🗳 Botga o\'tish', `https://t.me/${BOT_USER}`)]]) });
  await Promise.allSettled(voters.map(p => dm(p.id, '🗳 <b>Kimni osamiz?</b>', {
    reply_markup: kb([...alive(g).filter(x => x.id !== p.id).map(x => [btn(`👤 ${x.name}`, `v:${g.chatId}:${x.id}`)]), [btn('⏭ Hech kimga', `v:${g.chatId}:0`)]]),
  })));
  g.voters = new Set(voters.map(p => p.id));
  await g.sleep(T.vote * 1000);
  if (g.stopped) return;

  const tally = new Map();
  for (const [v, t] of g.votes) if (t) tally.set(t, (tally.get(t) || 0) + (g.players.get(v).role === 'mayor' ? 2 : 1));
  if (!tally.size) return send(g.chatId, '🤷 Hech kim ovoz bermadi. Bugun hech kim osilmaydi.');
  const sorted = [...tally].sort((a, b) => b[1] - a[1]);
  await send(g.chatId, `📊 <b>Ovoz natijalari:</b>\n` + sorted.map(([id, n]) => `▫️ ${esc(g.players.get(id).name)} — <b>${n}</b>`).join('\n'));
  if (sorted.length > 1 && sorted[0][1] === sorted[1][1]) return send(g.chatId, '⚖️ Ovozlar teng bo\'lindi. Hech kim osilmadi.');
  await confirmHang(g, g.players.get(sorted[0][0]));
}

async function confirmHang(g, target) {
  g.phase = 'confirm'; g.confirm = { target: target.id, yes: new Set(), no: new Set() };
  const kbd = () => kb([[btn(`👍 ${g.confirm.yes.size}`, `h:${g.chatId}:y`), btn(`👎 ${g.confirm.no.size}`, `h:${g.chatId}:n`)]]);
  g.confirm.kbd = kbd;
  await send(g.chatId, `⚖️ <b>Rostdan ham ${esc(target.name)} ni osmoqchimisiz?</b>\n\n⏳ ${T.confirm} soniya`, { reply_markup: kbd() });
  await g.sleep(T.confirm * 1000);
  if (g.stopped) return;
  const y = g.confirm.yes.size, n = g.confirm.no.size; g.confirm = null;
  if (y > n) {
    target.alive = false; target.deathType = 'hang'; target.hanged = true;
    await send(g.chatId, `🪢 <b>${esc(target.name)} osildi!</b> (👍 ${y} / 👎 ${n})\n\nU — ${ROLES[target.role].n} edi.`);
    if (target.role === 'suicide') { await endGame(g, 'suicide'); return; }
    if (target.role === 'kamikaze') await kamikaze(g, target);
  } else {
    await send(g.chatId, `🕊 <b>Kelisholmadilar.</b> (👍 ${y} / 👎 ${n})\nHech kim osilmadi.`);
  }
}

async function kamikaze(g, k) {
  const list = alive(g);
  if (!list.length) return;
  g.phase = 'kami'; g.kami = { id: k.id, done: false };
  await dm(k.id, `💣 <b>Siz osildingiz!</b> O'zingiz bilan kimni olib ketasiz? (${T.kami} soniya)`, { reply_markup: kb(list.map(x => [btn(`👤 ${x.name}`, `k:${g.chatId}:${x.id}`)])) });
  await send(g.chatId, '💣 Kamikaze o\'zi bilan kimnidir olib ketishga tayyorlanmoqda...');
  await g.sleep(T.kami * 1000);
  if (!g.kami?.done) await send(g.chatId, '💨 Kamikaze ulgurmadi — hech kim o\'lmadi.');
  g.kami = null;
}

/* ---------- G'ALABA ---------- */
function checkWin(g) {
  const al = alive(g), M = al.filter(isMafia).length, K = al.filter(p => p.role === 'killer').length, O = al.length - M - K;
  if (!M && !K) return 'citizen';
  if (!K && M >= O) return 'mafia';
  if (!M && K && O <= 1) return 'killer';
  if (M && K && !O) return 'mafia';
  return null;
}
async function finishIfWon(g) { const w = checkWin(g); if (!w) return false; await endGame(g, w); return true; }

async function endGame(g, win) {
  g.stopped = true; clearInterval(g.regTimer);
  const title = { citizen: '👨🏼 <b>TINCH AHOLI G\'ALABA QILDI!</b>', mafia: '🤵🏻 <b>MAFIA G\'ALABA QILDI!</b>', killer: '🔪 <b>QOTIL YOLG\'IZ G\'ALABA QILDI!</b>', suicide: '🤦🏼‍♂️ <b>SUIDSID MAQSADIGA ERISHDI!</b>' }[win];
  const all = [...g.players.values()];
  const winners = all.filter(p => !p.left && (win === 'citizen' ? ROLES[p.role].team === 'citizen' : win === 'mafia' ? isMafia(p) : win === 'killer' ? p.role === 'killer' : p.role === 'suicide' && p.hanged));
  const wIds = new Set(winners.map(p => p.id));
  let t = `🏁 <b>O'YIN TUGADI!</b>\n━━━━━━━━━━━━━━━━━━\n${title}\n\n👥 <b>O'yinchilar:</b>\n`;
  t += all.map(p => `${wIds.has(p.id) ? '🏆' : (p.alive ? '🙂' : '💀')} ${esc(p.name)} — ${ROLES[p.role].n}`).join('\n');
  await send(g.chatId, t);

  // Statistika
  const notify = [];
  for (const p of all) {
    if (wIds.has(p.id)) {
      const u = await User.findOneAndUpdate({ id: p.id }, { $inc: { games: 1, wins: 1, winStreak: 1 }, $push: { streakRoles: p.role } }, { new: true });
      if (u && u.winStreak >= 2) notify.push(u);
    } else await User.updateOne({ id: p.id }, { $inc: { games: 1 }, $set: { winStreak: 0, streakRoles: [] } });
  }
  for (const u of notify) {
    const msg = `🏆 <b>${esc(u.name)}</b> (<code>${u.id}</code>) ketma-ket <b>${u.winStreak}</b> marta yutdi!\nRollar: ${u.streakRoles.map(r => ROLES[r].n).join(' ➜ ')}`;
    for (const a of ADMINS) dm(a, msg);
  }
  cleanup(g);
}

/* ======================= BOT: PRIVATE ======================= */
const welcomeKb = () => kb([
  [ubtn('➕ Guruhga qo\'shish', `https://t.me/${BOT_USER}?startgroup=true`)],
  [ubtn('🏛 Rasmiy guruh', OFFICIAL_GROUP)],
  [btn('👤 Profil', 'profile'), btn('🎭 Rollar', 'roles')],
]);
const WELCOME = 'Salom!\nMen 🤵🏻Mafia o\'yinining rasmiy botiman.';

bot.start(async ctx => {
  if (ctx.chat.type !== 'private') return ctx.reply('🎭 O\'yinni boshlash: /game');
  await ensureUser(ctx.from);
  const pl = ctx.startPayload || '';
  if (pl.startsWith('join_')) return joinGame(ctx, +pl.slice(5));
  return ctx.reply(WELCOME, { reply_markup: welcomeKb() });
});

async function profileView(uid) {
  const u = await User.findOne({ id: uid });
  const text = `👤 <b>${esc(u.name)}</b>\n\n💵 Pullar: <b>${u.money}</b>\n💎 Toshlar: <b>${u.gems}</b>\n\n🛡 Ximoya: <b>${u.shield}</b>\n📂 Hujjatlar: <b>${u.docs}</b>\n🎎 Faol rol: <b>${u.activeRole}</b>${u.pendingRole ? ` (${ROLES[u.pendingRole].n})` : ''}\n\n🎮 O'yinlar: ${u.games} | 🏆 G'alabalar: ${u.wins}`;
  const markup = kb([
    [btn(`🛡 Ximoya — ${PRICE.shield}💵`, 'buy:shield')],
    [btn(`📂 Hujjat — ${PRICE.docs}💵`, 'buy:docs')],
    [btn(`🎎 Faol rol — ${PRICE.activeRole}💎`, 'buy:ar')],
    [btn('⬅️ Orqaga', 'home')],
  ]);
  return { text, markup };
}
const edit = (ctx, text, markup) => ctx.editMessageText(text, { parse_mode: 'HTML', reply_markup: markup }).catch(() => {});

bot.command('profile', async ctx => { if (ctx.chat.type !== 'private') return; await ensureUser(ctx.from); const v = await profileView(ctx.from.id); ctx.reply(v.text, { parse_mode: 'HTML', reply_markup: v.markup }); });
bot.command('roles', ctx => { if (ctx.chat.type === 'private') ctx.reply(rolesText, { parse_mode: 'HTML', reply_markup: rolesKb() }); });
bot.command('help', ctx => ctx.reply('📖 <b>Buyruqlar</b>\n\n/game — yangi o\'yin (guruhda)\n/begin — ro\'yxatni yopib boshlash\n/extend — vaqtni uzaytirish\n/leave — o\'yindan chiqish\n/players — o\'yinchilar\n/stop — o\'yinni to\'xtatish (guruh admini)\n/profile — profil\n/roles — rollar', { parse_mode: 'HTML' }));

bot.action('home', async ctx => { await ctx.answerCbQuery(); edit(ctx, WELCOME, welcomeKb()); });
bot.action('profile', async ctx => { await ctx.answerCbQuery(); await ensureUser(ctx.from); const v = await profileView(ctx.from.id); edit(ctx, v.text, v.markup); });

bot.action(/^buy:(shield|docs|ar)$/, async ctx => {
  const k = ctx.match[1], id = ctx.from.id;
  if (k === 'ar') {
    await ctx.answerCbQuery();
    const u = await User.findOne({ id });
    if (u.activeRole > 0) return ctx.answerCbQuery('Sizda faol rol bor.', { show_alert: true });
    if (u.gems < PRICE.activeRole) return ctx.answerCbQuery(`💎 Toshlar yetarli emas (${PRICE.activeRole} kerak).`, { show_alert: true });
    return edit(ctx, '🎎 <b>Qaysi rolni olmoqchisiz?</b>\nKeyingi o\'yinda shu rol sizga beriladi (agar o\'yinda mavjud bo\'lsa).', kb([...ROLE_ORDER.map(r => [btn(ROLES[r].n, `ar:${r}`)]), [btn('⬅️ Orqaga', 'profile')]]));
  }
  const price = PRICE[k], field = k;
  const r = await User.findOneAndUpdate({ id, money: { $gte: price } }, { $inc: { money: -price, [field]: 1 } }, { new: true });
  if (!r) return ctx.answerCbQuery('💵 Pul yetarli emas!', { show_alert: true });
  await ctx.answerCbQuery('✅ Xarid qilindi!');
  const v = await profileView(id); edit(ctx, v.text, v.markup);
});
bot.action(/^ar:(\w+)$/, async ctx => {
  const r = ctx.match[1]; if (!ROLES[r]) return ctx.answerCbQuery();
  const u = await User.findOneAndUpdate({ id: ctx.from.id, gems: { $gte: PRICE.activeRole }, activeRole: 0 }, { $inc: { gems: -PRICE.activeRole }, $set: { activeRole: 1, pendingRole: r } }, { new: true });
  if (!u) return ctx.answerCbQuery('❌ Imkonsiz.', { show_alert: true });
  await ctx.answerCbQuery('🎎 Faol rol olindi!');
  const v = await profileView(ctx.from.id); edit(ctx, v.text, v.markup);
});

// Rollar bo'limi
const rolesText = '🎭 <b>Mavjud rollar ro\'yxati</b>\n\nUning tavsifini ko\'rish uchun rol nomini bosing';
const rolesKb = () => kb([...ROLE_ORDER.map(r => [btn(ROLES[r].n, `r:${r}`)]), [btn('⬅️ Orqaga', 'home')]]);
bot.action('roles', async ctx => { await ctx.answerCbQuery(); edit(ctx, rolesText, rolesKb()); });
bot.action(/^r:(\w+)$/, async ctx => {
  await ctx.answerCbQuery(); const r = ROLES[ctx.match[1]]; if (!r) return;
  const team = { citizen: '👨🏼 Tinch aholi tomoni', mafia: '🤵🏻 Mafia tomoni', solo: '🎯 Yolg\'iz o\'ynaydi' }[r.team];
  edit(ctx, `<b>${r.n}</b>\n<i>${team}</i>\n\n${esc(r.d)}`, kb([[btn('⬅️ Rollar', 'roles')]]));
});

/* ======================= BOT: GURUH BUYRUQLARI ======================= */
const inGroup = ctx => ['group', 'supergroup'].includes(ctx.chat.type);
bot.command('game', ctx => { if (!inGroup(ctx)) return ctx.reply('Bu buyruq faqat guruhda ishlaydi.'); return openRegistration(ctx); });
bot.command('begin', ctx => { if (!inGroup(ctx)) return; const g = games.get(ctx.chat.id); if (!g || g.started) return; beginGame(g); });
bot.command('extend', ctx => {
  if (!inGroup(ctx)) return; const g = games.get(ctx.chat.id);
  if (!g || g.started) return; if (g.extended >= 3) return ctx.reply('⏳ Ko\'proq uzaytirib bo\'lmaydi.');
  g.extended++; g.regEnd += 30000; refreshReg(g);
});
bot.command('players', ctx => {
  if (!inGroup(ctx)) return; const g = games.get(ctx.chat.id); if (!g) return;
  ctx.reply(g.started ? `👥 <b>Tirik o'yinchilar:</b>\n${aliveList(g)}` : regText(g), { parse_mode: 'HTML' });
});
bot.command('leave', async ctx => {
  if (!inGroup(ctx)) return; const g = games.get(ctx.chat.id); const p = g?.players.get(ctx.from.id);
  if (!p) return;
  if (!g.started) { g.players.delete(p.id); userGame.delete(p.id); refreshReg(g); return ctx.reply(`🚪 ${p.name} ro'yxatdan chiqdi.`); }
  if (!p.alive) return;
  p.alive = false; p.left = true; p.deathType = 'left';
  await send(g.chatId, `🚪 <b>${esc(p.name)}</b> o'yinni tark etdi. U — ${ROLES[p.role].n} edi.`);
  if (g.phase !== 'last') await finishIfWon(g);
});
bot.command('stop', async ctx => {
  if (!inGroup(ctx)) return; const g = games.get(ctx.chat.id); if (!g) return;
  const m = await ctx.getChatMember(ctx.from.id).catch(() => null);
  if (!isAdmin(ctx.from.id) && !['creator', 'administrator'].includes(m?.status)) return ctx.reply('⛔ Faqat guruh adminlari.');
  try { if (g.regMsg && !g.started) await bot.telegram.deleteMessage(g.chatId, g.regMsg); } catch (e) {}
  cleanup(g); ctx.reply('🛑 O\'yin to\'xtatildi.');
});

/* ======================= TUNGI HARAKATLAR ======================= */
const gameOf = (ctx, cid) => { const g = games.get(+cid); return { g, p: g?.players.get(ctx.from.id) }; };
const okTypes = role => role === 'commissar' ? ['chk', 'shoot'] : role === 'journalist' ? ['j1', 'j2'] : [ROLE_ACT[role]];

bot.action(/^c:(-?\d+):(chk|shoot)$/, async ctx => {
  const { g, p } = gameOf(ctx, ctx.match[1]);
  if (!g || g.phase !== 'night' || !p?.alive || p.role !== 'commissar' || g.acts.has(p.id)) return ctx.answerCbQuery('⛔ Hozir mumkin emas', { show_alert: true });
  await ctx.answerCbQuery(); const type = ctx.match[2];
  edit(ctx, PROMPT[type], targetsKb(g, p, type));
});

bot.action(/^n:(-?\d+):(\w+):(\d+)$/, async ctx => {
  const { g, p } = gameOf(ctx, ctx.match[1]); const type = ctx.match[2], tid = +ctx.match[3];
  if (!g || g.phase !== 'night' || !p?.alive || !okTypes(p.role).includes(type) || g.acts.has(p.id)) return ctx.answerCbQuery('⛔ Hozir mumkin emas', { show_alert: true });
  const t = targetsFor(g, p, type).find(x => x.id === tid);
  if (!t) return ctx.answerCbQuery('⛔ Noto\'g\'ri tanlov', { show_alert: true });
  await ctx.answerCbQuery('✅');
  if (type === 'j1') { g.jtmp.set(p.id, tid); return edit(ctx, PROMPT.j2, targetsKb(g, p, 'j2')); }
  if (type === 'heal' && tid === p.id) p.selfHealed = true;
  if (type === 'j2') g.acts.set(p.id, { type: 'j', t: g.jtmp.get(p.id), t2: tid });
  else g.acts.set(p.id, { type, t: tid });
  edit(ctx, `✅ Tanlovingiz qabul qilindi: <b>${esc(t.name)}</b>`);
  const ann = ACT_ANN[type === 'j2' ? 'j' : type];
  if (ann && !(type === 'kill' && false)) send(g.chatId, ann);
  if (type === 'kill' || type === 'sug') {
    const msg = `${ROLES[p.role].n} <b>${esc(p.name)}</b> bu tun <b>${esc(t.name)}</b> ni tanladi.`;
    alive(g).filter(x => isMafia(x) && x.id !== p.id).forEach(x => dm(x.id, msg));
    if (type === 'sug') { /* Don qaroriga ta'sir qilmaydi, faqat tavsiya */ }
  }
  nightDoneCheck(g);
});

/* ======================= OVOZ BERISH ======================= */
bot.action(/^v:(-?\d+):(\d+)$/, async ctx => {
  const { g, p } = gameOf(ctx, ctx.match[1]); const tid = +ctx.match[2];
  if (!g || g.phase !== 'vote' || !p?.alive || !g.voters?.has(p.id) || g.votes.has(p.id)) return ctx.answerCbQuery('⛔ Hozir mumkin emas', { show_alert: true });
  const t = g.players.get(tid);
  if (tid && (!t?.alive || tid === p.id)) return ctx.answerCbQuery('⛔ Noto\'g\'ri tanlov', { show_alert: true });
  g.votes.set(p.id, tid);
  await ctx.answerCbQuery('✅ Ovoz qabul qilindi');
  edit(ctx, tid ? `✅ Siz <b>${esc(t.name)}</b> ga ovoz berdingiz.` : '✅ Siz hech kimga ovoz bermadingiz.');
  send(g.chatId, tid ? `🗳 <b>${esc(p.name)}</b> ➜ <b>${esc(t.name)}</b> ga ovoz berdi${p.role === 'mayor' ? ' <i>(🏛 ×2)</i>' : ''}` : `🗳 <b>${esc(p.name)}</b> hech kimga ovoz bermadi`);
  if (g.votes.size >= g.voters.size) g.wake();
});

bot.action(/^h:(-?\d+):(y|n)$/, async ctx => {
  const { g, p } = gameOf(ctx, ctx.match[1]);
  if (!g || g.phase !== 'confirm' || !g.confirm || !p?.alive || p.id === g.confirm.target) return ctx.answerCbQuery('⛔ Siz ovoz bera olmaysiz', { show_alert: true });
  const c = g.confirm; c.yes.delete(p.id); c.no.delete(p.id);
  (ctx.match[2] === 'y' ? c.yes : c.no).add(p.id);
  await ctx.answerCbQuery('✅');
  ctx.editMessageReplyMarkup(c.kbd()).catch(() => {});
  if (c.yes.size + c.no.size >= alive(g).filter(x => x.id !== c.target).length) g.wake();
});

bot.action(/^k:(-?\d+):(\d+)$/, async ctx => {
  const { g } = gameOf(ctx, ctx.match[1]);
  if (!g || g.phase !== 'kami' || !g.kami || g.kami.id !== ctx.from.id || g.kami.done) return ctx.answerCbQuery('⛔', { show_alert: true });
  const t = g.players.get(+ctx.match[2]); if (!t?.alive) return ctx.answerCbQuery('⛔');
  g.kami.done = true; t.alive = false; t.deathType = 'kamikaze';
  await ctx.answerCbQuery('💣'); edit(ctx, `💣 Siz <b>${esc(t.name)}</b> ni o'zingiz bilan olib ketdingiz.`);
  await send(g.chatId, `💥 <b>Kamikaze portladi!</b>\n${link(t)} — ${ROLES[t.role].n} o'zi bilan qabrga ketdi.`);
  g.wake();
});

/* ======================= GURUH MATNLARI (oxirgi so'z) ======================= */
bot.on('text', async (ctx, next) => {
  if (ctx.chat.type === 'private') return privateText(ctx, next);
  const g = games.get(ctx.chat.id); if (!g?.started) return next();
  const p = g.players.get(ctx.from.id);
  if (g.lw && g.lw.id === ctx.from.id && !g.lw.text && !ctx.message.text.startsWith('/')) {
    g.lw.text = ctx.message.text.slice(0, 300); g.wake(); return;
  }
  if (p && !p.alive) ctx.deleteMessage().catch(() => {});
  return next();
});

/* ======================= ADMIN PANEL ======================= */
const adminKb = () => kb([
  [btn('💵 Pul tashlash', 'ad:money'), btn('💎 Tosh tashlash', 'ad:gems')],
  [btn('🏆 Ketma-ket g\'oliblar', 'ad:streak')],
  [btn('📊 Statistika', 'ad:stat')],
]);
bot.command('admin', ctx => { if (ctx.chat.type === 'private' && isAdmin(ctx.from.id)) ctx.reply('🛠 <b>Admin panel</b>', { parse_mode: 'HTML', reply_markup: adminKb() }); });

bot.action(/^ad:(\w+)$/, async ctx => {
  if (!isAdmin(ctx.from.id)) return ctx.answerCbQuery('⛔');
  await ctx.answerCbQuery(); const a = ctx.match[1];
  if (a === 'money' || a === 'gems') {
    adminState.set(ctx.from.id, { mode: a });
    return ctx.reply(`${a === 'money' ? '💵 Pul' : '💎 Tosh'} tashlash.\nFormat: <code>USER_ID MIQDOR</code>\nMasalan: <code>123456789 100</code>  (manfiy son ayirib qo'yadi)\nBekor qilish: /cancel`, { parse_mode: 'HTML' });
  }
  if (a === 'streak') {
    const us = await User.find({ winStreak: { $gte: 2 } }).sort({ winStreak: -1 }).limit(30);
    if (!us.length) return ctx.reply('Hozircha ketma-ket 2+ marta yutganlar yo\'q.');
    return ctx.reply('🏆 <b>Ketma-ket g\'oliblar</b>\n\n' + us.map(u => `🔥 <b>${esc(u.name)}</b> (<code>${u.id}</code>) — <b>${u.winStreak}</b> marta\n   ╰ ${u.streakRoles.map(r => ROLES[r].n).join(' ➜ ')}`).join('\n\n'), { parse_mode: 'HTML' });
  }
  if (a === 'stat') {
    const [users, gm] = [await User.countDocuments(), games.size];
    return ctx.reply(`📊 Foydalanuvchilar: <b>${users}</b>\n🎮 Faol o'yinlar: <b>${gm}</b>`, { parse_mode: 'HTML' });
  }
});
bot.command('cancel', ctx => { adminState.delete(ctx.from.id); ctx.reply('Bekor qilindi.'); });

async function privateText(ctx, next) {
  const st = adminState.get(ctx.from.id);
  if (!st || !isAdmin(ctx.from.id) || ctx.message.text.startsWith('/')) return next();
  const m = ctx.message.text.trim().match(/^(\d+)\s+(-?\d+)$/);
  if (!m) return ctx.reply('❌ Format: USER_ID MIQDOR');
  const field = st.mode === 'money' ? 'money' : 'gems';
  const u = await User.findOneAndUpdate({ id: +m[1] }, { $inc: { [field]: +m[2] } }, { new: true });
  if (!u) return ctx.reply('❌ Foydalanuvchi topilmadi (u botga /start bosgan bo\'lishi kerak).');
  adminState.delete(ctx.from.id);
  ctx.reply(`✅ ${esc(u.name)}: ${field === 'money' ? '💵' : '💎'} ${u[field]}`, { parse_mode: 'HTML' });
  dm(u.id, `🎁 Admin sizga <b>${+m[2] > 0 ? '+' : ''}${m[2]}</b> ${field === 'money' ? '💵 pul' : '💎 tosh'} tashladi!`);
}

// GIF file_id olish (admin uchun)
bot.on('animation', ctx => { if (ctx.chat.type === 'private' && isAdmin(ctx.from.id)) ctx.reply(`GIF file_id:\n<code>${ctx.message.animation.file_id}</code>\n\n.env ga GIF_NIGHT / GIF_DAY / GIF_VOTE sifatida yozing.`, { parse_mode: 'HTML' }); });

bot.catch((e, ctx) => console.error('bot error', ctx.updateType, e.message));

/* ======================= ISHGA TUSHIRISH ======================= */
(async () => {
  await mongoose.connect(MONGO_URI);
  const me = await bot.telegram.getMe(); BOT_USER = me.username;
  // "/" bosilganda chiqadigan podskazkalar (admin buyruqlari kiritilmagan)
  await bot.telegram.setMyCommands([
    { command: 'start', description: 'Botni ishga tushirish' },
    { command: 'profile', description: 'Profil va imkoniyatlar' },
    { command: 'roles', description: 'Rollar ro\'yxati' },
    { command: 'help', description: 'Yordam' },
  ], { scope: { type: 'all_private_chats' } });
  await bot.telegram.setMyCommands([
    { command: 'game', description: 'Yangi o\'yin boshlash' },
    { command: 'begin', description: 'Ro\'yxatni yopib o\'yinni boshlash' },
    { command: 'extend', description: 'Ro\'yxat vaqtini uzaytirish (+30s)' },
    { command: 'players', description: 'O\'yinchilar ro\'yxati' },
    { command: 'leave', description: 'O\'yindan chiqish' },
    { command: 'stop', description: 'O\'yinni to\'xtatish (guruh admini)' },
  ], { scope: { type: 'all_group_chats' } });
  await bot.launch();
  console.log(`@${BOT_USER} ishga tushdi`);
})();
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
