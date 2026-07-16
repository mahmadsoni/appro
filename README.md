# APPRO
### One store. Every pulse of what's next.

A fully client-side app & game store. No backend, no build step, no fake
listings. Everything you see comes from real files you drop into two
folders — icons are read straight out of the real `.apk`, sizes are read
from the real file, nothing is uploaded separately.

---

## How the catalog works now

There are two folders:

```
apk/       ← put your .apk files here (regular apps)
games/     ← put your game files here
```

Each folder has one `catalog.json` — a plain list telling the site which
files to show. **Only `file` is required.** Everything else is optional
and falls back automatically:

```json
[
  {
    "file": "proplayerff.apk",
    "name": "ProPlayer FF",
    "category": "gaming-tools",
    "description": "Free Fire sensitivity, HUD and graphics advisor.",
    "version": "2.0.1",
    "releaseDate": "Jun 2026"
  }
]
```

If you skip `name`, it's generated from the filename. If you skip
`category`, it falls back to the first category in the list. If you skip
`description`, it shows "No description yet." — nothing breaks.

**The icon is never uploaded.** The site opens the `.apk` itself (an APK
*is* a zip file), finds the real `ic_launcher.png` inside it, and displays
that. Same for file size — it's read live from the actual file on disk,
not typed in by hand. See `js/apk-icon.js` if you're curious how.

Categories available right now (edit `js/data.js` to add more):

- **Apps:** Productivity, Utilities, Gaming Tools, Finance, Social, Media & Streaming, Lifestyle
- **Games:** Action, Racing, Simulation, Arcade, Open World, Strategy, Puzzle

---

## Adding a new app or game — the whole workflow

**1. Copy the real file into the right folder:**
```bash
cp ~/storage/downloads/proplayerff.apk ~/projects/appro/apk/proplayerff.apk
```

**2. Add one entry to that folder's `catalog.json`.** Open it in any text
editor (even `nano` in Termux) and add an object to the array:
```bash
nano ~/projects/appro/apk/catalog.json
```
```json
[
  { "file": "proplayerff.apk", "name": "ProPlayer FF", "category": "gaming-tools",
    "description": "Free Fire settings advisor." }
]
```

**3. Push:**
```bash
cd ~/projects/appro
git add .
git commit -m "Add ProPlayer FF"
git push
```

That's it — no more coming back here to regenerate a zip. The site reads
both `catalog.json` files live on every load.

---

## Project structure

```
appro/
├── index.html
├── offline.html
├── manifest.json
├── sw.js
├── css/
│   └── styles.css
├── js/
│   ├── apk-icon.js     # extracts real icons from .apk files (zip parsing)
│   ├── data.js          # loads apk/catalog.json + games/catalog.json
│   └── app.js             # router, rendering, search, download
├── apk/
│   └── catalog.json       # ← edit this to add apps
└── games/
    └── catalog.json       # ← edit this to add games
```

---

## Deploying with Termux (Git → GitHub Pages)

**1. One-time setup:**
```bash
pkg update -y
pkg install git -y
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global credential.helper store
```

**2. First push:**
```bash
mkdir -p ~/projects
cp -r ~/storage/downloads/appro ~/projects/appro
cd ~/projects/appro
git init
git add .
git commit -m "Appro store"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/appro.git
git push -u origin main
```
It will ask for your GitHub username and a Personal Access Token
(not your password) — generate one at GitHub → Settings → Developer
settings → Personal access tokens, scope `repo`.

**3. Enable GitHub Pages:** repo → Settings → Pages → Source: `main`
branch, `/ (root)` folder. Live in a minute or two at
`https://YOUR_USERNAME.github.io/appro/`.

**4. Every future update (new app, new game, anything):**
```bash
cd ~/projects/appro
git add .
git commit -m "Describe what changed"
git push
```

---

## Notes

- Icon extraction needs `DecompressionStream`, which every modern mobile
  browser supports (Chrome, Firefox, Samsung Internet, Safari 16.4+). If
  it's missing, the app just falls back to a plain gradient icon instead
  of breaking.
- Large `.apk`/game files are **not** pre-cached by the service worker —
  they're fetched fresh and cached on demand, so a new file you add shows
  up immediately without users needing to clear anything.
- The UI is English-only for now — Tajik strings can be reintroduced
  later once the folder-driven workflow is settled.
