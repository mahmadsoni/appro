# APPRO
### One store. Every pulse of what's next.

Фулли клиент-сайд App Store / Play Store альтернатива — 123 барнома/бозии
генератсияшуда (аз ҷумла категорияи воқеии **"Лоиҳаҳои Ман"** бо
барномаву бозиҳои шахсии шумо), theme-и худкор мувофиқи телефон,
забони худкор мувофиқи минтақа, PWA бо offline support.

---

## Чӣ нав дар ин версия

1. **Theme-и худкор** — тугмаи алоҳидаи dark/light нест. Сайт ҳамеша
   танзими системаи телефонро пайгирӣ мекунад (`prefers-color-scheme`),
   ҳатто агар шумо онро дар вақти истифода иваз кунед — сайт зинда
   (live) тағйир меёбад, бе reload.
2. **Забони худкор** — тугмаи забон нест. Сайт тавассути timezone
   (`Asia/Dushanbe`) ва locale-и браузер (`tg`) муайян мекунад, ки
   корбар аз Тоҷикистон аст ё не. Агар бале — интерфейс пурра тоҷикӣ
   мешавад; агар не — англисӣ.
3. **Категорияи "Лоиҳаҳои Ман"** — дар рӯйхати категорияҳои ҳам
   Apps ва ҳам Games як категорияи махсус илова шуд, ки танҳо
   лоиҳаҳои воқеии шуморо нишон медиҳад: CoolBoost, ProPlayer FF,
   SENTIVITI PRO, SITORA, Driftless, DC City, худи Appro, ва
   OUTBOUND: Open Road Haulers.
4. **Иконка/лого худкор** — ҳеҷ барнома ё бозӣ ба расм/лого эҳтиёҷ
   надорад. Ҳар унвон (аз ҷумла лоиҳаҳои воқеии шумо) иконкаи худро
   аз номи худ гирифта, ба таври худкор gradient + glyph месозад
   (функсияи `gradientFor()` дар `js/data.js`). Барои иловаи лоиҳаи
   нав кофист номашро ба рӯйхати `ADMIN_APPS_RAW` / `ADMIN_GAMES_RAW`
   дар `js/data.js` илова кунед — иконка худ пайдо мешавад.

---

## Сохтори лоиҳа

```
appro/
├── index.html            # SPA shell (17 маршрут)
├── offline.html            # Fallback барои PWA offline
├── manifest.json             # PWA manifest
├── sw.js                       # Service worker
├── README.md                     # Ин файл
├── css/
│   └── styles.css                  # Design system
├── js/
│   ├── data.js                      # Генератори каталог + "Лоиҳаҳои Ман"
│   └── app.js                        # Router, theme/lang auto, рендер
└── icons/
    ├── icon-192.svg
    ├── icon-512.svg
    └── icon-maskable.svg
```

---

## Илова кардани лоиҳаи нави воқеӣ

Дар `js/data.js` ду рӯйхал ҳастанд: `ADMIN_APPS_RAW` (барномаҳо) ва
`ADMIN_GAMES_RAW` (бозиҳо). Барои илова кардани лоиҳаи нав, объекти
навро ба яке аз ин ду рӯйхат илова кунед:

```js
{ name: 'Номи Лоиҳа', glyph: '★', sizeMb: 20, version: '1.0.0',
  releaseDate: 'Jul 2026', description: 'Тавсифи лоиҳа...' }
```

`glyph` — ягон аломати Unicode (мисли ❄ ⊕ ✦ ▶ ◐ ◆ ◈ ◭ ★ ⚙) — иконка
ва gradient-и он ба таври худкор аз номи лоиҳа месозанд.

---

## Деплой бо Termux (Git → GitHub Pages)

Агар шумо, мисли ҳамеша, аз телефон тавассути Termux кор мекунед,
марҳилаҳо чунинанд:

**1. Насби асбобҳо (як бор кофист):**
```bash
pkg update -y
pkg install git openssh -y
```

**2. Танзими identity-и Git (як бор кофист):**
```bash
git config --global user.name "Номи Шумо"
git config --global user.email "email@example.com"
```

**3. Даромадан ба папкаи лоиҳа ва оғози репо:**
```bash
cd ~/storage/downloads/appro    # ё роҳи дигаре, ки zip-ро баровардаед
git init
git add .
git commit -m "Appro store — initial version"
git branch -M main
```

**4. Пайваст кардан ба GitHub:**
Аввал дар github.com репозиторийи холӣ созед (масалан `appro`), баъд:
```bash
git remote add origin https://github.com/USERNAME/appro.git
git push -u origin main
```
> Агар GitHub парол напурсад, балки token хоҳад — Personal Access
> Token-ро дар Settings → Developer settings → Personal access tokens
> созед ва ба ҷои парол истифода баред.

**5. Фаъол кардани GitHub Pages:**
- Дар репо → **Settings → Pages**
- Source: **Deploy from a branch**, Branch: **main**, Folder: **/ (root)**
- Пас аз 1–2 дақиқа сайт дар
  `https://USERNAME.github.io/appro/` дастрас мешавад.

**6. Барои навсозиҳои баъдӣ:**
```bash
cd ~/storage/downloads/appro
git add .
git commit -m "Тавсифи тағйирот"
git push
```

---

## Санҷиши маҳаллӣ (пеш аз push)

Агар Python дар Termux насб бошад:
```bash
pkg install python -y
cd appro
python -m http.server 8080
```
Баъд дар браузери телефон: `http://localhost:8080`

---

*Ҳамаи унвонҳо, таҳиягарон ва шарҳҳои генератсияшуда (ба ҷуз
"Лоиҳаҳои Ман") барои мақсадҳои намоишӣ сохта шудаанд.*
