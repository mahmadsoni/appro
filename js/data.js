/* =========================================================================
   APPRO — Data Layer
   Procedurally generates a realistic, internally-consistent catalog of
   apps and games entirely in the browser. No network, no backend.
   Every listing (including hand-authored "My Projects" entries) gets its
   icon auto-generated from a name-seeded gradient + category glyph —
   nobody ever has to upload artwork.
   ========================================================================= */

(function (global) {
  'use strict';

  // ---- Deterministic PRNG (mulberry32) so the catalog is stable per session
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(190226);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const pickN = (arr, n) => {
    const copy = [...arr]; const out = [];
    while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
    return out;
  };
  const between = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
  const betweenF = (min, max, d = 1) => +(rand() * (max - min) + min).toFixed(d);

  // ---- Categories -------------------------------------------------------
  // "admin-projects" is a special category reserved for real, hand-built
  // software — it sits alongside the procedural categories in both the
  // Apps and Games sections, but is excluded from procedural generation.
  const ADMIN_CATEGORY = { id: 'admin-projects', name: 'Лоиҳаҳои Ман', icon: '⟡' };

  const PROC_APP_CATEGORIES = [
    { id: 'productivity', name: 'Productivity', icon: '◧' },
    { id: 'finance', name: 'Finance', icon: '◆' },
    { id: 'social', name: 'Social', icon: '◎' },
    { id: 'photo-video', name: 'Photo & Video', icon: '◈' },
    { id: 'health-fitness', name: 'Health & Fitness', icon: '✚' },
    { id: 'education', name: 'Education', icon: '▤' },
    { id: 'music-audio', name: 'Music & Audio', icon: '♪' },
    { id: 'travel', name: 'Travel & Local', icon: '✈' },
    { id: 'utilities', name: 'Utilities', icon: '⚙' },
    { id: 'lifestyle', name: 'Lifestyle', icon: '❖' },
  ];

  const PROC_GAME_CATEGORIES = [
    { id: 'action', name: 'Action', icon: '⚔' },
    { id: 'rpg', name: 'RPG', icon: '🜃' },
    { id: 'strategy', name: 'Strategy', icon: '♞' },
    { id: 'puzzle', name: 'Puzzle', icon: '◐' },
    { id: 'racing', name: 'Racing', icon: '◭' },
    { id: 'simulation', name: 'Simulation', icon: '⌂' },
    { id: 'arcade', name: 'Arcade', icon: '▣' },
    { id: 'sports', name: 'Sports', icon: '●' },
    { id: 'shooter', name: 'Shooter', icon: '✦' },
    { id: 'card-board', name: 'Card & Board', icon: '♠' },
  ];

  const APP_CATEGORIES = [...PROC_APP_CATEGORIES, ADMIN_CATEGORY];
  const GAME_CATEGORIES = [...PROC_GAME_CATEGORIES, ADMIN_CATEGORY];

  function dedupeCategories(arr) {
    const seen = new Set();
    return arr.filter(c => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  }
  const ALL_CATEGORIES = dedupeCategories([...APP_CATEGORIES, ...GAME_CATEGORIES]);

  // ---- Naming banks ------------------------------------------------------
  const APP_PREFIX = ['Flux', 'Nimbus', 'Vector', 'Quanta', 'Loom', 'Ember', 'Drift', 'Sable', 'Halo', 'Cipher', 'Petal', 'Grove', 'Aster', 'Bloom', 'Crux', 'Verve', 'Onyx', 'Lucid', 'Terra', 'Orbit', 'Kite', 'Slate', 'Mint', 'Coral', 'Vale'];
  const APP_SUFFIX = {
    'productivity': ['Flow', 'Tasks', 'Notes', 'Board', 'Focus', 'Docs'],
    'finance': ['Ledger', 'Wallet', 'Bank', 'Pay', 'Coin', 'Budget'],
    'social': ['Circle', 'Chat', 'Connect', 'Pulse', 'Loop', 'Feed'],
    'photo-video': ['Lens', 'Frame', 'Cut', 'Studio', 'Reel', 'Shot'],
    'health-fitness': ['Fit', 'Vital', 'Track', 'Pulse', 'Move', 'Balance'],
    'education': ['Learn', 'Class', 'Skill', 'Prep', 'Tutor', 'Mind'],
    'music-audio': ['Wave', 'Beat', 'Sound', 'Mix', 'Tune', 'Audio'],
    'travel': ['Trip', 'Map', 'Voyage', 'Stay', 'Roam', 'Compass'],
    'utilities': ['Kit', 'Tool', 'Guard', 'Clean', 'Sync', 'Box'],
    'lifestyle': ['Home', 'Table', 'Style', 'Nest', 'Daily', 'Craft'],
  };
  const GAME_PREFIX = ['Ashen', 'Nova', 'Dread', 'Crystal', 'Iron', 'Storm', 'Void', 'Ember', 'Frost', 'Rogue', 'Solar', 'Wraith', 'Titan', 'Neon', 'Feral', 'Grim', 'Astral', 'Ruin', 'Skyward', 'Obsidian'];
  const GAME_SUFFIX = {
    'action': ['Blade', 'Strike', 'Rush', 'Fury', 'Reign', 'Havoc'],
    'rpg': ['Chronicles', 'Realms', 'Saga', 'Legends', 'Odyssey', 'Throne'],
    'strategy': ['Empire', 'Dominion', 'Conquest', 'Tactics', 'Legion', 'Frontier'],
    'puzzle': ['Blocks', 'Loop', 'Shift', 'Match', 'Cascade', 'Knot'],
    'racing': ['Drift', 'Circuit', 'Velocity', 'Overdrive', 'Nitro', 'Rally'],
    'simulation': ['Tycoon', 'Builder', 'Life', 'City', 'Farm', 'World'],
    'arcade': ['Dash', 'Blitz', 'Bounce', 'Runner', 'Smash', 'Jam'],
    'sports': ['League', 'Champions', 'Arena', 'Cup', 'Pro', 'Tour'],
    'shooter': ['Ops', 'Siege', 'Protocol', 'Warfare', 'Strikeforce', 'Vanguard'],
    'card-board': ['Deck', 'Arena', 'Kingdoms', 'Duel', 'Tabletop', 'Gambit'],
  };

  const STUDIO_PREFIX = ['Blackfern', 'Redshift', 'Northlyte', 'Cobalt', 'Driftwood', 'Ashwood', 'Ironvale', 'Silverline', 'Pinegate', 'Solstice', 'Marrow', 'Cinder', 'Highlark', 'Lowtide', 'Farview'];
  const STUDIO_SUFFIX = ['Studios', 'Labs', 'Interactive', 'Games', 'Works', 'Collective', 'Software', 'Digital'];

  const APP_DESC_TEMPLATES = {
    'productivity': (n) => `${n} turns scattered to-dos into a calm, organized workflow. Plan your day with drag-and-drop timelines, smart reminders, and cross-device sync that just works — even offline.`,
    'finance': (n) => `${n} gives you a clear picture of your money in one place. Track spending, set budgets, and get plain-language insights without the jargon or the ads.`,
    'social': (n) => `${n} is a quieter kind of social app — small circles, real conversations, and none of the algorithmic noise. Share moments with the people who actually matter.`,
    'photo-video': (n) => `${n} brings pro-grade editing to your pocket. Cut, color-grade, and export in minutes with tools built for speed, not tutorials.`,
    'health-fitness': (n) => `${n} builds routines around your real life, not a fantasy schedule. Track workouts, sleep, and recovery with a coach that adapts as you do.`,
    'education': (n) => `${n} makes learning stick with short, focused sessions and spaced repetition. Pick up a new skill in minutes a day, at your own pace.`,
    'music-audio': (n) => `${n} is a fast, distraction-free way to record, mix, and share sound. From voice memos to full mixes, everything happens on-device.`,
    'travel': (n) => `${n} plans trips the way locals would. Offline maps, honest recommendations, and itineraries that adjust when your plans do.`,
    'utilities': (n) => `${n} quietly handles the boring stuff — backups, cleanup, and syncing — so your device stays fast without you thinking about it.`,
    'lifestyle': (n) => `${n} helps you build small, better habits around home and daily life, with a clean interface that stays out of your way.`,
  };

  const GAME_DESC_TEMPLATES = {
    'action': (n) => `${n} throws you into fast, brutal combat where every fight rewards precision over button-mashing. Chain combos, dodge with a frame-perfect roll, and carve through enemies in tightly-designed arenas.`,
    'rpg': (n) => `${n} is a sprawling world of choices that matter. Build a character across dozens of hours, recruit companions with their own arcs, and shape the story through decisions with lasting consequences.`,
    'strategy': (n) => `${n} rewards long-term thinking over quick reflexes. Manage resources, out-maneuver rival factions, and expand your dominion one calculated decision at a time.`,
    'puzzle': (n) => `${n} starts simple and gets delightfully devious. Hundreds of hand-crafted levels teach new mechanics gradually, building toward puzzles that reward genuine cleverness.`,
    'racing': (n) => `${n} is built for the feel of speed — tight handling, responsive drifting, and tracks designed to punish sloppy lines and reward the perfect one.`,
    'simulation': (n) => `${n} lets you build, manage, and obsess over every detail of your own miniature world, with systems deep enough for hundred-hour playthroughs.`,
    'arcade': (n) => `${n} is pick-up-and-play perfection — short runs, instant restarts, and a high score that will absolutely cost you one more try.`,
    'sports': (n) => `${n} captures the tension of real competition with responsive controls, deep team management, and a season mode that keeps you coming back.`,
    'shooter': (n) => `${n} is a tightly-tuned shooter built around map knowledge and clean mechanics, with a weapon-progression system that never feels grindy.`,
    'card-board': (n) => `${n} brings tabletop strategy to your screen with a deep card pool, fair matchmaking, and a ranked ladder built for genuine skill expression.`,
  };

  const ADJECTIVES = ['Beautifully designed', 'Surprisingly deep', 'Refreshingly fast', 'Thoughtfully built', 'Remarkably polished', 'Wonderfully simple'];

  // ---- Auto-generated icon system ----------------------------------------
  // Every listing's "icon" is just a seeded gradient + a category glyph.
  // No image assets, no uploads — the icon is derived purely from the name.
  const GRADIENT_PAIRS = [
    ['#4CE0D2', '#2B8CBE'], ['#FF4FA3', '#7A2E8C'], ['#FFC857', '#FF7847'],
    ['#6C63FF', '#2B2E83'], ['#00D9A3', '#0A6E5E'], ['#FF6B6B', '#5C1A1A'],
    ['#4CE0D2', '#FF4FA3'], ['#FFC857', '#6C63FF'], ['#00D9A3', '#4CE0D2'],
  ];
  function gradientFor(seedStr) {
    let h = 0; for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
    return GRADIENT_PAIRS[h % GRADIENT_PAIRS.length];
  }

  function makeScreenshots(name, count) {
    const shots = [];
    for (let i = 0; i < count; i++) {
      const [a, b] = gradientFor(name + i);
      shots.push({ from: a, to: b, angle: (i * 47 + 30) % 360, glyph: pick(['◧', '◈', '◎', '✦', '▣', '◐', '⚔', '✚', '♪', '◭']) });
    }
    return shots;
  }

  function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

  function reviewFor(rating) {
    const positive = [
      'Does exactly what it says with none of the bloat other apps have.',
      'Been using this daily for months — rock solid and keeps getting better.',
      'The interface finally feels like it was designed by people who use it.',
      'Switched from three other apps to just this one. No regrets.',
      'Fast, clean, and the updates actually fix things instead of adding clutter.',
    ];
    const mixed = [
      'Solid overall, though a couple of features feel unfinished still.',
      'Great core experience — wish there were more customization options.',
      'Works well most of the time, occasional hiccup on older devices.',
    ];
    const negative = [
      'Had potential but the last update introduced more bugs than it fixed.',
      'Decent, but the free tier feels a bit too limited now.',
    ];
    if (rating >= 4.5) return pick(positive);
    if (rating >= 3.8) return pick(mixed.concat(positive));
    return pick(negative.concat(mixed));
  }

  const FIRST_NAMES = ['Alex', 'Sam', 'Jordan', 'Farrukh', 'Nilufar', 'Diego', 'Priya', 'Wei', 'Zarina', 'Marco', 'Elena', 'Kwame', 'Amir', 'Lena', 'Yusuf', 'Noor'];
  const LAST_INITIALS = ['K.', 'R.', 'M.', 'S.', 'T.', 'B.', 'D.', 'L.', 'N.'];

  function makeReviews(rating, count) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const r = Math.max(1, Math.min(5, Math.round(rating + betweenF(-1.2, 1.0))));
      out.push({
        author: `${pick(FIRST_NAMES)} ${pick(LAST_INITIALS)}`,
        rating: r,
        text: reviewFor(r),
        date: `${pick(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'])} ${between(1, 28)}, 2026`,
        helpful: between(0, 340),
      });
    }
    return out;
  }

  function formatDownloads(n) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M+';
    if (n >= 1_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + 'K+';
    return String(n);
  }

  function makeDeveloper(isGame) {
    const name = `${pick(STUDIO_PREFIX)} ${pick(STUDIO_SUFFIX)}`;
    return {
      id: slugify(name),
      name,
      founded: between(2011, 2024),
      hq: pick(['Dushanbe', 'Berlin', 'Austin', 'Lisbon', 'Singapore', 'Toronto', 'Warsaw', 'Nairobi', 'Seoul', 'Auckland']),
      bio: isGame
        ? 'An independent studio focused on tightly-scoped, mechanically deep games shipped without crunch.'
        : 'A small product team building fast, focused software with no ad-tracking and no dark patterns.',
    };
  }

  const developerPool = [];
  function getDeveloper(isGame) {
    if (developerPool.length < 34 || rand() < 0.55) {
      const dev = makeDeveloper(isGame);
      developerPool.push(dev);
      return dev;
    }
    return pick(developerPool);
  }

  const PERMISSIONS = ['Storage', 'Network access', 'Camera', 'Microphone', 'Location', 'Notifications', 'Contacts', 'Calendar'];
  const BADGES = ['Editors\' Choice', 'Staff Pick', 'Rising Star', 'Top Rated', null, null, null, null];

  function buildListing({ isGame, prefix, suffix, catId, index }) {
    const cat = ALL_CATEGORIES.find(c => c.id === catId);
    const name = `${prefix} ${suffix}`;
    const id = `${isGame ? 'g' : 'a'}-${slugify(name)}-${index}`;
    const rating = betweenF(3.4, 5.0, 1);
    const ratingCount = between(1200, 2_400_000);
    const downloads = between(5_000, 48_000_000);
    const sizeMb = isGame ? between(180, 4200) : between(12, 340);
    const version = `${between(1, 9)}.${between(0, 12)}.${between(0, 9)}`;
    const price = rand() < 0.82 ? 0 : betweenF(0.99, 14.99, 2);
    const descFn = isGame ? GAME_DESC_TEMPLATES[catId] : APP_DESC_TEMPLATES[catId];
    const dev = getDeveloper(isGame);
    const ageRating = isGame ? pick(['3+', '7+', '12+', '16+', '18+']) : pick(['3+', '7+', '12+']);
    return {
      id, name, type: isGame ? 'game' : 'app', category: catId, categoryName: cat.name, categoryIcon: cat.icon,
      developer: dev,
      rating, ratingCount, downloads, downloadsLabel: formatDownloads(downloads),
      sizeMb, version, price, isFree: price === 0,
      badge: pick(BADGES),
      shortDesc: `${pick(ADJECTIVES)} ${isGame ? 'game' : 'app'} for ${cat.name.toLowerCase()}.`,
      description: descFn(name),
      screenshots: makeScreenshots(name, isGame ? 6 : 5),
      permissions: pickN(PERMISSIONS, between(2, 5)),
      ageRating,
      releaseDate: `${pick(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'])} ${between(1, 28)}, ${pick([2024, 2025, 2026])}`,
      reviews: makeReviews(rating, between(4, 8)),
      trendingScore: betweenF(0, 100, 1),
      gradient: gradientFor(name),
      glyph: cat.icon,
      hasVideo: rand() < 0.4,
    };
  }

  // ---- "My Projects" — real, hand-built software, auto-iconed the same way ----
  const OWNER_DEV = {
    id: 'mahmadsoni',
    name: 'Маҳмадсони',
    founded: 2024,
    hq: 'Тоҷикистон',
    bio: 'Барномасози мустақил, ки барномаву бозиҳоро танҳо тарҳрезӣ карда, месозад ва мустақилона аз Termux дар телефон deploy мекунад.',
  };

  function buildAdminListing({ isGame, name, glyph, description, sizeMb, version, releaseDate, screenshotsCount, badge }) {
    const rating = betweenF(4.6, 5.0, 1);
    const ratingCount = between(120, 4800);
    const downloads = between(800, 42000);
    return {
      id: `${isGame ? 'g' : 'a'}-admin-${slugify(name)}`,
      name, type: isGame ? 'game' : 'app', category: ADMIN_CATEGORY.id, categoryName: ADMIN_CATEGORY.name, categoryIcon: ADMIN_CATEGORY.icon,
      developer: OWNER_DEV,
      rating, ratingCount, downloads, downloadsLabel: formatDownloads(downloads),
      sizeMb, version, price: 0, isFree: true,
      badge: badge || 'Admin Project',
      shortDesc: description.slice(0, 84) + '…',
      description,
      screenshots: makeScreenshots(name, screenshotsCount || (isGame ? 6 : 5)),
      permissions: pickN(PERMISSIONS, between(2, 4)),
      ageRating: '3+',
      releaseDate,
      reviews: makeReviews(rating, between(3, 6)),
      trendingScore: betweenF(55, 96, 1),
      gradient: gradientFor(name),
      glyph,
      hasVideo: rand() < 0.5,
    };
  }

  const ADMIN_APPS_RAW = [
    { name: 'CoolBoost', glyph: '❄', sizeMb: 24, version: '1.2.0', releaseDate: 'Jun 2026',
      description: 'CoolBoost барномаи Android аст, ки бо Kotlin ва Jetpack Compose сохта шудааст. Вазифаи он назорати ҳарорати телефон, тозакунии RAM ва пешниҳоди маслиҳатҳои амалӣ барои баланд бардоштани суръати дастгоҳ бе зарар ба батарея мебошад.' },
    { name: 'ProPlayer FF', glyph: '⊕', sizeMb: 31, version: '2.0.1', releaseDate: 'Jun 2026',
      description: 'ProPlayer FF ба бозингарони Free Fire кӯмак мекунад, ки танзимоти ҳассосият, HUD ва графикаро мувофиқи дастгоҳашон интихоб намоянд. Барнома бо се забон — тоҷикӣ, русӣ ва англисӣ — кор мекунад.' },
    { name: 'SENTIVITI PRO', glyph: '✦', sizeMb: 42, version: '1.4.0', releaseDate: 'May 2026',
      description: 'SENTIVITI PRO бо Flutter ва меъмории Clean Architecture сохта шудааст — сканери дастгоҳ, силсилаи ҳассосияти 0–200, генератори HUD ва мураббии AI-ро дар як барнома муттаҳид мекунад.' },
    { name: 'SITORA', glyph: '▶', sizeMb: 18, version: '3.1.0', releaseDate: 'Apr 2026',
      description: 'SITORA платформаи стриминги вебӣ (PWA) аст бо дастгирии 6 забон — аз ҷумла тоҷикӣ, арабӣ ва форсӣ бо самти рост-ба-чап — ва бозигари видеои худсохт.' },
    { name: 'Driftless', glyph: '◐', sizeMb: 6, version: '1.0.3', releaseDate: 'Mar 2026',
      description: 'Driftless сомонаи сабуки фокус-таймер аст бо садоҳои фонии Web Audio ва омори ҷаласаҳо, бидуни ягон реклома ё пайгирии корбар.' },
    { name: 'DC City', glyph: '◆', sizeMb: 12, version: '2.2.0', releaseDate: 'Feb 2026',
      description: 'DC City нусхаи вебии интерфейси бонки мобилии Душанбе мебошад, бо системаи пардохти операторҳо ва тарҳи сабуки кабуду норанҷӣ.' },
    { name: 'Appro', glyph: '◈', sizeMb: 3, version: '1.0.0', releaseDate: 'Jul 2026',
      description: 'Худи Appro — мағозаи барномаву бозиҳо, ки пурра дар браузер кор мекунад, бе сервер, бе пойгоҳи додаҳо ва бе назорати корбар.' },
  ];
  const ADMIN_GAMES_RAW = [
    { name: 'OUTBOUND: Open Road Haulers', glyph: '◭', sizeMb: 210, version: '0.9.0', releaseDate: 'Jan 2026',
      description: 'OUTBOUND бозии сеченака (Three.js) дар ҷаҳони кушода аст — физикаи мошин, трафики NPC, системаи иқтисодии миссияҳо ва имконияти save/load, ҳама дар як файли HTML бе build step.' },
  ];

  function generateCatalog() {
    const apps = [];
    const games = [];
    let idx = 0;
    PROC_APP_CATEGORIES.forEach(cat => {
      const count = between(5, 7);
      for (let i = 0; i < count; i++) {
        apps.push(buildListing({ isGame: false, prefix: pick(APP_PREFIX), suffix: pick(APP_SUFFIX[cat.id]), catId: cat.id, index: idx++ }));
      }
    });
    while (apps.length < 52) {
      const cat = pick(PROC_APP_CATEGORIES);
      apps.push(buildListing({ isGame: false, prefix: pick(APP_PREFIX), suffix: pick(APP_SUFFIX[cat.id]), catId: cat.id, index: idx++ }));
    }
    PROC_GAME_CATEGORIES.forEach(cat => {
      const count = between(5, 7);
      for (let i = 0; i < count; i++) {
        games.push(buildListing({ isGame: true, prefix: pick(GAME_PREFIX), suffix: pick(GAME_SUFFIX[cat.id]), catId: cat.id, index: idx++ }));
      }
    });
    while (games.length < 52) {
      const cat = pick(PROC_GAME_CATEGORIES);
      games.push(buildListing({ isGame: true, prefix: pick(GAME_PREFIX), suffix: pick(GAME_SUFFIX[cat.id]), catId: cat.id, index: idx++ }));
    }

    // De-dupe procedural names (rare PRNG collisions)
    const seen = new Set();
    const dedupe = (list) => list.filter(item => {
      if (seen.has(item.name)) return false;
      seen.add(item.name); return true;
    });

    const finalApps = dedupe(apps).concat(ADMIN_APPS_RAW.map(a => buildAdminListing({ isGame: false, ...a })));
    const finalGames = dedupe(games).concat(ADMIN_GAMES_RAW.map(g => buildAdminListing({ isGame: true, ...g })));
    return { apps: finalApps, games: finalGames };
  }

  const { apps, games } = generateCatalog();
  const allListings = [...apps, ...games];

  global.APPRO_DATA = {
    APP_CATEGORIES, GAME_CATEGORIES, ALL_CATEGORIES, ADMIN_CATEGORY,
    apps, games, allListings,
    formatDownloads,
    byId: (id) => allListings.find(l => l.id === id),
    byCategory: (catId) => allListings.filter(l => l.category === catId),
    trending: () => [...allListings].sort((a, b) => b.trendingScore - a.trendingScore).slice(0, 16),
    topCharts: (type) => [...allListings].filter(l => !type || l.type === type).sort((a, b) => b.downloads - a.downloads).slice(0, 20),
    newReleases: () => [...allListings].sort(() => rand() - 0.5).slice(0, 18),
    featuredGames: () => games.filter(g => g.badge).slice(0, 8).length ? games.filter(g => g.badge).slice(0, 8) : games.slice(0, 8),
    search: (query) => {
      const q = query.trim().toLowerCase();
      if (!q) return [];
      return allListings.filter(l =>
        l.name.toLowerCase().includes(q) ||
        l.categoryName.toLowerCase().includes(q) ||
        l.developer.name.toLowerCase().includes(q)
      );
    },
    byDeveloper: (devId) => allListings.filter(l => l.developer.id === devId),
    developer: (devId) => allListings.find(l => l.developer.id === devId)?.developer,
  };
})(window);
