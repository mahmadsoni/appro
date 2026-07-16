/* =========================================================================
   APPRO — App Shell / Router / Renderers
   English-only for now. Catalog loads asynchronously from apk/catalog.json
   and games/catalog.json, and real app icons are extracted live from the
   actual .apk files (see js/apk-icon.js) — no manual artwork, ever.
   ========================================================================= */

(function () {
  'use strict';
  const $root = document.getElementById('view-root');
  const $navLinks = document.querySelectorAll('.js-nav-link');
  const $bottomLinks = document.querySelectorAll('.js-bottom-link');
  const $searchInput = document.getElementById('navSearchInput');
  const $toastWrap = document.getElementById('toastWrap');

  let D = null; // set once the catalog finishes loading

  // ---- Persistent state (localStorage) ---------------------------------
  const Store = {
    get(key, fallback) { try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch { return fallback; } },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} },
  };
  const state = {
    favorites: Store.get('appro_favorites', []),
    recentlyViewed: Store.get('appro_recent', []),
  };

  // ---- Auto system theme (always matches the phone, no manual toggle) ---
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', darkQuery && !darkQuery.matches ? 'light' : 'dark');
  }
  if (darkQuery) {
    if (darkQuery.addEventListener) darkQuery.addEventListener('change', applyTheme);
    else if (darkQuery.addListener) darkQuery.addListener(applyTheme);
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
    if (isFav(id)) { state.favorites = state.favorites.filter(f => f !== id); toast('Removed from Favorites', '☆'); }
    else { state.favorites.push(id); toast(`${name} added to Favorites`, '★'); }
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

  function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  // ---- Icon rendering: gradient+glyph placeholder, swapped for the real
  //      extracted APK icon the moment it's ready ------------------------
  function iconGradientStyle(item) {
    const [a, b] = item.gradient;
    const angle = (item.name.length * 13) % 360;
    return `background: linear-gradient(${angle}deg, ${a}, ${b});`;
  }

  function iconMarkup(item, sizeClass) {
    return `<div class="card-icon ${sizeClass || ''}" style="${iconGradientStyle(item)}" data-icon-for="${item.id}">
      <span class="glyph">${item.glyph}</span>
    </div>`;
  }

  function hydrateRealIcons(container) {
    if (!container) return;
    container.querySelectorAll('[data-icon-for]').forEach(async (el) => {
      const id = el.dataset.iconFor;
      const item = D.byId(id);
      if (!item || !item.isApk || !window.APK_TOOLS) return;
      const url = await window.APK_TOOLS.extract(item.file);
      if (url) {
        el.style.background = '#000';
        el.innerHTML = `<img src="${url}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:inherit" />`;
      }
    });
  }

  async function hydrateSize(id, targetEl) {
    const item = D.byId(id);
    if (!item || !window.APK_TOOLS) return;
    const mb = await window.APK_TOOLS.getSizeMb(item.file);
    if (mb != null && targetEl) targetEl.textContent = `${mb} MB`;
  }

  // ---- Card renderer ------------------------------------------------------
  function renderCard(item) {
    return `
    <article class="card" data-goto="detail" data-id="${item.id}" tabindex="0" role="button" aria-label="${item.name}">
      <div class="card-icon-wrap">${iconMarkup(item)}</div>
      <div class="card-body">
        <div class="card-name">${item.name}</div>
        <div class="card-cat">${item.categoryName}</div>
        <button class="card-cta" data-quick-download="${item.id}">Get</button>
      </div>
    </article>`;
  }
  function renderCardRow(items) { return items.map(renderCard).join(''); }

  function renderCatTile(cat) {
    const count = D.byCategory(cat.id).length;
    return `<div class="cat-tile" data-goto="category" data-id="${cat.id}" tabindex="0" role="button" aria-label="${cat.name}">
      <span class="glyph">${cat.icon}</span><b>${cat.name}</b><span>${count} titles</span>
    </div>`;
  }

  function emptyState(title, sub) {
    return `<div class="empty-state"><div class="glyph">◎</div><h3>${title}</h3><p>${sub}</p></div>`;
  }

  // ---- Views ---------------------------------------------------------------
  const Views = {};

  Views.home = () => {
    const hasAny = D.allListings.length > 0;
    return `
    <section class="hero">
      <span class="eyebrow">Your own catalog, built by you</span>
      <h1>Discover software worth keeping.</h1>
      <p class="lead">Appro is a store for the apps and games you actually build — every icon is read straight from the real file, no artwork uploads, no fake listings.</p>
      <div class="hero-actions">
        <button class="btn btn-primary" data-goto-hash="#/apps">Browse Apps</button>
        <button class="btn btn-outline" data-goto-hash="#/games">Browse Games</button>
      </div>
      <div class="hero-stats">
        <div class="hero-stat"><b>${D.apps.length}</b><span>Apps</span></div>
        <div class="hero-stat"><b>${D.games.length}</b><span>Games</span></div>
        <div class="hero-stat"><b>${D.ALL_CATEGORIES.length}</b><span>Categories</span></div>
      </div>
    </section>

    ${hasAny ? `
    <section class="section">
      <div class="section-head"><h2 class="section-title">All Apps</h2><a class="section-link" href="#/apps">See all</a></div>
      <div class="grid">${renderCardRow(D.apps.slice(0, 10))}</div>
    </section>
    <section class="section">
      <div class="section-head"><h2 class="section-title">All Games</h2><a class="section-link" href="#/games">See all</a></div>
      <div class="grid">${renderCardRow(D.games.slice(0, 10))}</div>
    </section>
    ` : `
    <section class="section">
      ${emptyState('Your catalog is empty', 'Drop an .apk into the apk/ folder (or a game file into games/), add one line to catalog.json, and it shows up here automatically.')}
    </section>
    `}

    <section class="section">
      <div class="section-head"><h2 class="section-title">Browse categories</h2><a class="section-link" href="#/categories">See all</a></div>
      <div class="cat-grid">${D.ALL_CATEGORIES.map(renderCatTile).join('')}</div>
    </section>
    `;
  };

  function listingGridView({ title, sub, items, type }) {
    return `
    <div class="section-head"><div><h1 class="section-title" style="font-size:1.6rem">${title}</h1>${sub ? `<p class="section-sub">${sub}</p>` : ''}</div></div>
    ${items.length ? `
    <div class="filters-bar">
      <select class="select" id="filterCat">
        <option value="">All categories</option>
        ${(type === 'game' ? D.GAME_CATEGORIES : D.APP_CATEGORIES).map(c => `<option value="${c.id}">${c.name}</option>`).join('')}
      </select>
      <span class="result-count" id="resultCount">${items.length} results</span>
    </div>
    <div class="grid" id="listingGrid">${renderCardRow(items)}</div>
    ` : emptyState('Nothing here yet', `Add entries to ${type === 'game' ? 'games/catalog.json' : 'apk/catalog.json'} to see them here.`)}
    `;
  }

  Views.apps = () => listingGridView({ title: 'Apps', sub: 'Everything you\'ve built, organized.', items: D.apps, type: 'app' });
  Views.games = () => listingGridView({ title: 'Games', sub: 'Your own games, all in one place.', items: D.games, type: 'game' });

  Views.categories = () => `
    <h1 class="section-title" style="font-size:1.6rem;margin-bottom:6px">Categories</h1>
    <p class="section-sub" style="margin-bottom:24px">Every corner of your catalog, organized.</p>
    <h2 style="font-size:1rem;margin-bottom:12px;color:var(--text-muted)">Apps</h2>
    <div class="cat-grid" style="margin-bottom:32px">${D.APP_CATEGORIES.map(renderCatTile).join('')}</div>
    <h2 style="font-size:1rem;margin-bottom:12px;color:var(--text-muted)">Games</h2>
    <div class="cat-grid">${D.GAME_CATEGORIES.map(renderCatTile).join('')}</div>
  `;

  Views.category = (id) => {
    const cat = D.ALL_CATEGORIES.find(c => c.id === id);
    const items = D.byCategory(id);
    if (!cat) return Views.notfound();
    return listingGridView({ title: `${cat.icon} ${cat.name}`, sub: `${items.length} title${items.length === 1 ? '' : 's'} in this category.`, items, type: items[0]?.type });
  };

  Views.search = (query) => {
    const results = D.search(query || '');
    return `
    <h1 class="section-title" style="font-size:1.5rem;margin-bottom:4px">Search</h1>
    <p class="section-sub" style="margin-bottom:22px">${results.length} result${results.length === 1 ? '' : 's'} for “${escapeHtml(query || '')}”</p>
    ${results.length ? `<div class="grid">${renderCardRow(results)}</div>` : emptyState('No matches found', 'Try a different name or category.')}
    `;
  };

  Views.favorites = () => {
    const items = state.favorites.map(id => D.byId(id)).filter(Boolean);
    return `
    <h1 class="section-title" style="font-size:1.5rem;margin-bottom:16px">Favorites</h1>
    ${items.length ? `<div class="grid">${renderCardRow(items)}</div>` : emptyState('No favorites yet', 'Tap the star on any app or game to save it here.')}
    `;
  };

  Views.recent = () => {
    const items = state.recentlyViewed.map(id => D.byId(id)).filter(Boolean);
    return `
    <h1 class="section-title" style="font-size:1.5rem;margin-bottom:16px">Recently Viewed</h1>
    ${items.length ? `<div class="grid">${renderCardRow(items)}</div>` : emptyState('Nothing viewed yet', 'Titles you open will show up here.')}
    `;
  };

  Views.detail = (id) => {
    const item = D.byId(id);
    if (!item) return Views.notfound();
    pushRecent(id);
    return `
    <div class="detail-hero">
      <div class="detail-icon-wrap" style="width:108px;height:108px;flex-shrink:0;border-radius:var(--radius-md);overflow:hidden">${iconMarkup(item)}</div>
      <div class="detail-meta">
        <h1>${item.name}</h1>
        <span class="detail-dev" style="cursor:default">${item.categoryIcon} ${item.categoryName}</span>
        <div class="detail-stats">
          <div class="detail-stat"><b id="sizeStat">…</b><span>Size</span></div>
          ${item.version ? `<div class="detail-stat"><b>${item.version}</b><span>Version</span></div>` : ''}
          ${item.releaseDate ? `<div class="detail-stat"><b>${item.releaseDate}</b><span>Released</span></div>` : ''}
        </div>
        <div class="detail-actions">
          <button class="btn btn-primary" id="downloadBtn" data-download="${item.id}">Download</button>
          <button class="btn btn-ghost" data-fav-btn="${item.id}" id="favBtn" aria-label="Add to Favorites">${isFav(item.id) ? '★' : '☆'}</button>
          <button class="btn btn-ghost" id="shareBtn" aria-label="Share">⇪ Share</button>
        </div>
        <div id="downloadProgressWrap" style="display:none">
          <div class="install-track"><div class="install-fill" id="installFill"></div></div>
          <div class="install-label" id="installLabel">Downloading…</div>
        </div>
      </div>
    </div>

    <div class="tab-panel active" id="tab-about" style="display:block">
      <p class="desc-text">${item.description}</p>
      <div style="display:flex;gap:26px;flex-wrap:wrap;margin-top:22px;font-size:0.82rem;color:var(--text-muted)">
        <span>${item.categoryIcon} ${item.categoryName}</span><span>${item.isApk ? 'Icon read directly from the .apk' : 'Game file'}</span>
      </div>
    </div>
    `;
  };

  Views['download-center'] = () => {
    return `
    <h1 class="section-title" style="font-size:1.5rem;margin-bottom:6px">Download Center</h1>
    <p class="section-sub" style="margin-bottom:22px">Appro downloads real files directly — there's no separate "installed" list, each Download button gives you the actual file.</p>
    <div class="grid">${renderCardRow(D.allListings)}</div>
    `;
  };

  Views.about = () => `
    <div class="doc-page">
      <span class="eyebrow">About Appro</span>
      <h1 style="font-size:1.8rem;margin-bottom:14px">A store for what you actually build.</h1>
      <p>Appro is a fully client-side app and game store. There's no backend, no database, and no fake listings — every entry comes from a real file you dropped into the <code>apk/</code> or <code>games/</code> folder, with its icon read directly out of the file itself.</p>
      <h2>How it works</h2>
      <ul>
        <li>Drop a real <code>.apk</code> (or game file) into <code>apk/</code> or <code>games/</code>.</li>
        <li>Add one line to that folder's <code>catalog.json</code>.</li>
        <li>Push to GitHub — the site rebuilds nothing, it just reads the files live.</li>
      </ul>
    </div>
  `;

  Views.contact = () => `
    <div class="doc-page">
      <span class="eyebrow">Get in touch</span>
      <h1 style="font-size:1.8rem;margin-bottom:14px">Contact</h1>
      <form class="contact-form" id="contactForm">
        <div class="field"><label for="cName">Name</label><input id="cName" required placeholder="Your name" /></div>
        <div class="field"><label for="cEmail">Email</label><input id="cEmail" type="email" required placeholder="you@example.com" /></div>
        <div class="field"><label for="cMsg">Message</label><textarea id="cMsg" rows="4" required placeholder="How can we help?"></textarea></div>
        <button class="btn btn-primary" type="submit">Send message</button>
        <p class="form-note" id="contactNote">Message sent.</p>
      </form>
    </div>
  `;

  Views.privacy = () => `
    <div class="doc-page">
      <span class="eyebrow">Legal</span>
      <h1 style="font-size:1.8rem;margin-bottom:14px">Privacy Policy</h1>
      <p>Appro stores only your favorites and recently-viewed list, locally in your browser via localStorage. Nothing is sent anywhere — there is no server in this build.</p>
    </div>
  `;

  Views.terms = () => `
    <div class="doc-page">
      <span class="eyebrow">Legal</span>
      <h1 style="font-size:1.8rem;margin-bottom:14px">Terms of Service</h1>
      <p>Appro is a personal, self-hosted catalog. All files listed belong to their respective owner/publisher.</p>
    </div>
  `;

  Views.notfound = () => `
    <div class="notfound">
      <div class="code">404</div>
      <h1 style="font-size:1.4rem;margin-top:10px">This listing drifted off the shelf.</h1>
      <p>The page you're looking for doesn't exist, or the title may have been removed.</p>
      <button class="btn btn-primary" data-goto-hash="#/">Back to Home</button>
    </div>
  `;

  // ---- Router ----------------------------------------------------------------
  const ROUTES = {
    '': () => Views.home(), '/': () => Views.home(),
    '/apps': () => Views.apps(), '/games': () => Views.games(),
    '/categories': () => Views.categories(),
    '/favorites': () => Views.favorites(), '/recent': () => Views.recent(),
    '/download-center': () => Views['download-center'](),
    '/about': () => Views.about(), '/contact': () => Views.contact(),
    '/privacy': () => Views.privacy(), '/terms': () => Views.terms(),
  };

  function parseHash() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, qs] = raw.split('?');
    return { path, params: new URLSearchParams(qs || '') };
  }

  function render() {
    const { path, params } = parseHash();
    let html; let title = 'Appro';

    if (path.startsWith('/detail/')) { const id = path.split('/detail/')[1]; html = Views.detail(decodeURIComponent(id)); title = D.byId(id)?.name || 'Not found'; }
    else if (path.startsWith('/category/')) { const id = path.split('/category/')[1]; html = Views.category(id); title = 'Category'; }
    else if (path === '/search') { const q = params.get('q') || ''; html = Views.search(q); title = `Search: ${q}`; }
    else if (ROUTES[path]) { html = ROUTES[path](); title = (path === '/' || path === '') ? 'Appro' : path.replace('/', '').replace('-', ' '); }
    else { html = Views.notfound(); title = 'Not found'; }

    $root.innerHTML = `<div class="view-fade">${html}</div>`;
    document.title = title === 'Appro' ? 'Appro — One store. Every pulse of what\'s next.' : `${title} · Appro`;
    window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    highlightNav(path);
    wireViewInteractions();
    hydrateRealIcons($root);

    const sizeStat = document.getElementById('sizeStat');
    if (sizeStat && path.startsWith('/detail/')) hydrateSize(path.split('/detail/')[1], sizeStat);
  }

  function highlightNav(path) {
    [...$navLinks, ...$bottomLinks].forEach(el => {
      const target = el.dataset.route;
      el.classList.toggle('active', target === path || (target === '' && (path === '' || path === '/')));
    });
  }

  function wireViewInteractions() {
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
    $root.querySelectorAll('[data-goto-hash]').forEach(el => el.addEventListener('click', () => location.hash = el.dataset.gotoHash));

    $root.querySelectorAll('[data-quick-download]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); downloadReal(btn.dataset.quickDownload); });
    });

    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) downloadBtn.addEventListener('click', () => downloadWithProgress(downloadBtn.dataset.download, downloadBtn));

    const favBtn = document.getElementById('favBtn');
    if (favBtn) favBtn.addEventListener('click', () => { const id = favBtn.dataset.favBtn; toggleFav(id, D.byId(id)?.name || ''); });

    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) shareBtn.addEventListener('click', async () => {
      const url = location.href;
      if (navigator.share) { try { await navigator.share({ title: document.title, url }); } catch {} }
      else { try { await navigator.clipboard.writeText(url); toast('Link copied to clipboard'); } catch { toast('Copy this page\'s URL to share'); } }
    });

    wireFilters();

    const form = document.getElementById('contactForm');
    if (form) form.addEventListener('submit', (e) => { e.preventDefault(); document.getElementById('contactNote').classList.add('show'); form.reset(); });
  }

  function currentGridItems() {
    const { path } = parseHash();
    if (path === '/apps') return D.apps;
    if (path === '/games') return D.games;
    if (path.startsWith('/category/')) return D.byCategory(path.split('/category/')[1]);
    return D.allListings;
  }

  function wireFilters() {
    const catSel = document.getElementById('filterCat');
    const grid = document.getElementById('listingGrid');
    const count = document.getElementById('resultCount');
    if (!grid || !catSel) return;
    const base = currentGridItems();
    catSel.addEventListener('change', () => {
      const items = catSel.value ? base.filter(i => i.category === catSel.value) : base;
      grid.innerHTML = renderCardRow(items);
      count.textContent = `${items.length} results`;
      wireViewInteractions();
      hydrateRealIcons(grid);
    });
  }

  // ---- Real file download (no simulation — this is the actual file) --------
  function triggerDownload(item) {
    const a = document.createElement('a');
    a.href = item.file;
    a.setAttribute('download', '');
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  function downloadReal(id) {
    const item = D.byId(id);
    if (!item) return;
    triggerDownload(item);
    toast(`Downloading ${item.name}…`, '⬇');
  }
  function downloadWithProgress(id, btnEl) {
    const item = D.byId(id);
    if (!item) return;
    if (btnEl.dataset.busy === '1') return;
    btnEl.dataset.busy = '1';
    btnEl.disabled = true;
    const wrap = document.getElementById('downloadProgressWrap');
    const fill = document.getElementById('installFill');
    if (wrap) wrap.style.display = 'block';
    let pct = 0;
    const timer = setInterval(() => {
      pct += Math.random() * 22 + 10;
      if (pct >= 100) {
        pct = 100;
        clearInterval(timer);
        triggerDownload(item);
        btnEl.textContent = 'Download again';
        btnEl.disabled = false;
        delete btnEl.dataset.busy;
        toast(`${item.name} — download started`, '⬇');
        if (wrap) setTimeout(() => { wrap.style.display = 'none'; }, 500);
      }
      if (fill) fill.style.width = pct + '%';
      const label = document.getElementById('installLabel');
      if (label) label.textContent = `Downloading… ${Math.round(pct)}%`;
    }, 110);
  }

  // ---- Live search dropdown --------------------------------------------------
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
    if (!q.trim() || !D) return;
    const results = D.search(q).slice(0, 6);
    liveBox = document.createElement('div');
    liveBox.style.cssText = 'position:absolute;top:52px;left:0;right:0;background:var(--bg-elevated);border:1px solid var(--border-strong);border-radius:var(--radius-md);box-shadow:var(--shadow-soft);overflow:hidden;z-index:80;max-height:360px;overflow-y:auto;';
    liveBox.innerHTML = results.length
      ? results.map(r => `<div class="live-item" data-id="${r.id}" style="display:flex;gap:10px;align-items:center;padding:10px 14px;cursor:pointer;">
          <div style="width:32px;height:32px;border-radius:8px;flex-shrink:0;display:grid;place-items:center;font-size:0.9rem;background:linear-gradient(135deg, ${r.gradient[0]}, ${r.gradient[1]})">${r.glyph}</div>
          <div style="min-width:0"><div style="font-size:0.85rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.name}</div><div style="font-size:0.72rem;color:var(--text-faint)">${r.categoryName}</div></div>
        </div>`).join('')
      : `<div style="padding:16px;font-size:0.85rem;color:var(--text-faint)">No matches for "${escapeHtml(q)}"</div>`;
    document.querySelector('.nav-search').appendChild(liveBox);
    liveBox.querySelectorAll('.live-item').forEach(el => {
      el.addEventListener('mouseenter', () => el.style.background = 'var(--surface-2)');
      el.addEventListener('mouseleave', () => el.style.background = 'transparent');
      el.addEventListener('click', () => { location.hash = `#/detail/${el.dataset.id}`; $searchInput.value = ''; closeLive(); });
    });
  }
  function closeLive() { if (liveBox) { liveBox.remove(); liveBox = null; } }

  // ---- Global listeners --------------------------------------------------------
  window.addEventListener('hashchange', render);
  document.getElementById('favNavBtn')?.addEventListener('click', () => location.hash = '#/favorites');
  function updateOnlineStatus() {
    const banner = document.getElementById('offlineBanner');
    if (!banner) return;
    if (!navigator.onLine) banner.classList.add('show'); else banner.classList.remove('show');
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // ---- Init ----------------------------------------------------------------------
  applyTheme();
  updateOnlineStatus();
  $root.innerHTML = `<div style="padding:60px 0;text-align:center;color:var(--text-muted)">Loading catalog…</div>`;

  window.APPRO_DATA.load().then((data) => {
    D = data;
    wireSearch();
    render();
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js').catch(() => {}); });
    }
  });
})();
