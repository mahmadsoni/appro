/* =========================================================================
   APPRO — App Shell / Router / Renderers
   Hash-based SPA router, no frameworks. All views render into #view-root.

   Theme: always follows the phone/OS setting (prefers-color-scheme).
   There is no manual toggle — it just matches the device automatically,
   live, even if the system setting changes mid-session.

   Language: auto-detected from the device's timezone/locale. Tajikistan
   (Asia/Dushanbe timezone, or a "tg" browser locale) gets the Tajik UI;
   everyone else gets English. No manual switcher, no stored override.
   ========================================================================= */

(function () {
  'use strict';
  const D = window.APPRO_DATA;
  const $root = document.getElementById('view-root');
  const $navLinks = document.querySelectorAll('.js-nav-link');
  const $bottomLinks = document.querySelectorAll('.js-bottom-link');
  const $searchInput = document.getElementById('navSearchInput');
  const $toastWrap = document.getElementById('toastWrap');

  const STRINGS = {
    en: {
      brand: 'Appro', tagline: 'One store. Every pulse of what\'s next.',
      home: 'Home', apps: 'Apps', games: 'Games', categories: 'Categories', trending: 'Trending',
      charts: 'Top Charts', newReleases: 'New', search: 'Search', download: 'Get', install: 'Install',
      installing: 'Installing…', installed: 'Open', favorite: 'Add to Favorites', favorited: 'In Favorites',
      searchPlaceholder: 'Search apps, games, developers…',
    },
    tg: {
      brand: 'Appro', tagline: 'Як мағоза. Ҳар пульси ояндаро.',
      home: 'Асосӣ', apps: 'Барномаҳо', games: 'Бозиҳо', categories: 'Категорияҳо', trending: 'Тамоюл',
      charts: 'Рейтинг', newReleases: 'Нав', search: 'Ҷустуҷӯ', download: 'Гирифтан', install: 'Насб кардан',
      installing: 'Насб шуда истодааст…', installed: 'Кушодан', favorite: 'Илова ба дӯстдоштаҳо', favorited: 'Дар дӯстдоштаҳо',
      searchPlaceholder: 'Ҷустуҷӯи барнома, бозӣ, таҳиягар…',
    },
  };

  // ---- Auto region → language detection (no manual switcher) ----------------
  function detectLang() {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (tz === 'Asia/Dushanbe') return 'tg';
      const langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ''];
      if (langs.some(l => l.toLowerCase().startsWith('tg'))) return 'tg';
    } catch (e) { /* fall through to default */ }
    return 'en';
  }
  const LANG = detectLang();
  function t(key) { return (STRINGS[LANG] || STRINGS.en)[key] || STRINGS.en[key] || key; }

  // ---- Persistent state (localStorage) — favorites / history / installs only ----
  const Store = {
    get(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  };

  const state = {
    favorites: Store.get('appro_favorites', []),
    recentlyViewed: Store.get('appro_recent', []),
    installed: Store.get('appro_installed', []),
  };

  // ---- Auto system theme (no manual toggle) ---------------------------------
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function currentSystemTheme() {
    if (!darkQuery) return 'dark';
    return darkQuery.matches ? 'dark' : 'light';
  }
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', currentSystemTheme());
  }
  if (darkQuery) {
    // Some browsers use addEventListener, older Safari uses addListener
    if (darkQuery.addEventListener) darkQuery.addEventListener('change', applyTheme);
    else if (darkQuery.addListener) darkQuery.addListener(applyTheme);
  }

  function applyLang() {
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    if ($searchInput) $searchInput.placeholder = t('searchPlaceholder');
    document.documentElement.setAttribute('lang', LANG);
  }

  function toast(msg, icon = '✓') {
    const el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
    $toastWrap.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 2600);
  }

  function isFav(id) { return state.favorites.includes(id); }
  function toggleFav(id, name) {
    if (isFav(id)) { state.favorites = state.favorites.filter(f => f !== id); toast(LANG === 'tg' ? 'Аз дӯстдоштаҳо бароварда шуд' : 'Removed from Favorites', '☆'); }
    else { state.favorites.push(id); toast(`${name} ${LANG === 'tg' ? 'ба дӯстдоштаҳо илова шуд' : 'added to Favorites'}`, '★'); }
    Store.set('appro_favorites', state.favorites);
    document.querySelectorAll(`[data-fav-btn="${id}"]`).forEach(btn => updateFavBtn(btn, id));
  }
  function updateFavBtn(btn, id) {
    const active = isFav(id);
    btn.classList.toggle('active', active);
    btn.innerHTML = active ? '★' : '☆';
  }

  function pushRecent(id) {
    state.recentlyViewed = [id, ...state.recentlyViewed.filter(r => r !== id)].slice(0, 12);
    Store.set('appro_recent', state.recentlyViewed);
  }

  function isInstalled(id) { return state.installed.includes(id); }

  // ---- Icon SVGs ------------------------------------------------------------
  const ICONS = {
    star: '<svg viewBox="0 0 20 20"><path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.2-5.4 3.2 1.3-6-4.6-4.1 6.1-.6z"/></svg>',
  };

  function starRating(rating) {
    return `${ICONS.star}<span>${rating.toFixed(1)}</span>`;
  }

  function iconGradientStyle(item) {
    const [a, b] = item.gradient;
    return `background: linear-gradient(${between(item)}deg, ${a}, ${b});`;
  }
  function between(item) { return (item.name.length * 13) % 360; }

  // ---- Card renderer ----------------------------------------------------------
  function renderCard(item, wide = false) {
    const badge = item.badge ? `<span class="card-badge">${item.badge}</span>` : '';
    const pulse = item.trendingScore > 80 ? '<div class="pulse-ring"></div>' : '';
    return `
    <article class="card ${wide ? 'card-wide' : ''}" data-goto="detail" data-id="${item.id}" tabindex="0" role="button" aria-label="${item.name}">
      <div class="card-icon-wrap">
        <div class="card-icon" style="${iconGradientStyle(item)}">
          ${badge}${pulse}
          <span class="glyph">${item.glyph}</span>
        </div>
      </div>
      <div class="card-body">
        <div class="card-name">${item.name}</div>
        <div class="card-cat">${item.categoryName}</div>
        <div class="card-meta">
          <span class="card-rating">${starRating(item.rating)}</span>
          <span>${item.isFree ? (LANG === 'tg' ? 'Ройгон' : 'Free') : '$' + item.price}</span>
        </div>
        <button class="card-cta" data-quick-install="${item.id}">${isInstalled(item.id) ? t('installed') : t('download')}</button>
      </div>
    </article>`;
  }

  function renderCardRow(items) { return items.map(i => renderCard(i)).join(''); }

  function renderCatTile(cat) {
    const count = D.byCategory(cat.id).length;
    const titlesLabel = LANG === 'tg' ? 'унвон' : 'titles';
    return `<div class="cat-tile" data-goto="category" data-id="${cat.id}" tabindex="0" role="button" aria-label="${cat.name}">
      <span class="glyph">${cat.icon}</span><b>${cat.name}</b><span>${count} ${titlesLabel}</span>
    </div>`;
  }

  // ---- Views --------------------------------------------------------------------
  const Views = {};

  Views.home = () => {
    const trending = D.trending().slice(0, 10);
    const newRel = D.newReleases().slice(0, 10);
    const featuredGames = D.featuredGames();
    const topApps = D.topCharts('app').slice(0, 10);
    const isTg = LANG === 'tg';
    return `
    <section class="hero">
      <span class="eyebrow">${isTg ? 'Хуш омадед ба дунёи барномаҳо' : 'Welcome to the pulse of the app world'}</span>
      <h1>${isTg ? 'Барномаҳое, ки арзиши нигоҳдоштан доранд.' : 'Discover software worth keeping.'}</h1>
      <p class="lead">${t('tagline')} ${isTg ? 'Appro каталогро бе ғавғои реклама пешниҳод мекунад — рейтинги воқеӣ, тавсифи содиқона, насби фаврӣ, пурра дар режими офлайн низ дастрас.' : 'Appro curates apps and games without the ad-clutter — real ratings, honest descriptions, instant installs, fully offline-capable.'}</p>
      <div class="hero-actions">
        <button class="btn btn-primary" data-goto-hash="#/apps">${isTg ? 'Дидани барномаҳо' : 'Browse Apps'}</button>
        <button class="btn btn-outline" data-goto-hash="#/games">${isTg ? 'Дидани бозиҳо' : 'Browse Games'}</button>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><b>${D.allListings.length}+</b><span>${isTg ? 'Унвонҳои курировашуда' : 'Curated titles'}</span></div>
        <div class="hero-stat"><b>${D.ALL_CATEGORIES.length}</b><span>${isTg ? 'Категорияҳо' : 'Categories'}</span></div>
        <div class="hero-stat"><b>0</b><span>${isTg ? 'Пайгирикунандагон' : 'Trackers'}</span></div>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2 class="section-title">${isTg ? 'Ҳоло дар тамоюл' : 'Trending now'}</h2><a class="section-link" href="#/trending">${isTg ? 'Ҳамаро дидан' : 'See all'}</a></div>
      <div class="rail">${trending.map(i => `<div style="width:150px">${renderCard(i)}</div>`).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2 class="section-title">${isTg ? 'Бозиҳои интихобшуда' : 'Featured games'}</h2><a class="section-link" href="#/games">${isTg ? 'Ҳамаро дидан' : 'See all'}</a></div>
      <div class="grid grid-wide">${featuredGames.map(i => renderCard(i)).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2 class="section-title">${isTg ? 'Категорияҳоро дидан' : 'Browse categories'}</h2><a class="section-link" href="#/categories">${isTg ? 'Ҳамаро дидан' : 'See all'}</a></div>
      <div class="cat-grid">${D.ALL_CATEGORIES.slice(0, 10).map(renderCatTile).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2 class="section-title">${isTg ? 'Барномаҳои беҳтарин' : 'Top apps'}</h2><a class="section-link" href="#/top-charts">${isTg ? 'Ҳамаро дидан' : 'See all'}</a></div>
      <div class="rail">${topApps.map(i => `<div style="width:150px">${renderCard(i)}</div>`).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2 class="section-title">${isTg ? 'Навигариҳои тоза' : 'New releases'}</h2><a class="section-link" href="#/new-releases">${isTg ? 'Ҳамаро дидан' : 'See all'}</a></div>
      <div class="rail">${newRel.map(i => `<div style="width:150px">${renderCard(i)}</div>`).join('')}</div>
    </section>
    `;
  };

  function listingGridView({ title, sub, items, type }) {
    const isTg = LANG === 'tg';
    return `
    <div class="section-head"><div><h1 class="section-title" style="font-size:1.6rem">${title}</h1>${sub ? `<p class="section-sub">${sub}</p>` : ''}</div></div>
    <div class="filters-bar">
      <select class="select" id="sortSelect">
        <option value="relevance">${isTg ? 'Тартиб: Мувофиқат' : 'Sort: Relevance'}</option>
        <option value="rating">${isTg ? 'Тартиб: Рейтинги баланд' : 'Sort: Highest rated'}</option>
        <option value="downloads">${isTg ? 'Тартиб: Насби зиёд' : 'Sort: Most downloaded'}</option>
        <option value="new">${isTg ? 'Тартиб: Навтарин' : 'Sort: Newest'}</option>
      </select>
      <select class="select" id="filterCat">
        <option value="">${isTg ? 'Ҳама категорияҳо' : 'All categories'}</option>
        ${(type === 'game' ? D.GAME_CATEGORIES : type === 'app' ? D.APP_CATEGORIES : D.ALL_CATEGORIES).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>
      <select class="select" id="filterPrice">
        <option value="">${isTg ? 'Ройгон ва пулакӣ' : 'Free & Paid'}</option>
        <option value="free">${isTg ? 'Танҳо ройгон' : 'Free only'}</option>
        <option value="paid">${isTg ? 'Танҳо пулакӣ' : 'Paid only'}</option>
      </select>
      <span class="result-count" id="resultCount">${items.length} ${isTg ? 'натиҷа' : 'results'}</span>
    </div>
    <div class="grid" id="listingGrid">${renderCardRow(items)}</div>
    `;
  }

  Views.apps = () => listingGridView({ title: t('apps'), sub: LANG === 'tg' ? 'Маҳсулнокӣ, молия, эҷодкорӣ ва боз ҳам бештар — ҳама курировашуда.' : 'Productivity, finance, creativity and more — all curated.', items: D.apps, type: 'app' });
  Views.games = () => listingGridView({ title: t('games'), sub: LANG === 'tg' ? 'Аз давиши панҷдақиқагии arcade то эпоси садсоата.' : 'From five-minute arcade runs to hundred-hour epics.', items: D.games, type: 'game' });
  Views.trending = () => listingGridView({ title: t('trending'), sub: LANG === 'tg' ? 'Он чи ҷомеаи Appro ҳоло насб мекунад.' : 'What the Appro community is installing right now.', items: D.trending(), type: null });
  Views['new-releases'] = () => listingGridView({ title: LANG === 'tg' ? 'Навигариҳои тоза' : 'New Releases', sub: LANG === 'tg' ? 'Тозаву навашон дар марҳилаи охир.' : 'Freshly published in the last cycle.', items: D.newReleases(), type: null });

  Views['top-charts'] = () => {
    const appCharts = D.topCharts('app');
    const gameCharts = D.topCharts('game');
    const isTg = LANG === 'tg';
    return `
    <h1 class="section-title" style="font-size:1.6rem;margin-bottom:6px">${t('charts')}</h1>
    <p class="section-sub" style="margin-bottom:24px">${isTg ? 'Аз рӯи шумораи умумии насбҳо дар мағоза дараҷабандӣ шудааст.' : 'Ranked by total installs across the store.'}</p>
    <div class="tabs">
      <button class="tab-btn active" data-tab="chart-apps">${isTg ? 'Барномаҳои беҳтарин' : 'Top Apps'}</button>
      <button class="tab-btn" data-tab="chart-games">${isTg ? 'Бозиҳои беҳтарин' : 'Top Games'}</button>
    </div>
    <div class="tab-panel active" id="chart-apps">
      ${appCharts.map((item, i) => rankedRow(item, i + 1)).join('')}
    </div>
    <div class="tab-panel" id="chart-games">
      ${gameCharts.map((item, i) => rankedRow(item, i + 1)).join('')}
    </div>
    `;
  };

  function rankedRow(item, rank) {
    const dlLabel = LANG === 'tg' ? 'насб' : 'downloads';
    return `
    <div class="card card-wide" data-goto="detail" data-id="${item.id}" tabindex="0" role="button" style="margin-bottom:10px" aria-label="${item.name}">
      <span style="font-family:var(--font-mono);color:var(--text-faint);width:26px;font-size:1.1rem;flex-shrink:0">${rank}</span>
      <div class="card-icon-wrap" style="width:52px;height:52px;flex-shrink:0">
        <div class="card-icon" style="${iconGradientStyle(item)}"><span class="glyph" style="font-size:1.3rem">${item.glyph}</span></div>
      </div>
      <div class="card-body">
        <div class="card-name">${item.name}</div>
        <div class="card-cat">${item.categoryName} · ${item.downloadsLabel} ${dlLabel}</div>
      </div>
      <span class="card-rating" style="flex-shrink:0">${starRating(item.rating)}</span>
    </div>`;
  }

  Views.categories = () => {
    const isTg = LANG === 'tg';
    return `
    <h1 class="section-title" style="font-size:1.6rem;margin-bottom:6px">${t('categories')}</h1>
    <p class="section-sub" style="margin-bottom:24px">${isTg ? 'Ҳар гӯшаи каталог, мураттаб карда шуда.' : 'Every corner of the catalog, organized.'}</p>
    <h2 style="font-size:1rem;margin-bottom:12px;color:var(--text-muted)">${t('apps')}</h2>
    <div class="cat-grid" style="margin-bottom:32px">${D.APP_CATEGORIES.map(renderCatTile).join('')}</div>
    <h2 style="font-size:1rem;margin-bottom:12px;color:var(--text-muted)">${t('games')}</h2>
    <div class="cat-grid">${D.GAME_CATEGORIES.map(renderCatTile).join('')}</div>
  `;
  };

  Views.category = (id) => {
    const cat = D.ALL_CATEGORIES.find(c => c.id === id);
    const items = D.byCategory(id);
    if (!cat) return Views.notfound();
    const isTg = LANG === 'tg';
    return listingGridView({ title: `${cat.icon} ${cat.name}`, sub: `${items.length} ${isTg ? 'унвон дар ин категория.' : 'titles in this category.'}`, items, type: items[0]?.type });
  };

  Views.search = (query) => {
    const results = D.search(query || '');
    const isTg = LANG === 'tg';
    return `
    <h1 class="section-title" style="font-size:1.5rem;margin-bottom:4px">${t('search')}</h1>
    <p class="section-sub" style="margin-bottom:22px">${results.length} ${isTg ? 'натиҷа барои' : 'result' + (results.length === 1 ? '' : 's') + ' for'} “${escapeHtml(query || '')}”</p>
    ${results.length ? `<div class="grid">${renderCardRow(results)}</div>` : emptyState(isTg ? 'Ҳеҷ мутобиқат ёфт нашуд' : 'No matches found', isTg ? 'Номи дигар, категория ё таҳиягарро санҷед.' : 'Try a different name, category, or developer.')}
    `;
  };

  function emptyState(title, sub) {
    return `<div class="empty-state"><div class="glyph">◎</div><h3>${title}</h3><p>${sub}</p></div>`;
  }

  Views.favorites = () => {
    const items = state.favorites.map(id => D.byId(id)).filter(Boolean);
    const isTg = LANG === 'tg';
    return `
    <h1 class="section-title" style="font-size:1.5rem;margin-bottom:16px">${isTg ? 'Дӯстдоштаҳо' : 'Favorites'}</h1>
    ${items.length ? `<div class="grid">${renderCardRow(items)}</div>` : emptyState(isTg ? 'Ҳанӯз дӯстдошта нест' : 'No favorites yet', isTg ? 'Ситораро дар ҳар барнома ё бозӣ пахш кунед, то онро дар ин ҷо нигоҳ доред.' : 'Tap the star on any app or game to save it here.')}
    `;
  };

  Views.recent = () => {
    const items = state.recentlyViewed.map(id => D.byId(id)).filter(Boolean);
    const isTg = LANG === 'tg';
    return `
    <h1 class="section-title" style="font-size:1.5rem;margin-bottom:16px">${isTg ? 'Ба наздикӣ дидашуда' : 'Recently Viewed'}</h1>
    ${items.length ? `<div class="grid">${renderCardRow(items)}</div>` : emptyState(isTg ? 'Ҳанӯз чизе дида нашудааст' : 'Nothing viewed yet', isTg ? 'Унвонҳое, ки мекушоед, дар ин ҷо намоён мешаванд.' : 'Titles you open will show up here.')}
    `;
  };

  Views.detail = (id) => {
    const item = D.byId(id);
    if (!item) return Views.notfound();
    pushRecent(id);
    const isTg = LANG === 'tg';
    const [a, b] = item.gradient;
    const shots = item.screenshots.map((s, i) => `
      <div class="shot ${i === 0 && item.hasVideo ? 'video-shot' : ''}" style="background:linear-gradient(${s.angle}deg, ${s.from}, ${s.to})">
        <span class="glyph">${s.glyph}</span>
      </div>`).join('');
    const ratingDist = [5, 4, 3, 2, 1].map(star => {
      const pct = star === Math.round(item.rating) ? 62 : Math.max(4, 30 - Math.abs(star - item.rating) * 14);
      return `<div class="rating-bar-row"><span>${star}★</span><div class="rating-bar-track"><div class="rating-bar-fill" style="width:${pct}%"></div></div></div>`;
    }).join('');
    const reviewsHtml = item.reviews.map(r => `
      <div class="review-card">
        <div class="review-head">
          <span class="review-author">${r.author}</span>
          <span class="review-stars">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
        </div>
        <p class="review-text">${r.text}</p>
        <div class="review-foot"><span>${r.date}</span><span>${r.helpful} ${isTg ? 'нафар инро муфид ёфтанд' : 'found this helpful'}</span></div>
      </div>`).join('');
    const installedFlag = isInstalled(id);

    return `
    <div class="detail-hero">
      <div class="detail-icon" style="background:linear-gradient(135deg, ${a}, ${b})">${item.glyph}</div>
      <div class="detail-meta">
        <h1>${item.name}</h1>
        <a class="detail-dev" data-goto="developer" data-id="${item.developer.id}">${item.developer.name}</a>
        <div class="detail-stats">
          <div class="detail-stat"><b>${starRating(item.rating)}</b><span>${item.ratingCount.toLocaleString()} ${isTg ? 'баҳо' : 'ratings'}</span></div>
          <div class="detail-stat"><b>${item.downloadsLabel}</b><span>${isTg ? 'Насбҳо' : 'Downloads'}</span></div>
          <div class="detail-stat"><b>${item.ageRating}</b><span>${isTg ? 'Синну сол' : 'Age rating'}</span></div>
          <div class="detail-stat"><b>${item.sizeMb} MB</b><span>${isTg ? 'Ҳаҷм' : 'Size'}</span></div>
        </div>
        <div class="detail-actions">
          <button class="btn btn-primary" id="installBtn" data-install="${item.id}" data-name="${item.name}">
            ${installedFlag ? t('installed') : (item.isFree ? t('install') : `${isTg ? 'Харидан' : 'Buy'} $${item.price}`)}
          </button>
          <button class="btn btn-ghost" data-fav-btn="${item.id}" id="favBtn" aria-label="${t('favorite')}">${isFav(item.id) ? '★' : '☆'}</button>
          <button class="btn btn-ghost" id="shareBtn" aria-label="Share">⇪ ${isTg ? 'Мубодила' : 'Share'}</button>
        </div>
        <div id="installProgressWrap" style="display:none">
          <div class="install-track"><div class="install-fill" id="installFill"></div></div>
          <div class="install-label" id="installLabel">${t('installing')}</div>
        </div>
      </div>
    </div>

    <div class="tabs">
      <button class="tab-btn active" data-tab="tab-about">${isTg ? 'Дар бораи' : 'About'}</button>
      <button class="tab-btn" data-tab="tab-media">${isTg ? 'Скриншотҳо' : 'Screenshots'}</button>
      <button class="tab-btn" data-tab="tab-reviews">${isTg ? 'Шарҳҳо' : 'Reviews'} (${item.reviews.length})</button>
    </div>

    <div class="tab-panel active" id="tab-about">
      <p class="desc-text">${item.description}</p>
      <div class="perm-list">${item.permissions.map(p => `<span class="perm-chip">${p}</span>`).join('')}</div>
      <div style="display:flex;gap:26px;flex-wrap:wrap;margin-top:22px;font-size:0.82rem;color:var(--text-muted)">
        <span>${isTg ? 'Версия' : 'Version'} ${item.version}</span><span>${isTg ? 'Барориш' : 'Released'} ${item.releaseDate}</span><span>${item.categoryIcon} ${item.categoryName}</span>
      </div>
    </div>

    <div class="tab-panel" id="tab-media">
      <div class="shot-rail">${shots}</div>
    </div>

    <div class="tab-panel" id="tab-reviews">
      <div class="rating-summary">
        <div class="rating-big">${item.rating.toFixed(1)}</div>
        <div class="rating-bars">${ratingDist}</div>
      </div>
      ${reviewsHtml}
    </div>
    `;
  };

  Views.developer = (devId) => {
    const items = D.byDeveloper(devId);
    const dev = items[0]?.developer;
    if (!dev) return Views.notfound();
    const isTg = LANG === 'tg';
    return `
    <div class="dev-hero">
      <div class="dev-avatar">${dev.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</div>
      <div>
        <h1 style="font-size:1.5rem">${dev.name}</h1>
        <p style="color:var(--text-muted);font-size:0.88rem;margin-top:6px;max-width:520px">${dev.bio}</p>
        <p style="color:var(--text-faint);font-size:0.78rem;margin-top:8px">${isTg ? 'Таъсисёфта' : 'Founded'} ${dev.founded} · ${dev.hq} · ${items.length} ${isTg ? 'унвони нашршуда' : 'published titles'}</p>
      </div>
    </div>
    <h2 class="section-title" style="font-size:1.1rem;margin-bottom:14px">${isTg ? 'Унвонҳои нашршуда' : 'Published titles'}</h2>
    <div class="grid">${renderCardRow(items)}</div>
    `;
  };

  Views['download-center'] = () => {
    const installed = state.installed.map(id => D.byId(id)).filter(Boolean);
    const isTg = LANG === 'tg';
    return `
    <h1 class="section-title" style="font-size:1.5rem;margin-bottom:6px">${isTg ? 'Маркази боргирӣ' : 'Download Center'}</h1>
    <p class="section-sub" style="margin-bottom:22px">${isTg ? 'Ҳар чизе, ки тавассути Appro насб кардаед, ҳама дар як ҷо.' : 'Everything you\'ve installed through Appro, all in one place.'}</p>
    ${installed.length ? `<div class="grid">${renderCardRow(installed)}</div>` : emptyState(isTg ? 'Ҳанӯз ягон боргирӣ нест' : 'No downloads yet', isTg ? 'Барномаву бозиҳои насбшуда дар ин ҷо намоён мешаванд.' : 'Installed apps and games will appear here.')}
    `;
  };

  Views.about = () => {
    const isTg = LANG === 'tg';
    if (isTg) return `
    <div class="doc-page">
      <span class="eyebrow">Дар бораи Appro</span>
      <h1 style="font-size:1.8rem;margin-bottom:14px">Кашфи барнома, бе ғавғо.</h1>
      <p>Appro бо як саволи содда оғоз ёфт: чаро ёфтани барномаи хуб ҳар сол душвортар мешавад? Мағозаҳо пур аз реклама шуданд, рейтингҳо бозӣ карда мешаванд ва "курировашуда" дигар маънои воқеӣ надорад. Мо Appro-ро баръакс сохтем — каталоги хурде, ки воқеан курирование мешавад, рақамҳои ҳақиқиро нишон медиҳад ва суръаташ ҳамчун қисми дастгоҳ ҳис мешавад, на вебсайти ба он монанд.</p>
      <h2>Чӣ гуна Appro фарқ мекунад</h2>
      <ul>
        <li>Байни шумо ва барномаҳое, ки меҷӯед, ягон ҷои реклама нест.</li>
        <li>Ҳар унвон пеш аз илова шудан ба каталог аз назорати сифат мегузарад.</li>
        <li>Тамоми мағоза дар браузер кор мекунад — суръатнок ва бидуни интернет низ дастрас.</li>
        <li>Таҳиягарон дар муқоиса бо мағозаҳои кӯҳна ҳиссаи бузургтари даромадро мегиранд.</li>
      </ul>
      <h2>Ба куҷо равонем</h2>
      <p>Аъзоёни Appro Premium дастрасии барвақтро ба нусхаҳои озмоишӣ, дидани бе реклама ва синхронизатсияи cloud дар байни дастгоҳҳо мегиранд.</p>
    </div>`;
    return `
    <div class="doc-page">
      <span class="eyebrow">About Appro</span>
      <h1 style="font-size:1.8rem;margin-bottom:14px">Software discovery, without the noise.</h1>
      <p>Appro started as a simple question: why does finding good software feel worse every year? Storefronts got louder, ratings got gamed, and "curated" stopped meaning anything. We built Appro as the opposite bet — a catalog small enough to actually curate, honest enough to show real numbers, and fast enough to feel like part of your device rather than a website pretending to be one.</p>
      <h2>What makes Appro different</h2>
      <ul>
        <li>No ad slots between you and the apps you're looking for.</li>
        <li>Every listing is reviewed for quality before it's added to the catalog.</li>
        <li>The entire store runs client-side — fast by default, usable offline.</li>
        <li>Developers keep a larger share of revenue than legacy storefronts allow.</li>
      </ul>
      <h2>Where we're headed</h2>
      <p>Appro Premium members get early access to betas, ad-free browsing, and cloud save sync across devices. We're building toward a store that feels less like a marketplace and more like a well-organized shelf — one you'd actually want to browse.</p>
    </div>
  `;
  };

  Views.contact = () => {
    const isTg = LANG === 'tg';
    return `
    <div class="doc-page">
      <span class="eyebrow">${isTg ? 'Тамос' : 'Get in touch'}</span>
      <h1 style="font-size:1.8rem;margin-bottom:14px">${isTg ? 'Тамос бо Appro' : 'Contact Appro'}</h1>
      <p>${isTg ? 'Саволҳо, дастгирии таҳиягарон ё дархости матбуот — паём фиристед, мо ба гурӯҳи дуруст равона мекунем.' : 'Questions, developer support, or press inquiries — send a note and we\'ll route it to the right team.'}</p>
      <form class="contact-form" id="contactForm">
        <div class="field"><label for="cName">${isTg ? 'Ном' : 'Name'}</label><input id="cName" required placeholder="${isTg ? 'Номи шумо' : 'Your name'}" /></div>
        <div class="field"><label for="cEmail">Email</label><input id="cEmail" type="email" required placeholder="you@example.com" /></div>
        <div class="field"><label for="cTopic">${isTg ? 'Мавзӯъ' : 'Topic'}</label>
          <select id="cTopic"><option>${isTg ? 'Саволи умумӣ' : 'General question'}</option><option>${isTg ? 'Дастгирии таҳиягар' : 'Developer support'}</option><option>${isTg ? 'Гузориши хато' : 'Report a bug'}</option><option>${isTg ? 'Матбуот' : 'Press'}</option></select>
        </div>
        <div class="field"><label for="cMsg">${isTg ? 'Паём' : 'Message'}</label><textarea id="cMsg" rows="4" required placeholder="${isTg ? 'Чӣ гуна кӯмак карда метавонем?' : 'How can we help?'}"></textarea></div>
        <button class="btn btn-primary" type="submit">${isTg ? 'Фиристодани паём' : 'Send message'}</button>
        <p class="form-note" id="contactNote">${isTg ? 'Паём фиристода шуд — мо дар давоми ду рӯзи корӣ ҷавоб медиҳем.' : 'Message sent — we\'ll reply within two business days.'}</p>
      </form>
    </div>
  `;
  };

  Views.privacy = () => {
    const isTg = LANG === 'tg';
    if (isTg) return `
    <div class="doc-page">
      <span class="eyebrow">Ҳуқуқӣ</span>
      <h1 style="font-size:1.8rem;margin-bottom:14px">Сиёсати махфият</h1>
      <p>Навсозии охирин: июни 2026. Appro як мағозаи намоишии тарафи-клиент аст.</p>
      <h2>Мо чиро ҷамъ мекунем</h2>
      <p>Appro танзимоти шуморо — забон, дӯстдоштаҳо ва таърихи боргирӣ — маҳаллан дар браузери шумо тавассути localStorage нигоҳ медорад. Ҳеҷ чиз ба сервер фиристода намешавад, зеро Appro дар ин версия сервер надорад.</p>
      <h2>Мо чӣ намекунем</h2>
      <ul><li>Ягон пикселҳои пайгирӣ ё таҳлили тарафи сеюм нест.</li><li>Фурӯш ё мубодилаи маълумоти шахсӣ нест, зеро ҳеҷ чиз ҷамъ карда намешавад.</li><li>Ҳисоб барои дидан ё "насб кардан"-и унвонҳо лозим нест.</li></ul>
      <h2>Назорати шумо</h2>
      <p>Тоза кардани нигоҳдории браузер тамоми маълумоти Appro-ро фавран нест мекунад.</p>
    </div>`;
    return `
    <div class="doc-page">
      <span class="eyebrow">Legal</span>
      <h1 style="font-size:1.8rem;margin-bottom:14px">Privacy Policy</h1>
      <p>Last updated June 2026. Appro is a client-side demo storefront. This policy describes, in plain terms, what would apply to a production version of this product.</p>
      <h2>What we collect</h2>
      <p>Appro stores your preferences — favorites and download history — locally in your browser using localStorage. Nothing is transmitted to a server, because Appro has none in this build.</p>
      <h2>What we don't do</h2>
      <ul><li>No tracking pixels or third-party analytics.</li><li>No selling or sharing of personal data, because none is collected.</li><li>No account required to browse or "install" listings.</li></ul>
      <h2>Your control</h2>
      <p>Clearing your browser storage removes all Appro data instantly — favorites, history, and settings included.</p>
    </div>
  `;
  };

  Views.terms = () => {
    const isTg = LANG === 'tg';
    if (isTg) return `
    <div class="doc-page">
      <span class="eyebrow">Ҳуқуқӣ</span>
      <h1 style="font-size:1.8rem;margin-bottom:14px">Шартҳои хизматрасонӣ</h1>
      <p>Навсозии охирин: июни 2026. Бо истифодаи Appro, як мағозаи намоишӣ, шумо бо шартҳои зерин розӣ мешавед.</p>
      <h2>Истифодаи каталог</h2>
      <p>Ҳамаи унвонҳои барнома ва бозӣ дар Appro хаёлӣ буда, барои мақсадҳои намоишӣ тавлид шудаанд. "Насбҳо" маҳаллан шабеҳсозӣ мешаванд ва нармафзори воқеиро боргирӣ намекунанд.</p>
      <h2>Истифодаи қобили қабул</h2>
      <ul><li>Appro-ро ҳамчун мағозаи истеҳсолии воқеӣ муаррифӣ накунед.</li><li>Мундариҷа "ҳамон тавре ки ҳаст" барои мақсадҳои намоишӣ ва таълимӣ пешниҳод мешавад.</li></ul>
      <h2>Тағйирот</h2>
      <p>Ин шартҳо метавонанд ҳангоми рушди маҳсулот навсозӣ шаванд.</p>
    </div>`;
    return `
    <div class="doc-page">
      <span class="eyebrow">Legal</span>
      <h1 style="font-size:1.8rem;margin-bottom:14px">Terms of Service</h1>
      <p>Last updated June 2026. By using Appro, a demonstration storefront, you agree to the following illustrative terms.</p>
      <h2>Use of the catalog</h2>
      <p>All app and game listings in Appro are fictional, generated for demonstration purposes. "Installs" are simulated locally and do not download real software.</p>
      <h2>Acceptable use</h2>
      <ul><li>Don't attempt to misrepresent Appro as a production software marketplace.</li><li>Content is provided as-is, for demonstration and educational purposes.</li></ul>
      <h2>Changes</h2>
      <p>These terms may be updated as the product evolves. Continued use after changes constitutes acceptance.</p>
    </div>
  `;
  };

  Views.notfound = () => {
    const isTg = LANG === 'tg';
    return `
    <div class="notfound">
      <div class="code">404</div>
      <h1 style="font-size:1.4rem;margin-top:10px">${isTg ? 'Ин унвон аз рафъ дур шудааст.' : 'This listing drifted off the shelf.'}</h1>
      <p>${isTg ? 'Саҳифае, ки меҷӯед, вуҷуд надорад, ё унвон бардошта шудааст.' : 'The page you\'re looking for doesn\'t exist, or the title may have been removed.'}</p>
      <button class="btn btn-primary" data-goto-hash="#/">${isTg ? 'Бозгашт ба асосӣ' : 'Back to Home'}</button>
    </div>
  `;
  };

  function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // ---- Router ------------------------------------------------------------------
  const ROUTES = {
    '': () => Views.home(),
    '/': () => Views.home(),
    '/apps': () => Views.apps(),
    '/games': () => Views.games(),
    '/categories': () => Views.categories(),
    '/trending': () => Views.trending(),
    '/top-charts': () => Views['top-charts'](),
    '/new-releases': () => Views['new-releases'](),
    '/favorites': () => Views.favorites(),
    '/recent': () => Views.recent(),
    '/download-center': () => Views['download-center'](),
    '/about': () => Views.about(),
    '/contact': () => Views.contact(),
    '/privacy': () => Views.privacy(),
    '/terms': () => Views.terms(),
  };

  function parseHash() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = raw.split('?');
    const params = new URLSearchParams(qs || '');
    return { path, params };
  }

  function render() {
    const { path, params } = parseHash();
    let html;
    let title = 'Appro';

    if (path.startsWith('/detail/')) { const id = path.split('/detail/')[1]; html = Views.detail(decodeURIComponent(id)); title = D.byId(id)?.name || 'Not found'; }
    else if (path.startsWith('/category/')) { const id = path.split('/category/')[1]; html = Views.category(id); title = 'Category'; }
    else if (path.startsWith('/developer/')) { const id = path.split('/developer/')[1]; html = Views.developer(id); title = 'Developer'; }
    else if (path === '/search') { const q = params.get('q') || ''; html = Views.search(q); title = `Search: ${q}`; }
    else if (ROUTES[path]) { html = ROUTES[path](); title = path === '/' || path === '' ? 'Appro' : path.replace('/', '').replace('-', ' '); }
    else { html = Views.notfound(); title = 'Not found'; }

    $root.innerHTML = `<div class="view-fade">${html}</div>`;
    document.title = title === 'Appro' ? 'Appro — One store. Every pulse of what\'s next.' : `${title} · Appro`;
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    highlightNav(path);
    wireViewInteractions(path);
    applyLang();
  }

  function highlightNav(path) {
    [...$navLinks, ...$bottomLinks].forEach(el => {
      const target = el.dataset.route;
      el.classList.toggle('active', target === path || (target === '' && (path === '' || path === '/')));
    });
  }

  // ---- Interaction wiring per-view ----------------------------------------------
  function wireViewInteractions(path) {
    $root.querySelectorAll('[data-goto="detail"]').forEach(el => {
      const go = () => location.hash = `#/detail/${encodeURIComponent(el.dataset.id)}`;
      el.addEventListener('click', go);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    $root.querySelectorAll('[data-goto="category"]').forEach(el => {
      const go = () => location.hash = `#/category/${el.dataset.id}`;
      el.addEventListener('click', go);
      el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
    });
    $root.querySelectorAll('[data-goto="developer"]').forEach(el => {
      el.addEventListener('click', (e) => { e.stopPropagation(); location.hash = `#/developer/${el.dataset.id}`; });
    });
    $root.querySelectorAll('[data-goto-hash]').forEach(el => el.addEventListener('click', () => location.hash = el.dataset.gotoHash));

    $root.querySelectorAll('[data-quick-install]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); simulateInstall(btn.dataset.quickInstall, btn); });
    });

    const installBtn = document.getElementById('installBtn');
    if (installBtn) installBtn.addEventListener('click', () => simulateInstall(installBtn.dataset.install, installBtn, true));

    const favBtn = document.getElementById('favBtn');
    if (favBtn) favBtn.addEventListener('click', () => { const id = favBtn.dataset.favBtn; toggleFav(id, D.byId(id)?.name || ''); });

    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) shareBtn.addEventListener('click', async () => {
      const url = location.href;
      if (navigator.share) { try { await navigator.share({ title: document.title, url }); } catch {} }
      else { try { await navigator.clipboard.writeText(url); toast(LANG === 'tg' ? 'Пайванд нусхабардорӣ шуд' : 'Link copied to clipboard'); } catch { toast(LANG === 'tg' ? 'Пайванди ин саҳифаро нусхабардорӣ кунед' : 'Copy this page\'s URL to share'); } }
    });

    $root.querySelectorAll('.tab-btn').forEach(tabBtn => {
      tabBtn.addEventListener('click', () => {
        $root.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        $root.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        tabBtn.classList.add('active');
        document.getElementById(tabBtn.dataset.tab)?.classList.add('active');
      });
    });

    wireFilters();

    const form = document.getElementById('contactForm');
    if (form) form.addEventListener('submit', (e) => {
      e.preventDefault();
      document.getElementById('contactNote').classList.add('show');
      form.reset();
    });
  }

  function currentGridItems() {
    const { path } = parseHash();
    if (path === '/apps') return D.apps;
    if (path === '/games') return D.games;
    if (path === '/trending') return D.trending();
    if (path === '/new-releases') return D.newReleases();
    if (path.startsWith('/category/')) return D.byCategory(path.split('/category/')[1]);
    return D.allListings;
  }

  function wireFilters() {
    const sortSel = document.getElementById('sortSelect');
    const catSel = document.getElementById('filterCat');
    const priceSel = document.getElementById('filterPrice');
    const grid = document.getElementById('listingGrid');
    const count = document.getElementById('resultCount');
    if (!grid) return;
    const base = currentGridItems();
    const isTg = LANG === 'tg';

    function apply() {
      let items = [...base];
      if (catSel.value) items = items.filter(i => i.category === catSel.value);
      if (priceSel.value === 'free') items = items.filter(i => i.isFree);
      if (priceSel.value === 'paid') items = items.filter(i => !i.isFree);
      if (sortSel.value === 'rating') items.sort((a, b) => b.rating - a.rating);
      else if (sortSel.value === 'downloads') items.sort((a, b) => b.downloads - a.downloads);
      else if (sortSel.value === 'new') items.sort((a, b) => new Date(b.releaseDate) - new Date(a.releaseDate));
      grid.innerHTML = renderCardRow(items);
      count.textContent = `${items.length} ${isTg ? 'натиҷа' : 'results'}`;
      wireViewInteractions();
    }
    [sortSel, catSel, priceSel].forEach(el => el && el.addEventListener('change', apply));
  }

  // ---- Install simulation ---------------------------------------------------------
  function simulateInstall(id, btnEl, isDetail = false) {
    const item = D.byId(id);
    if (!item) return;
    if (isInstalled(id)) { toast(`${LANG === 'tg' ? 'Кушода истодааст' : 'Opening'} ${item.name}…`, '▶'); return; }
    if (btnEl.dataset.installing === '1') return;
    btnEl.dataset.installing = '1';
    btnEl.textContent = t('installing');
    btnEl.disabled = true;

    const wrap = document.getElementById('installProgressWrap');
    const fill = document.getElementById('installFill');
    if (isDetail && wrap) { wrap.style.display = 'block'; }

    let pct = 0;
    const timer = setInterval(() => {
      pct += Math.random() * 18 + 6;
      if (pct >= 100) {
        pct = 100;
        clearInterval(timer);
        state.installed.push(id);
        Store.set('appro_installed', state.installed);
        btnEl.textContent = t('installed');
        btnEl.disabled = false;
        delete btnEl.dataset.installing;
        toast(`${item.name} ${LANG === 'tg' ? 'насб шуд' : 'installed'}`, '✓');
        document.querySelectorAll(`[data-quick-install="${id}"]`).forEach(b => b.textContent = t('installed'));
        if (isDetail && wrap) setTimeout(() => { wrap.style.display = 'none'; }, 600);
      }
      if (fill) fill.style.width = pct + '%';
      if (document.getElementById('installLabel')) document.getElementById('installLabel').textContent = `${t('installing')} ${Math.round(pct)}%`;
    }, 140);
  }

  // ---- Live search dropdown --------------------------------------------------------
  function wireSearch() {
    let debounceTimer;
    $searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const q = $searchInput.value;
      debounceTimer = setTimeout(() => renderLiveResults(q), 180);
    });
    $searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { location.hash = `#/search?q=${encodeURIComponent($searchInput.value)}`; closeLive(); }
      if (e.key === 'Escape') closeLive();
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('.nav-search')) closeLive(); });
  }
  let liveBox;
  function renderLiveResults(q) {
    closeLive();
    if (!q.trim()) return;
    const results = D.search(q).slice(0, 6);
    liveBox = document.createElement('div');
    liveBox.style.cssText = 'position:absolute;top:52px;left:0;right:0;background:var(--bg-elevated);border:1px solid var(--border-strong);border-radius:var(--radius-md);box-shadow:var(--shadow-soft);overflow:hidden;z-index:80;max-height:360px;overflow-y:auto;';
    liveBox.innerHTML = results.length
      ? results.map(r => `<div class="live-item" data-id="${r.id}" style="display:flex;gap:10px;align-items:center;padding:10px 14px;cursor:pointer;">
          <div style="width:32px;height:32px;border-radius:8px;flex-shrink:0;display:grid;place-items:center;font-size:0.9rem;background:linear-gradient(135deg, ${r.gradient[0]}, ${r.gradient[1]})">${r.glyph}</div>
          <div style="min-width:0"><div style="font-size:0.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.name}</div><div style="font-size:0.72rem;color:var(--text-faint)">${r.categoryName}</div></div>
        </div>`).join('')
      : `<div style="padding:16px;font-size:0.85rem;color:var(--text-faint)">${LANG === 'tg' ? 'Барои' : 'No matches for'} "${escapeHtml(q)}" ${LANG === 'tg' ? 'ҳеҷ чиз ёфт нашуд' : ''}</div>`;
    document.querySelector('.nav-search').appendChild(liveBox);
    liveBox.querySelectorAll('.live-item').forEach(el => {
      el.addEventListener('mouseenter', () => el.style.background = 'var(--surface-2)');
      el.addEventListener('mouseleave', () => el.style.background = 'transparent');
      el.addEventListener('click', () => { location.hash = `#/detail/${el.dataset.id}`; $searchInput.value = ''; closeLive(); });
    });
  }
  function closeLive() { if (liveBox) { liveBox.remove(); liveBox = null; } }

  // ---- Global listeners --------------------------------------------------------------
  window.addEventListener('hashchange', render);
  document.getElementById('favNavBtn')?.addEventListener('click', () => location.hash = '#/favorites');

  // Offline banner
  function updateOnlineStatus() {
    const banner = document.getElementById('offlineBanner');
    if (!banner) return;
    if (!navigator.onLine) banner.classList.add('show'); else banner.classList.remove('show');
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // ---- Init ------------------------------------------------------------------------------
  applyTheme();
  wireSearch();
  updateOnlineStatus();
  render();

  // PWA service worker registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }
})();
