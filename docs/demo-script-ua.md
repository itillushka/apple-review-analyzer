# Demo video — read-aloud script (Ukrainian)

Teleprompter version: read top to bottom while screen-recording the live site
(`https://obrio.teriffic.xyz`). Each scene = a short on-screen cue + the narration to read.
UI stays in English; voiceover is Ukrainian. Target length **~3:00**.

## Before recording (checklist)

- **Log in with the access token *before* you start recording** (so the token never shows).
- **Pre-warm** Nebula (`1459969523`) and Co-Star once before recording — the dashboard and
  Compare then load instantly, and the loading animation still plays its smooth ~3s build
  on a cache hit (so you show it without a 30s wait).
- Full-screen browser, hide the bookmarks bar, 1920×1080, no other tabs, reduce-motion off.
- Quiet room, mic check. Have the GitHub repo tab ready for the final shot.

---

### Scene 1 — Home / particle hero · ~0:00–0:15

Привіт! Це **Review Atlas** — мій інструмент для аналізу відгуків з Apple App Store. Я зробив
його як тестове завдання для OBRIO. Ідея проста: береш будь-який застосунок — і за пару
хвилин маєш повну картину: метрики, настрої, болі користувачів і що з цим робити. І все це
працює наживо.

### Scene 2 — Type "Nebula" → 3D loading scene · ~0:15–0:38

Шукати можна прямо за назвою. Введу «Nebula»… ось вона. Тисну — і поки система тягне сотню
відгуків та проганяє їх через аналіз, ці частинки складаються в галактику. Кожна частинка —
окремий відгук, кожен кластер — етап обробки.

### Scene 3 — Dashboard, slow scroll · ~0:38–1:20

І ось дашборд. Угорі — справжня назва й іконка з App Store. Середній рейтинг, розподіл зірок,
баланс настроїв. А далі найцікавіше — головні негативні теми з живими цитатами з відгуків.
Бачите — у Nebula майже все болить про гроші: несподівані списання, неможливість скасувати
підписку. І одразу поруч — конкретні рекомендації. Нижче — динаміка рейтингу в часі та за
версіями, емоції, таксономія проблем, і навіть випадки, коли зірок п'ять, а текст — суцільний
негатив.

### Scene 4 — "View all reviews" → filters → download · ~1:20–1:42

Можна провалитися в самі відгуки — усі сто. Відфільтрувати за зірками чи настроєм, відкрити
будь-який, а сирі дані — забрати у JSON або CSV.

### Scene 5 — Compare (Nebula vs Co-Star) · ~1:42–2:08

А тепер моє улюблене — порівняння. Nebula проти Co-Star. Та сама ніша, астрологія, але болі
абсолютно різні. У Nebula це монетизація й довіра. А в Co-Star — технічна надійність: вхід,
вильоти застосунку. Дані самі розповідають історію.

### Scene 6 — API Docs → Swagger `/docs` · ~2:08–2:30

Під капотом — справжній REST API на FastAPI. Повністю задокументований, з інтерактивним
Swagger: будь-який ендпоінт можна смикнути напряму.

### Scene 7 — About / the diagrams · ~2:30–3:00

Але серце проекту — це AI. Інсайти будує граф на **LangGraph**: класифікація, синтез і
детермінований критик, який відкидає теми, не підтверджені відгуками. Моделі дешеві, швидкі й
від різних вендорів: Qwen класифікує, Gemini синтезує. Промпти я дистилював під сильнішу
модель-вчителя — і точність піднялась із дев'яноста трьох до дев'яноста чотирьох відсотків. А
кожен виклик моделі видно в **Langfuse**.

### Scene 8 — GitHub / v1.0.0 release · ~3:00–3:15

Усе задеплоєно через Docker і nginx на звичайному VPS, з автоматичним TLS. Код, документація
і реліз версії 1.0 — на GitHub. Дякую за перегляд!

---

## Tips

- If you run long, **Scene 3** is the densest — trim a sentence there first.
- Say the keywords clearly — **OBRIO**, **LangGraph**, **Langfuse**, multi-model routing,
  distillation — those are the signals reviewers listen for.
- Prefer the cached path (smooth ~3s loader) over a real fresh fetch (~25s) for a clean cut.
