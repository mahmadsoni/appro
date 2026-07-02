# APPRO
### One store. Every pulse of what's next.

A fully client-side App Store / Play Store alternative — 115+ generated
apps & games, glassmorphic 2026-era UI, dark/light mode, 4 languages,
offline PWA support. Zero backend, zero frameworks, zero dependencies.

---

## 1. Startup Concept

**The problem:** major app stores have become ad-saturated, algorithmically
noisy, and hostile to genuine discovery. Ratings are gamed, "featured"
slots are sold, and finding something good takes longer than it should.

**The bet:** a smaller, honestly-curated catalog, a UI fast enough to feel
native, and a business model that doesn't depend on selling attention.
Appro is positioned as the *design-forward, developer-friendly*
alternative — think "what if the App Store was designed in 2026 by people
who actually used it daily."

**Business model (conceptual):**
- Free tier: full browsing, install simulation, favorites, offline mode.
- **Appro Premium** ($4.99/mo, conceptual): ad-free (store is already
  ad-free, so this unlocks early betas), cloud save sync across devices,
  4K screenshot galleries, and a "Appro Wrapped" yearly usage recap.
- Developer revenue share: 88/12 split in Appro's favor pitched as
  materially better than the 70/30 industry standard.

---

## 2. Brand Identity

**Name:** Appro — evokes a signal that repeats reliably, cutting through
noise; also a subtle nod to "pulse" (what's trending) and astronomy
(discovery, exploration).

**Logo concept:** a rounded square containing a conic gradient ring
(cyan → magenta → cyan) around a dark inset square — representing a
"pulse ring" radiating outward from a core. The same pulse-ring motif
reappears throughout the UI on trending listings (an animated double-ring
pulse around the app icon).

**Color system:**
| Token | Hex | Use |
|---|---|---|
| Cyan | `#4CE0D2` | Primary actions, links, active states |
| Magenta | `#FF4FA3` | Secondary accent, gradients |
| Gold | `#FFC857` | Ratings, badges |
| Deep space bg | `#0B0E14` | Dark mode canvas |

**Typography:** Space Grotesk (display/headings) for a geometric,
confident voice; Inter (body) for readability; JetBrains Mono for
numeric data (ratings, stats, download counts) to give them a
"live dashboard" feel.

**Voice:** direct, a little wry, never corporate. Descriptions read like
a person wrote them, not a keyword-stuffing SEO bot.

---

## 3. UX Strategy

- **Mobile-first, app-like shell** — sticky top nav with live search,
  bottom tab bar on mobile (Home / Apps / Games / Trending / Saved),
  matching native store conventions so it feels immediately familiar.
- **Glassmorphism used sparingly** — frosted nav bar and toasts, not
  every card, to keep the busy grid legible.
- **Progressive disclosure on detail pages** — tabs (About / Screenshots
  / Reviews) instead of one long scroll, so the page stays scannable.
- **Real-feeling install flow** — simulated progress bar with random
  increments, state persisted to localStorage so "installed" apps show
  up in the Download Center across sessions.
- **Trust signals over ad units** — rating distribution bars, review
  counts, permission transparency chips instead of banner ads.
- **Accessibility** — skip link, visible focus rings, semantic roles on
  card grids (`role="button"`, keyboard Enter/Space activation),
  `aria-live` toasts, reduced-motion media query support.

---

## 4. Folder Structure

```
appro/
├── index.html            # App shell (single entry point, hash-router SPA)
├── offline.html           # PWA offline fallback page
├── manifest.json           # PWA manifest
├── sw.js                    # Service worker (app-shell caching)
├── css/
│   └── styles.css            # Full design system + all view styles
├── js/
│   ├── data.js                # Deterministic catalog generator (apps/games/reviews/devs)
│   └── app.js                  # Router, state, rendering, interactions
└── icons/
    ├── icon-192.svg
    ├── icon-512.svg
    └── icon-maskable.svg
```

No build step. No package.json. Open `index.html` or serve the folder
statically — that's the entire deployment surface.

---

## 5–7. Complete HTML / CSS / JavaScript

All source files were generated directly into the project directory
(not inlined here to keep this document readable). See:

- `index.html` — full markup, i18n data-attributes, PWA meta tags
- `css/styles.css` — ~600 lines, full design system + responsive rules
- `js/data.js` — procedural catalog: 20 categories, 115+ listings,
  reviews, developer profiles, all seeded deterministically
- `js/app.js` — hash router covering 17 routes (Home, Apps, Games,
  Categories, Category detail, Trending, Top Charts, New Releases,
  Search, App/Game Detail, Developer Profile, Favorites, Recently
  Viewed, Download Center, About, Contact, Privacy, Terms, 404)

---

## 8. PWA Files

- `manifest.json` — standalone display, themed icons, shortcuts-ready
- `sw.js` — installs a core-asset cache on `install`, network-first for
  navigations with cache fallback, cache-first for static assets, with
  an `offline.html` fallback when nothing is cached yet
- Registered from `js/app.js` on `window.load` via
  `navigator.serviceWorker.register('./sw.js')`

---

## 9. Deployment Guide

Appro is 100% static — any static host works.

### Quickest: GitHub Pages
1. Push the `appro/` folder contents to the root of a repo (or a
   `docs/` folder / `gh-pages` branch).
2. Repo → **Settings → Pages** → set source to that branch/folder.
3. Visit `https://<username>.github.io/<repo>/`.

> Note: all asset paths use `./relative/paths`, so Appro works correctly
> whether it's served from a domain root or a GitHub Pages subpath.

### Netlify / Vercel
1. Drag-and-drop the `appro/` folder into Netlify's deploy UI, or
   `vercel --prod` from inside the folder.
2. No build command needed — set **build command: none**,
   **publish directory: `.`**.

### Any static server
```bash
cd appro
python3 -m http.server 8080
# or
npx serve .
```

### PWA install checklist
- Served over **HTTPS** (or `localhost`) — required for service workers.
- `manifest.json` and `sw.js` are at the project root so their scope
  covers the whole app.
- Test offline: load the app once online, then toggle DevTools
  "Offline" — the shell and last-viewed data should still render.

---

*All app/game listings, developer names, and reviews in Appro are
procedurally generated for demonstration purposes.*
