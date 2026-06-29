// All static content for the app, ported verbatim from the original design.

export function pill(sent) {
  if (sent === 'Positive') return { pillBg: '#8052ff', pillColor: '#ffffff' };
  if (sent === 'Negative') return { pillBg: '#ffb829', pillColor: '#000000' };
  return { pillBg: '#9a9a9a', pillColor: '#000000' };
}

export const reviewsData = [
  { stars: '★★★★★', title: 'Genuinely helpful daily guidance', sentiment: 'Positive', s: 5, version: '8.2.1', date: '2026-05-12', body: 'The morning insights actually land. It has become part of how I start the day — calm, specific, and not the usual vague horoscope filler.', helpful: 14 },
  { stars: '★★☆☆☆', title: 'Charged after I cancelled', sentiment: 'Negative', s: 2, version: '8.2.0', date: '2026-05-09', body: 'Cancelled the trial two days early and still got billed for the year. Support took a week to reply. The product is fine; the billing flow is not.', helpful: 31 },
  { stars: '★★★★☆', title: 'Accurate most days', sentiment: 'Positive', s: 4, version: '8.2.1', date: '2026-05-07', body: 'Four out of five days it feels eerily on point. Would love a way to mark what resonated so it learns.', helpful: 9 },
  { stars: '★★★☆☆', title: 'Good app, pushy paywall', sentiment: 'Neutral', s: 3, version: '8.1.9', date: '2026-05-03', body: 'I like the readings but the upsell appears before I have even seen what the free tier does. Let me reach a first result first.', helpful: 12 },
  { stars: '★☆☆☆☆', title: 'Readings feel generic', sentiment: 'Negative', s: 1, version: '8.1.9', date: '2026-04-28', body: 'After a month it started repeating the same phrasings. Accuracy slipped and it stopped feeling personal.', helpful: 22 },
  { stars: '★★★★★', title: 'My morning ritual', sentiment: 'Positive', s: 5, version: '8.2.0', date: '2026-04-25', body: 'Simple, beautiful, and it nudges me to reflect. Worth the subscription for me.', helpful: 7 },
  { stars: '★★★★☆', title: 'Wish it synced faster', sentiment: 'Positive', s: 4, version: '8.2.1', date: '2026-04-21', body: 'Content is great but switching devices means waiting for a sync that sometimes just stalls until I restart.', helpful: 5 },
  { stars: '★★☆☆☆', title: 'Too many notifications', sentiment: 'Negative', s: 2, version: '8.1.8', date: '2026-04-18', body: 'Three pushes a day is a lot. I turned them all off, which probably is not what they want.', helpful: 16 },
];

export const negThemesData = [
  { rank: '01', label: 'Subscription & billing', freq: '24 mentions', pct: '31%', width: '100%', examples: ['Cancelled the trial two days early and still got billed for the year.', 'Impossible to find where to turn off auto-renew. Felt deliberate.', 'Charged twice in one month and support took a week to reply.'] },
  { rank: '02', label: 'Accuracy of readings', freq: '19 mentions', pct: '24%', width: '77%', examples: ['After a month it started repeating the same phrasings.', 'The readings drifted from what my watch shows — lost trust.', 'Felt eerily on point at first, then generic.'] },
  { rank: '03', label: 'Paywall pressure', freq: '15 mentions', pct: '19%', width: '61%', examples: ['Upsell appears before I have even seen the free tier.', 'Every tap hits a paywall. Let me reach one result first.', 'Hard sell the moment you open the app.'] },
  { rank: '04', label: 'Sync & connectivity', freq: '11 mentions', pct: '14%', width: '45%', examples: ['Switching devices means waiting for a sync that stalls.', 'Had to restart twice before my data showed up.', 'Sync failure reads like the whole app is broken.'] },
  { rank: '05', label: 'Notification noise', freq: '9 mentions', pct: '12%', width: '38%', examples: ['Three pushes a day is a lot — I turned them all off.', 'No granular control over which notifications I get.', 'The reminders feel naggy rather than helpful.'] },
];

export const insightsData = [
  { tag: 'Billing', text: 'Rework the subscription flow — billing confusion drives nearly a third of negative reviews. Clearer pricing and an obvious cancel path would blunt the loudest complaint.' },
  { tag: 'Trust', text: 'Audit reading accuracy against device sensors. Users trust the number on screen, and when it drifts they stop trusting the whole app.' },
  { tag: 'Onboarding', text: 'Soften paywall pressure early on. Let new users reach a first meaningful result before the upsell appears.' },
  { tag: 'Reliability', text: 'Add a visible connection-health indicator. Sync failures read as the app being broken, even when the hardware is at fault.' },
];

