# Demo video — script & storyboard (Ukrainian voiceover)

Target length: **~3:00–3:15**. Screen recording of the live site
(`https://obrio.teriffic.xyz`) with a Ukrainian voiceover. UI stays in English.

## Before recording (checklist)

- **Pre-authenticate**: enter the access token once *before* you start recording (so the
  token never appears on screen). The browser remembers it.
- **Pre-warm the cache**: open Nebula (`1459969523`) and Co-Star once before recording so
  the dashboard/Compare load instantly. The loading animation still plays its smooth ~3s
  build even on a cache hit, so you'll show it without a 30s wait.
- Full-screen the browser, hide the bookmarks bar, 1920×1080, light/no other tabs.
- Reduce-motion off (so particles animate). Sound: quiet room, mic check.
- Optional: have the GitHub repo tab open for the closing shot.

---

## Scene 1 — Intro · 0:00–0:15

**On screen:** Home page — hero with the particle cosmos, slow scroll to show the headline
and the search field.

**Voiceover (UA):**
> Привіт! Це **Review Atlas** — інструмент аналізу відгуків з Apple App Store, який я
> зробив як тестове завдання для OBRIO. Він збирає близько сотні відгуків будь-якого
> застосунку, рахує метрики і генерує AI-інсайти. І все це працює наживо — ось на цьому
> сайті.

## Scene 2 — Search by name + loading · 0:15–0:38

**On screen:** Click the search field, type **"Nebula"** → the autocomplete dropdown shows
matching apps with icons → click **Nebula** → the 3D particle loading scene plays.

**Voiceover (UA):**
> Шукати можна просто за назвою — почнімо з Nebula. Поки система збирає й аналізує відгуки,
> частинки складаються в галактику: кожна частинка — це відгук, а кожен кластер — окремий
> етап обробки. Збір, переклад, оцінка настрою, пошук тем.

## Scene 3 — Dashboard walkthrough · 0:38–1:20

**On screen:** The dashboard appears (Nebula logo + name at top). Slowly scroll: the four
summary cards → rating distribution → sentiment donut → negative themes (hover one to show
the example quote) → actionable insights → rating-over-time + by-version → emotions +
taxonomy + mismatch.

**Voiceover (UA):**
> Ось дашборд. Угорі — реальна назва й іконка застосунку. Середній рейтинг, розподіл зірок
> у відсотках, розклад настроїв і чистий сентимент. Нижче — топові негативні теми з
> **реальними цитатами** з відгуків. У Nebula це переважно скарги на оплату: несанкціоновані
> списання, складне скасування підписки. Поруч — конкретні рекомендації, що з цим робити.
> Далі — рейтинг у часі та за версіями, розклад емоцій, таксономія по багах, фічах, UX і
> цінах, і навіть розбіжність «зірки проти тексту» — коли оцінка висока, а текст негативний.

## Scene 4 — Reviews explorer + download · 1:20–1:42

**On screen:** Click **"View all reviews"** → the explorer. Filter by star and by sentiment,
click one review to open its popup, then open the **Download** modal (JSON / CSV). Use the
back arrow to return.

**Voiceover (UA):**
> Можна переглянути всі сто відгуків, відфільтрувати за зірками чи настроєм, відкрити
> будь-який, а сирі дані — вивантажити у JSON або CSV. Один клік — і назад на дашборд.

## Scene 5 — Compare · 1:42–2:08

**On screen:** Nav → **Compare**. Show the Nebula vs Co-Star table, the side-by-side donuts
and the pain-point bars.

**Voiceover (UA):**
> Найцікавіше — сторінка порівняння: Nebula проти Co-Star. Однакова категорія — астрологія —
> але зовсім різні болі. У Nebula проблема в монетизації й довірі. А в Co-Star — в
> надійності: користувачі скаржаться на вхід і вильоти застосунку. Дані самі розповідають
> історію.

## Scene 6 — API Docs / Swagger · 2:08–2:30

**On screen:** Nav → **API Docs** (scroll briefly), then open `/docs` in a new tab and run
`GET /analyze` once to show a live JSON response.

**Voiceover (UA):**
> Під капотом це повноцінний REST API на FastAPI — повністю задокументований, з інтерактивним
> Swagger. Будь-який ендпоінт можна викликати напряму й одразу побачити відповідь.

## Scene 7 — About / the AI story · 2:30–3:00

**On screen:** Nav → **About**. Scroll to the **System Architecture** and **AI / Insights
Pipeline** diagrams; let them sit on screen while you narrate.

**Voiceover (UA):**
> І головне — AI. Інсайти будує граф на **LangGraph**: класифікація, синтез і детермінований
> критик, який викидає теми, не підтверджені відгуками. Моделі дешеві, швидкі й з різних
> вендорів — Qwen для класифікації, Gemini для синтезу. Промпти **дистильовані** під сильнішу
> модель-вчителя — згода зросла з дев'яноста трьох до дев'яноста чотирьох відсотків. А кожен
> виклик трейситься в **Langfuse**.

## Scene 8 — Wrap · 3:00–3:15

**On screen:** Switch to the GitHub repo / the v1.0.0 release page.

**Voiceover (UA):**
> Усе задеплоєно через Docker і nginx на звичайному VPS, із автоматичним TLS. Код,
> документація і реліз версії 1.0 — на GitHub. Дякую за перегляд!

---

## Notes

- If you'd rather show a **fresh** analysis (real ~25s collection), pick an app that wasn't
  pre-warmed and cut/speed-up the wait in editing — but the cached path with the smooth ~3s
  loader is cleaner for a demo.
- Keep each scene tight; if you run long, Scene 3 is the one to trim (it's the densest).
- Mention "OBRIO" and "LangGraph / Langfuse / multi-model routing / distillation" clearly —
  those are the signals the reviewers are listening for.
