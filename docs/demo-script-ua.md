# Demo video — read-aloud script (Ukrainian)

Casual, conversational narration — read it like you're showing a friend what you built, not
like an ad. Read top to bottom while screen-recording the live site
(`https://obrio.teriffic.xyz`). UI stays in English. Target length **~2:30–3:00**.

## Before recording (checklist)

- **Log in with the access token *before* you start recording** (so the token never shows).
- **Pre-warm** Nebula (`1459969523`) and Co-Star once — then the dashboard and Compare load
  instantly, and the loading animation still plays its smooth ~3s build on a cache hit.
- Full-screen browser, hide the bookmarks bar, 1920×1080, no other tabs, reduce-motion off.
- Quiet room, mic check. Have the GitHub tab ready for the last shot.

---

### Scene 1 — Home / particle hero

Окей, давай покажу, що я зробив. Це Review Atlas — штука для аналізу відгуків з App Store.
Робив як тестове для OBRIO. Суть проста: береш будь-який застосунок, а воно збирає відгуки й
показує, що людям заходить, що бісить, і що з цим робити. Все працює онлайн, зараз покажу.

### Scene 2 — Type "Nebula" → 3D loading scene

Шукати можна просто за назвою — пишу «Nebula». Тисну, і поки воно збирає сотню відгуків та
проганяє їх через аналіз, тут крутиться оця анімація з частинок. Кожна точка — типу один
відгук, для наочності.

### Scene 3 — Dashboard, slow scroll

Ну от, готово. Зверху — назва й іконка самого застосунку. Далі середній рейтинг, скільки яких
зірок, настрої. А ось це найважливіше — на що люди скаржаться. І не просто список, а з
реальними цитатами з відгуків. Видно, що у Nebula майже всі претензії про гроші: списали без
попередження, не можу скасувати підписку. І поруч одразу поради, що варто пофіксити. Нижче ще
рейтинг по часу, по версіях, емоції, і таке інше.

### Scene 4 — "View all reviews" → filters → download

Якщо цікаво — можна відкрити самі відгуки, всі сто. Пофільтрувати, почитати будь-який, і
завантажити собі в JSON або CSV.

### Scene 5 — Compare (Nebula vs Co-Star)

А ось тут можна порівняти два застосунки. Я взяв Nebula і Co-Star — обидва про астрологію. І
що цікаво — проблеми в них зовсім різні. У Nebula це гроші й підписки. А в Co-Star люди
скаржаться, що додаток лагає, не пускає, вилітає. Тема одна, а болить різне.

### Scene 6 — API Docs → Swagger `/docs`

Це не просто сайт — під ним нормальний API на FastAPI. Ось документація, можна зробити
будь-який запит прямо звідси і подивитись відповідь.

### Scene 7 — About / the diagrams

Найбільше я заморочився з AI-частиною. Аналіз робить не один промпт, а ціла схема на
LangGraph: спочатку класифікація, потім збирає теми, а далі окремий крок перевіряє, чи ці теми
реально є у відгуках, і викидає вигадані. Моделі взяв дешеві й швидкі, причому різні — одна
класифікує, інша пише висновки. І ще підкрутив промпти через сильнішу модель, щоб дешеві
працювали точніше. А всі виклики моделей видно у Langfuse.

### Scene 8 — GitHub / v1.0.0 release

Ну і все це задеплоєно на моєму сервері, через Docker і nginx. Код і документація — на GitHub.
Дякую, що подивились!

---

## Tips

- Read it relaxed, like talking — pauses are fine, you don't have to hit every word.
- If you run long, Scene 3 is the densest — drop a sentence there.
- Keep the names in there naturally: OBRIO, LangGraph, Langfuse — but don't over-stress them.
