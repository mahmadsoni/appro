/* =========================================================================
   APPRO — Data Layer (folder-driven catalog)

   There is no fake/generated catalog anymore. Everything shown on the site
   comes from two small JSON files you edit yourself:

     apk/catalog.json    — one entry per app
     games/catalog.json  — one entry per game

   Each entry only needs a "file" field (the filename you dropped in that
   same folder). Name, icon, and size are all derived automatically:
     - name        → from the filename if you don't set one
     - icon        → extracted directly from the real .apk (see apk-icon.js)
     - size        → read from the real file's byte length
   ========================================================================= */

(function (global) {
  'use strict';

  // ---- Categories (static — just labels for organizing your real catalog) ----
  const APP_CATEGORIES = [
    { id: 'productivity', name: 'Productivity', icon: '◧' },
    { id: 'utilities', name: 'Utilities', icon: '⚙' },
    { id: 'gaming-tools', name: 'Gaming Tools', icon: '⊕' },
    { id: 'finance', name: 'Finance', icon: '◆' },
    { id: 'social', name: 'Social', icon: '◎' },
    { id: 'media', name: 'Media & Streaming', icon: '▶' },
    { id: 'lifestyle', name: 'Lifestyle', icon: '❖' },
  ];

  const GAME_CATEGORIES = [
    { id: 'action', name: 'Action', icon: '⚔' },
    { id: 'racing', name: 'Racing', icon: '◭' },
    { id: 'simulation', name: 'Simulation', icon: '⌂' },
    { id: 'arcade', name: 'Arcade', icon: '▣' },
    { id: 'open-world', name: 'Open World', icon: '⛰' },
    { id: 'strategy', name: 'Strategy', icon: '♞' },
    { id: 'puzzle', name: 'Puzzle', icon: '◐' },
  ];

  function dedupeCategories(arr) {
    const seen = new Set();
    return arr.filter(c => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  }
  const ALL_CATEGORIES = dedupeCategories([...APP_CATEGORIES, ...GAME_CATEGORIES]);

  const GRADIENT_PAIRS = [
    ['#4CE0D2', '#2B8CBE'], ['#FF4FA3', '#7A2E8C'], ['#FFC857', '#FF7847'],
    ['#6C63FF', '#2B2E83'], ['#00D9A3', '#0A6E5E'], ['#FF6B6B', '#5C1A1A'],
    ['#4CE0D2', '#FF4FA3'], ['#FFC857', '#6C63FF'], ['#00D9A3', '#4CE0D2'],
  ];
  function gradientFor(seedStr) {
    let h = 0; for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
    return GRADIENT_PAIRS[h % GRADIENT_PAIRS.length];
  }

  function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }

  function titleCaseFromFilename(filename) {
    const base = filename.replace(/\.[a-z0-9]+$/i, '');
    return base.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function findCategory(catId, isGame) {
    const list = isGame ? GAME_CATEGORIES : APP_CATEGORIES;
    return list.find(c => c.id === catId) || list[0];
  }

  /**
   * Turns one raw catalog.json entry into a full listing object.
   * Only `file` is required; everything else has a sane fallback.
   */
  function buildListing(raw, { isGame, folder }) {
    const file = raw.file;
    const filePath = `./${folder}/${file}`;
    const name = raw.name || titleCaseFromFilename(file);
    const category = findCategory(raw.category, isGame);
    return {
      id: `${isGame ? 'g' : 'a'}-${slugify(name)}`,
      name, type: isGame ? 'game' : 'app',
      category: category.id, categoryName: category.name, categoryIcon: category.icon,
      description: raw.description || 'No description yet.',
      version: raw.version || null,
      releaseDate: raw.releaseDate || null,
      file: filePath,
      isApk: /\.apk$/i.test(file),
      gradient: gradientFor(name),
      glyph: category.icon,
      // filled in lazily by the UI layer once the real icon/size are fetched
      sizeMb: null,
      iconUrl: null,
    };
  }

  async function loadCatalogFile(path) {
    try {
      const res = await fetch(path, { cache: 'no-cache' });
      if (!res.ok) return [];
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Loads both catalogs and returns the full data API. Call this once at
   * startup and await it before rendering anything.
   */
  async function load() {
    const [rawApps, rawGames] = await Promise.all([
      loadCatalogFile('./apk/catalog.json'),
      loadCatalogFile('./games/catalog.json'),
    ]);

    const apps = rawApps.map(r => buildListing(r, { isGame: false, folder: 'apk' }));
    const games = rawGames.map(r => buildListing(r, { isGame: true, folder: 'games' }));
    const allListings = [...apps, ...games];

    return {
      APP_CATEGORIES, GAME_CATEGORIES, ALL_CATEGORIES,
      apps, games, allListings,
      byId: (id) => allListings.find(l => l.id === id),
      byCategory: (catId) => allListings.filter(l => l.category === catId),
      search: (query) => {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        return allListings.filter(l =>
          l.name.toLowerCase().includes(q) || l.categoryName.toLowerCase().includes(q)
        );
      },
    };
  }

  global.APPRO_DATA = { load };
})(window);