export const stack = ['FastAPI', 'LangGraph', 'Langfuse', 'OpenRouter', 'gpt-5.5 (teacher)', 'React', 'Vite', 'Tailwind', 'Docker'];

export const tiers = [
  { name: 'Curious', price: '$0', per: '/ forever', blurb: '100 reviews · all metrics · AI insights', cta: 'Still free', recommended: false, border: 'rgba(255,255,255,0.14)', btnBg: 'transparent', btnBorder: '#ffffff', btnColor: '#ffffff' },
  { name: 'Captain ★', price: '$0', per: '/ forever', blurb: 'everything + API access + compare apps', cta: 'Also free', recommended: true, border: '#8052ff', btnBg: '#8052ff', btnBorder: '#8052ff', btnColor: '#ffffff' },
  { name: 'Enterprise', price: "let's talk", per: '', blurb: "it's a test task", cta: 'Hire me instead 😄', recommended: false, border: 'rgba(255,255,255,0.14)', btnBg: 'transparent', btnBorder: '#ffffff', btnColor: '#ffffff' },
];

export const apiSidebarGroups = [
  { group: 'Overview', items: [{ id: 'intro', label: 'Introduction' }, { id: 'conventions', label: 'Conventions' }] },
  { group: 'Reviews', items: [{ id: 'collect', label: 'POST /collect' }, { id: 'download', label: 'GET /reviews/download' }] },
  { group: 'Analysis', items: [{ id: 'metrics', label: 'GET /metrics' }, { id: 'insights', label: 'GET /insights' }, { id: 'analyze', label: 'GET /analyze' }] },
  { group: 'System', items: [{ id: 'health', label: 'GET /health' }] },
];

