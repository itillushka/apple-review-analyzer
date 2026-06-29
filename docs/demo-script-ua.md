# Demo video — read-aloud script (Ukrainian)

Confident, natural narration — professional but human (it's a job-application demo, not a
sales pitch). Read top to bottom while screen-recording the live site
(`https://obrio.teriffic.xyz`). UI stays in English. Target length **~2:30–3:00**.

## Before recording (checklist)

- **Log in with the access token *before* you start recording** (so the token never shows).
- **Pre-warm** Nebula (`1459969523`) and Co-Star once — then the dashboard and Compare load
  instantly, and the loading animation still plays its smooth ~3s build on a cache hit.
- Full-screen browser, hide the bookmarks bar, 1920×1080, no other tabs, reduce-motion off.
- Quiet room, mic check. Have the GitHub tab ready for the last shot.

---

### Scene 1 — Home / particle hero

Вітаю. Покажу проект, який я зробив як тестове завдання для OBRIO — Review Atlas. Це
застосунок для аналізу відгуків з Apple App Store: він збирає відгуки на будь-який застосунок,
рахує метрики й формує висновки — що користувачам подобається, що ні, і на що варто звернути
увагу. Усе працює наживо, тож пройдемось по реальному прикладу.

### Scene 2 — Type "Nebula" → 3D loading scene

Шукати застосунок можна за назвою — введу «Nebula». Поки система збирає сотню відгуків і
проганяє їх через аналіз, вони візуалізуються ось такою анімацією — кожна частинка відповідає
одному відгуку.

### Scene 3 — Dashboard, slow scroll

І ось результат. Угорі — назва та іконка застосунку. Далі середній рейтинг, розподіл оцінок і
баланс настроїв. Ключова частина — основні теми скарг, причому з реальними цитатами з
відгуків. У Nebula видно, що більшість претензій стосуються оплати: несподівані списання,
складне скасування підписки. Поруч — конкретні рекомендації, що варто покращити. Нижче —
динаміка рейтингу в часі та за версіями, розклад емоцій і таксономія проблем.

### Scene 4 — "View all reviews" → filters → download

Можна перейти до самих відгуків — усіх ста. Тут є фільтри за оцінкою та настроєм, а сирі дані
можна вивантажити у JSON або CSV.

### Scene 5 — Compare (Nebula vs Co-Star)

Окремо є порівняння двох застосунків. Для прикладу — Nebula і Co-Star, обидва з ніші
астрології. Цікаво, що проблеми в них принципово різні: у Nebula це монетизація й довіра, а в
Co-Star — технічна стабільність: вхід в акаунт, вильоти. Однакова категорія — різні слабкі
місця.

### Scene 6 — API Docs → Swagger `/docs`

За інтерфейсом стоїть повноцінний REST API на FastAPI — задокументований, з інтерактивним
Swagger. Будь-який запит можна виконати напряму й одразу побачити відповідь.

### Scene 7 — About / the diagrams

Найбільше уваги я приділив AI-частині. Аналіз побудований не на одному промпті, а на графі
LangGraph: класифікація, формування тем і окремий детермінований крок, який перевіряє, чи
підтверджені теми відгуками, і відкидає вигадані. Моделі я обрав дешеві та швидкі, з різних
вендорів — одна відповідає за класифікацію, інша за висновки. Промпти додатково дистильовані
під сильнішу модель, щоб підняти точність. Усі виклики моделей трасуються в Langfuse.

### Scene 8 — GitHub / v1.0.0 release

Проект задеплоєний на власному сервері через Docker і nginx, з автоматичним TLS. Код,
документація і реліз — у репозиторії на GitHub. Дякую за увагу.

---

## Tips

- Read it at a relaxed, even pace — confident, not rushed. Short pauses between scenes help.
- If you run long, Scene 3 is the densest — drop a sentence there.
- Names to keep clear: OBRIO, LangGraph, Langfuse — state them plainly, no need to over-stress.