export const endpoints = [
  {
    id: 'collect', group: 'Reviews', method: 'POST', path: '/collect',
    desc: 'Collect reviews for an app and return collection metadata (counts, sources). Does not run analysis.',
    params: [
      ['app_id', 'string', '— (required)', 'Numeric App Store id, e.g. 1459969523'],
      ['region', 'enum', 'europe', 'europe · asia · africa'],
      ['limit', 'int', '100', '1–500 reviews to sample'],
    ],
    fields: [
      ['requested / available / returned', 'how many were asked for, found, and returned'],
      ['countries', 'storefronts the reviews came from, e.g. ["de","gb"]'],
      ['sort_orders', 'Apple feeds sampled — mostrecent, mosthelpful'],
      ['warning', 'null, or a note when fewer than requested were available'],
    ],
    curl: 'curl -X POST http://localhost:8100/collect \\\n  -H "Content-Type: application/json" \\\n  -d \'{"app_id":"1459969523","region":"europe","limit":100}\'',
    json: '{\n  "app_id": "1459969523",\n  "region": "europe",\n  "requested": 100,\n  "available": 100,\n  "returned": 100,\n  "countries": ["de", "gb"],\n  "sort_orders": ["mostrecent", "mosthelpful"],\n  "warning": null\n}',
  },
  {
    id: 'metrics', group: 'Analysis', method: 'GET', path: '/metrics',
    desc: 'Rating metrics only — fast, no translation, no LLM.',
    params: [
      ['app_id', 'string', '— (required)', 'Numeric App Store id'],
      ['region', 'enum', 'europe', 'europe · asia · africa'],
      ['limit', 'int', '100', '1–500 reviews to sample'],
    ],
    fields: [
      ['metrics.total / average', 'count and mean rating across the sample'],
      ['distribution / distribution_pct', '1–5★ counts and percentages'],
      ['top_box_pct / bottom_box_pct', 'share of 4–5★ and 1–2★'],
      ['by_version / trend / by_country', 'breakdowns over version, month, storefront'],
    ],
    curl: 'curl "http://localhost:8100/metrics?app_id=1459969523&region=europe&limit=100"',
    json: '{\n  "collected": { "app_id": "1459969523", "returned": 100, "countries": ["de","gb"] },\n  "metrics": {\n    "total": 100,\n    "average": 3.24,\n    "distribution": { "1": 38, "2": 1, "3": 5, "4": 11, "5": 45 },\n    "top_box_pct": 56.0,\n    "bottom_box_pct": 39.0,\n    "by_version": [ { "version": "6.45.0", "count": 5, "average": 4.0 } ],\n    "trend": [ { "month": "2026-05", "count": 31, "average": 3.9 } ]\n  }\n}',
  },
  {
    id: 'insights', group: 'Analysis', method: 'GET', path: '/insights',
    desc: 'Sentiment, emotions, taxonomy, negative themes, and actionable recommendations. Runs the full pipeline (cached).',
    params: [
      ['app_id', 'string', '— (required)', 'Numeric App Store id'],
      ['region', 'enum', 'europe', 'europe · asia · africa'],
      ['refresh', 'bool', 'false', 'Recompute instead of returning the cached analysis'],
    ],
    fields: [
      ['backend', '"llm" — generated by the OpenRouter multi-model pipeline'],
      ['sentiment_distribution / _pct', 'positive · neutral · negative'],
      ['emotion_distribution / taxonomy', 'emotion counts and bug/feature/ux/pricing buckets'],
      ['negative_themes', 'ranked themes with count, share, and example quotes'],
      ['actionable', 'recommended product fixes, in priority order'],
    ],
    curl: 'curl "http://localhost:8100/insights?app_id=1459969523&region=europe"',
    json: '{\n  "backend": "llm",\n  "sentiment_pct": { "positive": 50.0, "neutral": 9.0, "negative": 41.0 },\n  "emotion_distribution": { "satisfaction": 38, "anger": 21, "frustration": 15 },\n  "taxonomy": { "ux": 6, "pricing": 29, "other": 5 },\n  "negative_themes": [\n    { "theme": "Unauthorized subscription charges", "count": 28, "share": 70.0 }\n  ],\n  "actionable": [\n    "Require explicit opt-in for recurring subscriptions with clear terms."\n  ]\n}',
  },
  {
    id: 'analyze', group: 'Analysis', method: 'GET', path: '/analyze',
    desc: 'The full analysis in one call: collection metadata + rating metrics + insights. Cached per (app_id, region); pass refresh=true to recompute.',
    params: [
      ['app_id', 'string', '— (required)', 'Numeric App Store id'],
      ['region', 'enum', 'europe', 'europe · asia · africa'],
      ['limit', 'int', '100', '1–500 reviews to sample'],
      ['refresh', 'bool', 'false', 'Recompute instead of returning cache'],
    ],
    fields: [
      ['collected', 'collection metadata (returned, countries)'],
      ['metrics', 'the full rating-metrics object'],
      ['insights', 'the full insights object (backend, sentiment, themes…)'],
    ],
    curl: 'curl "http://localhost:8100/analyze?app_id=1459969523&region=europe&limit=100"',
    json: '{\n  "app_id": "1459969523",\n  "region": "europe",\n  "collected": { "returned": 100, "countries": ["de", "gb"] },\n  "metrics":   { "average": 3.24, "top_box_pct": 56.0 },\n  "insights":  { "backend": "llm", "sentiment_pct": { "negative": 41.0 } }\n}',
  },
  {
    id: 'download', group: 'Reviews', method: 'GET', path: '/reviews/download',
    desc: 'Download the raw collected reviews as JSON or CSV (browser-friendly attachment).',
    params: [
      ['app_id', 'string', '— (required)', 'Numeric App Store id'],
      ['format', 'enum', 'json', 'json (default) or csv'],
    ],
    fields: [
      ['CSV columns', 'id, rating, title, content, content_en, country,'],
      ['', 'version, updated, vote_count, vote_sum'],
    ],
    curl: 'curl -OJ "http://localhost:8100/reviews/download?app_id=1459969523&format=csv"',
    json: '[\n  {\n    "id": "10293...",\n    "rating": 5,\n    "title": "Genuinely helpful",\n    "content_en": "The morning insights actually land.",\n    "country": "de",\n    "version": "8.2.1"\n  }\n]',
  },
  {
    id: 'health', group: 'System', method: 'GET', path: '/health',
    desc: 'Liveness probe for uptime checks / the reverse proxy.',
    params: [],
    fields: [
      ['status', '"ok" when the service is live'],
      ['service / version', 'service name and semver'],
    ],
    curl: 'curl "http://localhost:8100/health"',
    json: '{\n  "status": "ok",\n  "service": "Apple Store Review Analysis API",\n  "version": "0.1.0"\n}',
  },
];
