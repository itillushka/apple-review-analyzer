import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, s } from './ui.jsx';
import { reviewsData, negThemesData, insightsData, stack, tiers, endpoints, apiSidebarGroups, pill } from './data.js';
import { highlight } from './highlight.jsx';
import Particles from './Particles.jsx';
import Loading from './Loading.jsx';
import ArchDiagram from './ArchDiagram.jsx';
import PipelineDiagram from './PipelineDiagram.jsx';
import { analyze as apiAnalyze, getReviews, downloadReviews, verifyToken, setToken, clearToken, parseAppId } from './api.js';

const REDUCE = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const starPath = 'M12 2 L15 9 L22 9.3 L16.5 13.8 L18.5 21 L12 17 L5.5 21 L7.5 13.8 L2 9.3 L9 9 Z';
const StarsFull = () => (
  <span style={{ display: 'flex', gap: '2px', paddingBottom: '8px' }}>
    {[0, 1, 2, 3, 4].map(i => (
      <svg key={i} width="13" height="13" viewBox="0 0 24 24" fill="#ffffff"><path d={starPath} /></svg>
    ))}
  </span>
);

export default function App() {
  const [view, setView] = useState('home');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeReview, setActiveReview] = useState(null);
  const [activeTheme, setActiveTheme] = useState(null);
  const [errorTitle, setErrorTitle] = useState('Invalid app ID');
  const [codeTabs, setCodeTabs] = useState({});
  const [activeEndpoint, setActiveEndpoint] = useState('collect');
  const [pricingModal, setPricingModal] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [tokenError, setTokenError] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [appId, setAppId] = useState('1459969523');
  const [reviewsReal, setReviewsReal] = useState(null);
  const [loadDone, setLoadDone] = useState(false); // analysis resolved → let the loader finish its bar
  const pendingRef = useRef(null);                 // holds the resolved analysis until the loader hands off

  // Skip the gate when the backend is open (no ACCESS_TOKEN) or a stored token is valid.
  useEffect(() => {
    verifyToken().then(() => setAuthed(true)).catch(() => {});
  }, []);

  // Lazily load the real reviews when the explorer is opened.
  useEffect(() => {
    if (view !== 'reviews' || reviewsReal) return;
    getReviews(appId).then(setReviewsReal).catch(() => setReviewsReal([]));
  }, [view, appId, reviewsReal]);

  const contentRef = useRef(null);
  const lineRef = useRef(null);
  const viewRef = useRef('home');
  const spyLock = useRef(0);
  const loadT = useRef(null);

  viewRef.current = view;
  const modalAnim = REDUCE ? 'none' : 'ra-up .2s cubic-bezier(.16,1,.3,1) both';

  // ---- read remembered auth on first mount ----
  useEffect(() => {
    try { if (localStorage.getItem('ra_authed') === '1') setAuthed(true); } catch (e) {}
  }, []);

  // ---- brief scroll-lock on first load so the intro settles ----
  useEffect(() => {
    if (REDUCE) return;
    const root = document.documentElement;
    root.style.overflow = 'hidden';
    window.scrollTo(0, 0);
    const t = setTimeout(() => { root.style.overflow = ''; }, 1900);
    return () => { clearTimeout(t); root.style.overflow = ''; };
  }, []);

  const go = useCallback((v) => {
    setView((cur) => {
      if (cur === v) return cur;
      window.scrollTo(0, 0);
      return v;
    });
  }, []);
  const nav = (v) => (e) => { if (e) e.preventDefault(); go(v); };

  const startAnalyze = (e) => {
    if (e) e.preventDefault();
    let val = '';
    if (e && e.target) { const inp = e.target.querySelector ? e.target.querySelector('input') : null; val = inp ? inp.value.trim() : (e.target.value || '').trim(); }
    const id = parseAppId(val) || '1459969523'; // empty input → demo (Nebula)
    setAppId(id);
    setReviewsReal(null);
    pendingRef.current = null;
    setLoadDone(false);
    setView('loading');
    window.scrollTo(0, 0);
    apiAnalyze(id, 'europe', 100)
      // Stash the result and let the loader walk its bar to 100% before handing off
      // (see the loading view's onDone) — no abrupt cut, no instant-full bar.
      .then((res) => { pendingRef.current = res; setLoadDone(true); })
      .catch((err) => { setErrorTitle(err.message || 'Analysis failed'); setView('error'); window.scrollTo(0, 0); });
  };

  // ---- reveal / count-up / grow / line draw, on view change ----
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    const reveals = root.querySelectorAll('[data-reveal]');
    reveals.forEach((el, i) => {
      el.style.opacity = '';
      el.style.transform = '';
      if (REDUCE) { el.style.animation = 'none'; return; }
      const delay = Math.min(i * 55, 520);
      el.style.animation = 'none';
      void el.offsetHeight;
      el.style.animation = 'ra-up .6s cubic-bezier(.16,1,.3,1) ' + delay + 'ms both';
    });
    const safety = setTimeout(() => {
      root.querySelectorAll('[data-reveal]').forEach(el => { el.style.animation = 'none'; el.style.opacity = '1'; el.style.transform = 'none'; });
    }, 900);

    root.querySelectorAll('[data-count]').forEach(el => countUp(el));
    root.querySelectorAll('[data-grow]').forEach(el => {
      const target = el.getAttribute('data-grow');
      if (!target) return;
      const axis = /px$/.test(target) ? 'height' : 'width';
      if (REDUCE) { el.style[axis] = target; return; }
      el.style.transition = 'none'; el.style[axis] = '0'; void el.offsetHeight;
      el.style.transition = axis + ' .8s cubic-bezier(.16,1,.3,1) .15s';
      requestAnimationFrame(() => { el.style[axis] = target; });
    });
    const line = lineRef.current;
    if (line && !REDUCE) {
      try {
        const len = line.getTotalLength();
        line.style.transition = 'none';
        line.style.strokeDasharray = len;
        line.style.strokeDashoffset = len;
        void line.getBoundingClientRect();
        line.style.transition = 'stroke-dashoffset 1s cubic-bezier(.16,1,.3,1) .2s';
        requestAnimationFrame(() => { line.style.strokeDashoffset = '0'; });
      } catch (e) {}
    }
    return () => clearTimeout(safety);
  }, [view]);

  // ---- scroll-spy for API docs (rAF poll) ----
  useEffect(() => {
    if (view !== 'apidocs') return;
    let raf;
    const tick = () => {
      if (!(spyLock.current && Date.now() < spyLock.current)) {
        const secs = document.querySelectorAll('[data-endpoint]');
        if (secs.length) {
          const lineY = 110;
          let best = null, bestTop = -Infinity;
          secs.forEach(sec => {
            const top = sec.getBoundingClientRect().top;
            if (top <= lineY && top > bestTop) { bestTop = top; best = sec; }
          });
          if (!best) best = secs[0];
          const id = best.getAttribute('data-endpoint');
          if (id) setActiveEndpoint((cur) => (cur === id ? cur : id));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [view]);

  function countUp(el) {
    const raw = el.getAttribute('data-count');
    const m = raw.match(/^([+-]?)(\d+(?:\.\d+)?)(.*)$/);
    if (!m || REDUCE) { el.textContent = raw; return; }
    const sign = m[1], end = parseFloat(m[2]), suffix = m[3];
    const dec = (m[2].split('.')[1] || '').length;
    const dur = 800, t0 = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = sign + (end * ease(p)).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const scrollToEp = (id) => {
    spyLock.current = Date.now() + 900;
    setActiveEndpoint(id);
    const el = document.querySelector('[data-endpoint="' + id + '"]');
    if (el) { const y = el.getBoundingClientRect().top + window.scrollY - 96; window.scrollTo({ top: y, behavior: REDUCE ? 'auto' : 'smooth' }); }
  };

  // ---- derived: filtered reviews ----
  const q = (search || '').trim().toLowerCase();
  const capSent = (x) => (x ? x[0].toUpperCase() + x.slice(1) : 'Neutral');
  const reviewsSource = (reviewsReal || []).map((r) => ({
    s: r.rating,
    stars: '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating),
    title: r.title || '(no title)',
    body: r.content || '',
    sentiment: capSent(r.sentiment),
    version: r.version || '—',
    date: r.date || '',
    helpful: r.vote_count || 0,
    country: (r.country || '').toUpperCase(),
  }));
  const visibleReviews = reviewsSource.filter(r => {
    let ok = true;
    if (['5', '4', '3', '2', '1'].includes(filter)) ok = r.s === parseInt(filter, 10);
    else if (filter === 'positive') ok = r.sentiment === 'Positive';
    else if (filter === 'neutral') ok = r.sentiment === 'Neutral';
    else if (filter === 'negative') ok = r.sentiment === 'Negative';
    if (ok && q) ok = (r.title + ' ' + r.body).toLowerCase().includes(q);
    return ok;
  }).map((r) => ({ ...r, ...pill(r.sentiment), meta: 'v' + r.version + ' · ' + r.date + ' · ' + r.country }));

  const chipDefs = [
    { id: 'all', label: 'All' }, { id: '5', label: '5★' }, { id: '4', label: '4★' }, { id: '3', label: '3★' }, { id: '2', label: '2★' }, { id: '1', label: '1★' },
    { id: 'positive', label: 'Positive' }, { id: 'neutral', label: 'Neutral' }, { id: 'negative', label: 'Negative' },
  ];

  const navColor = (v) => (view === v ? '#ffffff' : '#9a9a9a');
  const submitToken = (e) => {
    if (e) e.preventDefault();
    const form = e && (e.currentTarget || e.target);
    const inp = form && form.querySelector ? form.querySelector('input') : null;
    const val = inp ? inp.value.trim() : '';
    setToken(val);
    verifyToken()
      .then(() => { setAuthed(true); setTokenError(false); })
      .catch(() => { clearToken(); setTokenError(true); });
  };

  return (
    <div style={s("position:relative;min-height:100vh;width:100%;background:transparent;color:#fff;font-family:'Space Grotesk',ui-sans-serif,system-ui,sans-serif;font-weight:400;letter-spacing:0.025em;-webkit-font-smoothing:antialiased")}>

      <Particles viewRef={viewRef} />

      <div style={{ position: 'relative', zIndex: 2 }}>

        {/* TOP NAV */}
        <header style={s("position:sticky;top:0;z-index:20;width:100%;border-bottom:1px solid rgba(255,255,255,0.10);backdrop-filter:blur(8px);background:rgba(0,0,0,0.35)")}>
          <div style={s("max-width:1200px;margin:0 auto;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;gap:24px")}>
            <a href="#" onClick={nav('home')} style={s("display:flex;align-items:center;gap:12px;text-decoration:none;cursor:pointer")}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 8 L12 3 L21 8 L21 16 L12 21 L3 16 Z" stroke="#8052ff" strokeWidth="1.5" strokeLinejoin="round" /><path d="M3 8 L12 13 L21 8 M12 13 L12 21" stroke="#8052ff" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              <span style={s("font-weight:600;font-size:16px;letter-spacing:0.04em;color:#fff")}>REVIEW ATLAS</span>
            </a>
            <nav style={s("display:flex;align-items:center;gap:30px;font-size:14px;letter-spacing:0.021em")}>
              <a href="#" onClick={nav('dashboard')} style={{ color: navColor('dashboard'), textDecoration: 'none', cursor: 'pointer' }}>Analyze</a>
              <a href="#" onClick={nav('compare')} style={{ color: navColor('compare'), textDecoration: 'none', cursor: 'pointer' }}>Compare</a>
              <a href="#" onClick={nav('apidocs')} style={{ color: navColor('apidocs'), textDecoration: 'none', cursor: 'pointer' }}>API Docs</a>
              <a href="#" onClick={nav('pricing')} style={{ color: navColor('pricing'), textDecoration: 'none', cursor: 'pointer' }}>Pricing</a>
              <a href="#" onClick={nav('about')} style={{ color: navColor('about'), textDecoration: 'none', cursor: 'pointer' }}>About</a>
            </nav>
            <span style={s("border:1px solid #8052ff;color:#8052ff;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;padding:7px 14px;border-radius:24px;white-space:nowrap")}>OBRIO · Test Task</span>
          </div>
        </header>

        <main ref={contentRef} style={s("min-height:calc(100vh - 130px)")}>

          {view === 'home' && <Home nav={nav} startAnalyze={startAnalyze} />}
          {view === 'loading' && (
            <Loading
              done={loadDone}
              onDone={() => {
                setAnalysis(pendingRef.current);
                setLoadDone(false);
                setView('dashboard');
                window.scrollTo(0, 0);
              }}
            />
          )}
          {view === 'error' && <ErrorView errorTitle={errorTitle} onRetry={nav('home')} />}
          {view === 'dashboard' && <Dashboard nav={nav} lineRef={lineRef} openDownload={() => setModalOpen(true)} analysis={analysis} appId={appId} onTheme={setActiveTheme} startAnalyze={startAnalyze} />}
          {view === 'reviews' && (
            <Reviews
              chipDefs={chipDefs} filter={filter} setFilter={setFilter}
              search={search} setSearch={setSearch}
              visibleReviews={visibleReviews} onReview={setActiveReview}
              openDownload={() => setModalOpen(true)}
            />
          )}
          {view === 'compare' && <Compare />}
          {view === 'about' && <About />}
          {view === 'apidocs' && (
            <ApiDocs
              activeEndpoint={activeEndpoint} scrollToEp={scrollToEp}
              codeTabs={codeTabs} setCodeTabs={setCodeTabs}
            />
          )}
          {view === 'pricing' && <Pricing onPlan={() => setPricingModal(true)} />}

        </main>

        {/* DOWNLOAD POPUP */}
        {modalOpen && (
          <div onClick={() => setModalOpen(false)} style={s("position:fixed;inset:0;z-index:50;background:rgba(0,0,0,0.66);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:24px;animation:ra-up .25s cubic-bezier(.16,1,.3,1) both")}>
            <div onClick={(e) => e.stopPropagation()} style={s("background:#000;border:1px solid rgba(255,255,255,0.18);border-radius:24px;padding:36px;max-width:420px;width:100%;display:flex;flex-direction:column;gap:24px")}>
              <div style={s("display:flex;align-items:flex-start;justify-content:space-between;gap:12px")}>
                <div style={s("display:flex;flex-direction:column;gap:10px")}>
                  <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#8052ff")}>Export</span>
                  <span style={s("font-weight:300;font-size:27px;letter-spacing:-0.01em")}>Download raw data</span>
                </div>
                <Box as="button" onClick={() => setModalOpen(false)} css="background:transparent;border:none;color:#9a9a9a;font-size:24px;line-height:1;cursor:pointer;padding:0" hover="color:#ffffff">×</Box>
              </div>
              <span style={s("font-size:15px;line-height:1.5;color:#bdbdbd")}>The collected reviews for this app, straight from Apple's public RSS. Choose a format.</span>
              <div style={s("display:flex;gap:12px")}>
                <Box as="button" onClick={() => { downloadReviews(appId, 'europe', 'json'); setModalOpen(false); }} css="flex:1;background:#8052ff;border:none;border-radius:24px;color:#fff;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding:15px;cursor:pointer;transition:transform .18s" hover="transform:scale(1.02)" active="transform:scale(0.98)">JSON</Box>
                <Box as="button" onClick={() => { downloadReviews(appId, 'europe', 'csv'); setModalOpen(false); }} css="flex:1;background:transparent;border:1px solid #ffffff;border-radius:24px;color:#fff;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding:15px;cursor:pointer;transition:background .2s" hover="background:rgba(255,255,255,0.06)">CSV</Box>
              </div>
              <span style={s("font-size:12px;color:#9a9a9a")}>Data from Apple's public RSS · no tracking.</span>
            </div>
          </div>
        )}

        {/* REVIEW-DETAIL POPUP */}
        {activeReview && (
          <div onClick={() => setActiveReview(null)} style={{ ...s("position:fixed;inset:0;z-index:50;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:24px"), animation: modalAnim }}>
            <div onClick={(e) => e.stopPropagation()} style={s("background:#000;border:1px solid rgba(255,255,255,0.18);border-radius:24px;padding:36px;max-width:520px;width:100%;display:flex;flex-direction:column;gap:18px;max-height:84vh;overflow-y:auto")}>
              <div style={s("display:flex;align-items:flex-start;justify-content:space-between;gap:12px")}>
                <span style={s("color:#ffb829;font-size:16px;letter-spacing:3px")}>{activeReview.stars}</span>
                <Box as="button" onClick={() => setActiveReview(null)} css="background:transparent;border:none;color:#9a9a9a;font-size:24px;line-height:1;cursor:pointer;padding:0" hover="color:#ffffff">×</Box>
              </div>
              <div style={s("display:flex;align-items:center;gap:12px;flex-wrap:wrap")}>
                <span style={s("font-weight:600;font-size:22px;letter-spacing:0.021em;color:#fff")}>{activeReview.title}</span>
                <span style={{ ...s("font-size:11px;text-transform:uppercase;letter-spacing:0.06em;padding:4px 10px;border-radius:24px"), background: activeReview.pillBg, color: activeReview.pillColor }}>{activeReview.sentiment}</span>
              </div>
              <span style={s("font-size:13px;color:#9a9a9a;letter-spacing:0.021em")}>{activeReview.meta}</span>
              <p style={s("font-size:17px;line-height:1.6;color:#fff;letter-spacing:0.025em")}>{activeReview.body}</p>
              <span style={s("font-size:13px;color:#9a9a9a;border-top:1px solid rgba(255,255,255,0.10);padding-top:18px")}>▲ {activeReview.helpful} helpful</span>
            </div>
          </div>
        )}

        {/* THEME-DETAIL POPUP */}
        {activeTheme && (
          <div onClick={() => setActiveTheme(null)} style={{ ...s("position:fixed;inset:0;z-index:50;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:24px"), animation: modalAnim }}>
            <div onClick={(e) => e.stopPropagation()} style={s("background:#000;border:1px solid rgba(255,255,255,0.18);border-radius:24px;padding:36px;max-width:560px;width:100%;display:flex;flex-direction:column;gap:18px;max-height:84vh;overflow-y:auto")}>
              <div style={s("display:flex;align-items:flex-start;justify-content:space-between;gap:12px")}>
                <div style={s("display:flex;flex-direction:column;gap:10px")}>
                  <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Negative theme</span>
                  <span style={s("font-weight:600;font-size:24px;letter-spacing:0.021em;color:#fff")}>{activeTheme.label}</span>
                </div>
                <Box as="button" onClick={() => setActiveTheme(null)} css="background:transparent;border:none;color:#9a9a9a;font-size:24px;line-height:1;cursor:pointer;padding:0" hover="color:#ffffff">×</Box>
              </div>
              <div style={s("display:flex;flex-direction:column;gap:8px")}>
                <span style={s("font-size:14px;color:#bdbdbd")}>{activeTheme.freq} · {activeTheme.pct} of negatives</span>
                <div style={s("height:3px;background:rgba(255,255,255,0.07);border-radius:24px;overflow:hidden;max-width:100%")}><div style={{ ...s("height:100%;background:#ffb829;border-radius:24px"), width: activeTheme.width }}></div></div>
              </div>
              <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a;margin-top:6px")}>Example reviews</span>
              <div style={s("display:flex;flex-direction:column")}>
                {activeTheme.examples.map((ex, i) => (
                  <p key={i} style={s("font-size:15px;line-height:1.5;color:#bdbdbd;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.08)")}>“{ex}”</p>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* PRICING JOKE POPUP */}
        {pricingModal && (
          <div onClick={() => setPricingModal(false)} style={{ ...s("position:fixed;inset:0;z-index:50;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;padding:24px"), animation: modalAnim }}>
            <div onClick={(e) => e.stopPropagation()} style={s("background:#000;border:1px solid rgba(255,255,255,0.18);border-radius:24px;padding:40px;max-width:460px;width:100%;display:flex;flex-direction:column;gap:18px;text-align:center;align-items:center")}>
              <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#8052ff")}>Pricing</span>
              <span style={s("font-weight:300;font-size:40px;line-height:1;letter-spacing:-0.03em")}>What pricing? 😄</span>
              <p style={s("font-size:16px;line-height:1.6;color:#bdbdbd")}>Це тестове завдання для OBRIO — there's no pricing, it's a take-home; everything's free.</p>
              <Box as="button" onClick={() => setPricingModal(false)} css="margin-top:6px;background:#8052ff;border:none;border-radius:24px;color:#fff;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding:14px 32px;cursor:pointer;transition:transform .18s" hover="transform:scale(1.02)" active="transform:scale(0.98)">Got it</Box>
              <Box as="a" href="#" onClick={(e) => { e.preventDefault(); setPricingModal(false); }} css="font-size:13px;color:#9a9a9a;text-decoration:none" hover="color:#fff">See the 'plans' anyway →</Box>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer style={s("border-top:1px solid rgba(255,255,255,0.10)")}>
          <div style={s("max-width:1200px;margin:0 auto;padding:24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px")}>
            <span style={s("font-size:12px;color:#9a9a9a;letter-spacing:0.025em")}>A test assignment for OBRIO / Nebula — built by Illia Pastushok</span>
            <span style={s("font-size:12px;color:#9a9a9a;letter-spacing:0.025em")}>Data from Apple's public RSS · no tracking · <Box as="a" href="#" onClick={(e) => e.preventDefault()} css="color:#9a9a9a;text-decoration:none" hover="color:#fff">GitHub ↗</Box></span>
          </div>
        </footer>

      </div>

      {/* TOKEN GATE */}
      {!authed && (
        <div style={s("position:fixed;inset:0;z-index:100;background:#000;display:flex;align-items:center;justify-content:center;padding:24px")}>
          <div style={s("max-width:440px;width:100%;display:flex;flex-direction:column;gap:24px;text-align:center;align-items:center")}>
            <div style={s("display:flex;align-items:center;gap:12px")}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 8 L12 3 L21 8 L21 16 L12 21 L3 16 Z" stroke="#8052ff" strokeWidth="1.5" strokeLinejoin="round" /><path d="M3 8 L12 13 L21 8 M12 13 L12 21" stroke="#8052ff" strokeWidth="1.5" strokeLinejoin="round" /></svg>
              <span style={s("font-weight:600;font-size:16px;letter-spacing:0.04em;color:#fff")}>REVIEW ATLAS</span>
            </div>
            <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#8052ff")}>Private preview</span>
            <h1 style={s("font-weight:300;font-size:40px;line-height:0.95;letter-spacing:-0.03em;color:#fff")}>Enter your access token</h1>
            <p style={s("font-size:15px;line-height:1.55;color:#bdbdbd;max-width:38ch")}>This take-home is shared privately. Drop in the token to review it — your browser will be remembered after that.</p>
            <form onSubmit={submitToken} style={s("display:flex;flex-direction:column;gap:12px;width:100%;max-width:340px")}>
              <Box as="input" type="password" placeholder="Access token…" autoFocus
                css={"background:#000;border:1px solid " + (tokenError ? '#ffb829' : '#bdbdbd') + ";border-radius:24px;color:#fff;font-size:15px;letter-spacing:0.025em;padding:14px 22px;outline:none;text-align:center"}
                focus="border-color:#8052ff" />
              {tokenError && <span style={s("font-size:13px;color:#ffb829;letter-spacing:0.025em")}>That token didn't match. Try again.</span>}
              <Box as="button" type="submit" css="background:#8052ff;border:none;border-radius:24px;color:#fff;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding:14px 28px;cursor:pointer;transition:transform .18s" hover="transform:scale(1.02)" active="transform:scale(0.98)">Unlock</Box>
            </form>
            <span style={s("font-size:12px;color:#9a9a9a;letter-spacing:0.025em")}>A test assignment for OBRIO / Nebula</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================ HOME ============================ */
function Home({ nav, startAnalyze }) {
  return (
    <div>
      <section style={s("position:relative;min-height:78vh;display:flex;align-items:center;justify-content:center;overflow:hidden")}>
        <div style={s("position:relative;z-index:2;max-width:1200px;width:100%;padding:90px 24px;text-align:center;display:flex;flex-direction:column;align-items:center")}>
          <div data-reveal="" data-hero="" style={s("font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#8052ff;margin-bottom:24px")}>Apple Store Review Intelligence</div>
          <h1 data-reveal="" data-hero="" style={s("font-weight:300;font-size:clamp(54px,9vw,96px);line-height:0.85;letter-spacing:-0.04em;color:#fff;max-width:13ch")}>Find the signal in millions of voices.</h1>
          <p data-reveal="" data-hero="" style={s("font-weight:300;font-size:18px;line-height:1.5;letter-spacing:0.025em;color:#bdbdbd;max-width:54ch;margin-top:30px")}>Collect, score and decode Apple App Store reviews — sentiment, themes, and the fixes that matter, in one pass.</p>
          <span data-reveal="" data-hero="" style={s("font-size:13px;color:#9a9a9a;letter-spacing:0.025em;margin-top:14px")}>Any app · multilingual reviews analyzed in their original language · private, no tracking.</span>
          <form data-reveal="" onSubmit={startAnalyze} style={s("margin-top:36px;display:flex;gap:12px;width:100%;max-width:560px;flex-wrap:wrap;justify-content:center")}>
            <Box as="input" type="text" placeholder="App Store URL or app ID…" css="flex:1;min-width:240px;background:rgba(0,0,0,0.55);border:1px solid #bdbdbd;border-radius:24px;color:#fff;font-size:15px;letter-spacing:0.025em;padding:14px 22px;outline:none" focus="border-color:#8052ff" />
            <Box as="button" type="submit" css="background:#8052ff;border:none;border-radius:24px;color:#fff;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding:14px 28px;cursor:pointer;transition:transform .18s" hover="transform:scale(1.02)" active="transform:scale(0.98)">Analyze</Box>
          </form>
          <div data-reveal="" style={s("margin-top:18px;font-size:13px;color:#9a9a9a;letter-spacing:0.025em")}>Try: <Box as="a" href="#" onClick={startAnalyze} css="color:#bdbdbd;text-decoration:none" hover="color:#fff">Nebula (1459969523)</Box> · <Box as="a" href="#" onClick={nav('compare')} css="color:#bdbdbd;text-decoration:none" hover="color:#fff">Co–Star (1264782561)</Box></div>
        </div>
      </section>

      <section style={s("max-width:1200px;margin:0 auto;padding:60px 24px;display:flex;flex-direction:column;gap:36px")}>
        <div data-reveal="" style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>How it works</div>
        <div style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:0")}>
          <div data-reveal="" style={s("padding:30px 30px 30px 0;border-right:1px solid rgba(255,255,255,0.10);display:flex;flex-direction:column;gap:14px")}>
            <span style={s("font-weight:300;font-size:42px;color:#ffb829;letter-spacing:-0.02em")}>01</span>
            <span style={s("font-weight:600;font-size:18px")}>Collect 100 reviews</span>
            <span style={s("font-size:15px;line-height:1.5;color:#bdbdbd")}>Pulled straight from Apple's public RSS — by region (Europe / Asia / Africa), resilient to per-storefront gaps, no API keys.</span>
          </div>
          <div data-reveal="" style={s("padding:30px;border-right:1px solid rgba(255,255,255,0.10);display:flex;flex-direction:column;gap:14px")}>
            <span style={s("font-weight:300;font-size:42px;color:#ffb829;letter-spacing:-0.02em")}>02</span>
            <span style={s("font-weight:600;font-size:18px")}>Score with AI + NLP</span>
            <span style={s("font-size:15px;line-height:1.5;color:#bdbdbd")}>Each review is classified for sentiment and clustered into themes by a multi-model LLM pipeline — the original language, no translation needed.</span>
          </div>
          <div data-reveal="" style={s("padding:30px 0 30px 30px;display:flex;flex-direction:column;gap:14px")}>
            <span style={s("font-weight:300;font-size:42px;color:#ffb829;letter-spacing:-0.02em")}>03</span>
            <span style={s("font-weight:600;font-size:18px")}>Get actionable fixes</span>
            <span style={s("font-size:15px;line-height:1.5;color:#bdbdbd")}>A ranked read-out of what hurts and what to fix — product advice, not raw data.</span>
          </div>
        </div>
      </section>

      <section style={s("max-width:1200px;margin:0 auto;padding:60px 24px 96px;display:flex;flex-direction:column;gap:18px")}>
        <div data-reveal="" style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Why this exists</div>
        <p data-reveal="" style={s("font-weight:300;font-size:24px;line-height:1.3;letter-spacing:0.021em;color:#fff;max-width:34ch")}>A test assignment for OBRIO — built to analyze Nebula's own App Store reviews.</p>
        <Box as="a" data-reveal="" href="#" onClick={nav('about')} css="font-size:14px;color:#8052ff;text-decoration:none;letter-spacing:0.025em;width:fit-content" hover="opacity:0.8">Read the approach →</Box>
      </section>
    </div>
  );
}

/* ============================ ERROR ============================ */
function ErrorView({ errorTitle, onRetry }) {
  return (
    <div style={s("min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;text-align:center;padding:24px")}>
      <svg width="92" height="92" viewBox="0 0 120 120" fill="none" aria-hidden="true" style={{ marginBottom: '6px', opacity: 0.85 }}>
        <circle cx="34" cy="40" r="2.5" fill="#8052ff" /><circle cx="86" cy="34" r="2" fill="#bdbdbd" /><circle cx="60" cy="58" r="3" fill="#ffb829" /><circle cx="40" cy="78" r="2" fill="#bdbdbd" /><circle cx="82" cy="80" r="2.5" fill="#8052ff" /><circle cx="62" cy="30" r="1.6" fill="#9a9a9a" /><circle cx="24" cy="60" r="1.6" fill="#9a9a9a" /><circle cx="96" cy="58" r="1.6" fill="#9a9a9a" />
        <path d="M34 40 L60 58 L86 34 M60 58 L40 78 M60 58 L82 80" stroke="#8052ff" strokeOpacity="0.35" strokeWidth="1" />
      </svg>
      <span style={s("font-weight:600;font-size:24px;letter-spacing:0.021em;color:#fff")}>{errorTitle}</span>
      <span style={s("font-size:15px;color:#9a9a9a;letter-spacing:0.025em;max-width:42ch")}>Check the App Store URL or numeric ID and try again.</span>
      <Box as="button" onClick={onRetry} css="margin-top:12px;background:#8052ff;border:none;border-radius:24px;color:#fff;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding:14px 28px;cursor:pointer;transition:transform .18s" hover="transform:scale(1.02)" active="transform:scale(0.98)">Try again</Box>
    </div>
  );
}

/* ============================ DASHBOARD ============================ */
const distRows = [['5★', '100%', '72'], ['4★', '25%', '18'], ['3★', '7%', '5'], ['2★', '4%', '3'], ['1★', '3%', '2']];
const versionBars = [['48px', '8.2'], ['62px', '8.3'], ['40px', '8.4'], ['74px', '9.0']];

const APP_NAMES = { '1459969523': 'Nebula: Spiritual Guidance', '1264782561': 'Co–Star' };

function Dashboard({ nav, lineRef, openDownload, analysis, appId, onTheme, startAnalyze }) {
  const cardHover = "border-color:rgba(128,82,255,0.6)";

  // No analysis loaded yet (e.g. arrived via the nav "Analyze" link, not a search):
  // show the same app-id search field as the home hero instead of any placeholder
  // numbers. Submitting kicks off the normal loading → dashboard flow via startAnalyze.
  if (!analysis) {
    return (
      <div style={s("max-width:1200px;margin:0 auto;padding:120px 24px;min-height:62vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center")}>
        <div data-reveal="" style={s("font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#8052ff;margin-bottom:20px")}>Apple Store Review Intelligence</div>
        <h1 data-reveal="" style={s("font-weight:300;font-size:clamp(40px,6vw,64px);line-height:0.9;letter-spacing:-0.04em;color:#fff;max-width:16ch")}>Analyze any App Store app.</h1>
        <p data-reveal="" style={s("font-weight:300;font-size:16px;line-height:1.5;letter-spacing:0.025em;color:#bdbdbd;max-width:50ch;margin-top:22px")}>Paste an App Store URL or numeric app ID. We pull 100 recent reviews and score sentiment, themes and the fixes that matter — in one pass.</p>
        <form data-reveal="" onSubmit={startAnalyze} style={s("margin-top:32px;display:flex;gap:12px;width:100%;max-width:560px;flex-wrap:wrap;justify-content:center")}>
          <Box as="input" type="text" placeholder="App Store URL or app ID…" css="flex:1;min-width:240px;background:rgba(0,0,0,0.55);border:1px solid #bdbdbd;border-radius:24px;color:#fff;font-size:15px;letter-spacing:0.025em;padding:14px 22px;outline:none" focus="border-color:#8052ff" />
          <Box as="button" type="submit" css="background:#8052ff;border:none;border-radius:24px;color:#fff;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding:14px 28px;cursor:pointer;transition:transform .18s" hover="transform:scale(1.02)" active="transform:scale(0.98)">Analyze</Box>
        </form>
        <div data-reveal="" style={s("margin-top:18px;font-size:13px;color:#9a9a9a;letter-spacing:0.025em")}>Try: <Box as="a" href="#" onClick={startAnalyze} css="color:#bdbdbd;text-decoration:none" hover="color:#fff">Nebula (1459969523)</Box> · <Box as="a" href="#" onClick={nav('compare')} css="color:#bdbdbd;text-decoration:none" hover="color:#fff">Co–Star (1264782561)</Box></div>
      </div>
    );
  }

  // Derive every displayed value from the real analysis (fallback to demo numbers).
  const m = (analysis && analysis.metrics) || {};
  const ins = (analysis && analysis.insights) || {};
  const col = (analysis && analysis.collected) || {};
  const total = m.total != null ? m.total : 100;
  const avg = m.average != null ? m.average : 4.6;
  const sp = ins.sentiment_pct || { positive: 72, neutral: 18, negative: 10 };
  const posPct = Math.round(sp.positive || 0);
  const neuPct = Math.round(sp.neutral || 0);
  const negPct = Math.round(sp.negative || 0);
  const positiveBox = m.top_box_pct != null ? Math.round(m.top_box_pct) : posPct;
  const netRaw = ((sp.positive || 0) - (sp.negative || 0)) / 100;
  const netSent = (netRaw >= 0 ? '+' : '') + netRaw.toFixed(2);
  const dist = m.distribution || { '5': 72, '4': 18, '3': 5, '2': 3, '1': 2 };
  // Bars read as a share of all reviews — the five rows sum to ~100%, not relative to the tallest bar.
  const distTotal = Object.values(dist).reduce((a, b) => a + b, 0) || 1;
  const distRowsD = ['5', '4', '3', '2', '1'].map((k) => {
    const c = dist[k] || 0;
    return [k + '★', Math.round((c / distTotal) * 100) + '%', String(c)];
  });
  const C = 2 * Math.PI * 60; // donut circumference
  const posLen = (posPct / 100) * C, neuLen = (neuPct / 100) * C, negLen = (negPct / 100) * C;
  const negThemesD = (ins.negative_themes || []).map((t, i) => ({
    rank: String(i + 1).padStart(2, '0'),
    label: t.theme,
    freq: t.count + ' mentions',
    pct: Math.round(t.share) + '%',
    width: Math.min(100, Math.round(t.share)) + '%',
    examples: t.examples || [],
  }));
  const insightTags = ['Billing', 'Trust', 'Onboarding', 'Reliability', 'Quality', 'UX'];
  const insightsD = (ins.actionable || []).map((a, i) => ({ tag: insightTags[i] || 'Fix', text: a }));
  const trendArr = m.trend && m.trend.length ? m.trend : null;
  const trendPts = trendArr
    ? trendArr.map((t, i) => {
        const x = trendArr.length === 1 ? 720 : (i / (trendArr.length - 1)) * 720;
        const y = 190 - ((Math.max(1, Math.min(5, t.average)) - 1) / 4) * 150;
        return `${Math.round(x)},${Math.round(y)}`;
      }).join(' ')
    : '0,128 65,140 131,118 196,150 262,110 327,96 393,108 458,82 524,90 589,64 655,72 720,52';
  const versionBarsD = m.by_version && m.by_version.length
    ? m.by_version.slice(0, 6).map((v) => [Math.round((v.average / 5) * 90) + 'px', v.version])
    : versionBars;
  const appName = APP_NAMES[appId] || ('App ' + appId);
  const subtitle = `App Store ID ${(analysis && analysis.app_id) || appId} · ${(col.countries || ['—']).join(', ')} · ${col.returned != null ? col.returned : total} reviews`;
  const engineNote = `Insights engine: ${ins.backend === 'llm' ? 'LLM (OpenRouter multi-model)' : (ins.backend || 'LLM')}.`;
  const TAX_LABELS = { bug: 'Bugs', feature_request: 'Feature requests', ux: 'UX', pricing: 'Pricing & billing', other: 'Other' };
  const tax = ins.taxonomy || {};
  const taxMax = Math.max(1, ...Object.values(tax).length ? Object.values(tax) : [1]);
  const taxonomyD = ['bug', 'feature_request', 'ux', 'pricing', 'other']
    .filter((k) => tax[k]).map((k) => [TAX_LABELS[k], tax[k], Math.round((tax[k] / taxMax) * 100) + '%']);
  const emo = ins.emotion_distribution || {};
  const emoMax = Math.max(1, ...Object.values(emo).length ? Object.values(emo) : [1]);
  const emotionD = Object.entries(emo).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => [k, v, Math.round((v / emoMax) * 100) + '%']);
  const mismatchNote = `${ins.mismatch_count || 0} reviews show a star↔text mismatch — a high rating with negative text, or the reverse. Caught automatically.`;
  return (
    <div style={s("max-width:1200px;margin:0 auto;padding:48px 24px 96px;display:flex;flex-direction:column;gap:60px")}>

      <div data-reveal="" style={s("display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:18px")}>
        <div style={s("display:flex;align-items:center;gap:18px")}>
          <div style={s("width:54px;height:54px;border-radius:14px;background:linear-gradient(0deg,#000,#000),#8052ff;border:1px solid rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden")}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="7" stroke="#8052ff" strokeWidth="1.5" /><circle cx="12" cy="12" r="2.4" fill="#ffb829" /></svg>
          </div>
          <div style={s("display:flex;flex-direction:column;gap:6px")}>
            <span style={s("font-weight:600;font-size:24px;letter-spacing:0.021em")}>{appName}</span>
            <span style={s("font-size:13px;color:#9a9a9a;letter-spacing:0.021em")}>{subtitle}</span>
          </div>
        </div>
        <div style={s("display:flex;gap:12px;flex-wrap:wrap")}>
          <Box as="button" onClick={nav('reviews')} css="background:transparent;border:1px solid rgba(255,255,255,0.25);border-radius:24px;color:#bdbdbd;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding:13px 24px;cursor:pointer;transition:all .2s" hover="color:#fff;border-color:#ffffff">View all reviews →</Box>
          <Box as="button" onClick={openDownload} css="background:transparent;border:1px solid #ffffff;border-radius:24px;color:#fff;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding:13px 24px;cursor:pointer;transition:background .2s" hover="background:rgba(255,255,255,0.06)">Download · JSON/CSV</Box>
        </div>
      </div>

      {/* summary cards */}
      <section style={s("display:grid;grid-template-columns:repeat(4,1fr);gap:24px")}>
        <Box data-reveal="" css="border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:24px;background:#000;display:flex;flex-direction:column;gap:12px" hover={cardHover}>
          <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Average rating</span>
          <div style={s("display:flex;align-items:flex-end;gap:12px")}>
            <span data-count={String(avg)} style={s("font-weight:300;font-size:48px;line-height:1;letter-spacing:-0.02em")}>{avg}</span>
            <StarsFull />
          </div>
          <span style={s("font-size:12px;color:#bdbdbd")}>across {total} reviews</span>
        </Box>
        <Box data-reveal="" css="border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:24px;background:#000;display:flex;flex-direction:column;gap:12px" hover={cardHover}>
          <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Total reviews</span>
          <span data-count={String(total)} style={s("font-weight:300;font-size:48px;line-height:1;letter-spacing:-0.02em")}>{total}</span>
          <span style={s("font-size:12px;color:#bdbdbd")}>{(col.countries || ['—']).join(', ')}</span>
        </Box>
        <Box data-reveal="" css="border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:24px;background:#000;display:flex;flex-direction:column;gap:12px" hover={cardHover}>
          <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Positive</span>
          <span data-count={positiveBox + '%'} style={s("font-weight:300;font-size:48px;line-height:1;letter-spacing:-0.02em;color:#8052ff")}>{positiveBox}%</span>
          <span style={s("font-size:12px;color:#bdbdbd")}>4–5★</span>
        </Box>
        <Box data-reveal="" css="border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:24px;background:#000;display:flex;flex-direction:column;gap:12px" hover={cardHover}>
          <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Net sentiment</span>
          <div style={s("display:flex;align-items:center;gap:10px")}>
            <span data-count={netSent} style={s("font-weight:300;font-size:48px;line-height:1;letter-spacing:-0.02em")}>{netSent}</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginBottom: '4px' }}><path d="M12 19 L12 5 M12 5 L6 11 M12 5 L18 11" stroke="#15846e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </div>
          <span style={s("font-size:12px;color:#bdbdbd")}>trending up vs. last month</span>
        </Box>
      </section>

      {/* charts */}
      <section style={s("display:grid;grid-template-columns:1fr 1fr;gap:24px")}>
        <div data-reveal="" style={s("border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:24px;background:#000;display:flex;flex-direction:column;gap:18px")}>
          <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Rating distribution</span>
          <div style={s("display:flex;flex-direction:column;gap:14px;margin-top:6px")}>
            {distRowsD.map(([lab, w, n]) => (
              <div key={lab} style={s("display:flex;align-items:center;gap:12px")}><span style={s("width:28px;font-size:14px;color:#bdbdbd")}>{lab}</span><div style={s("flex:1;height:8px;background:rgba(255,255,255,0.08);border-radius:24px;overflow:hidden")}><div data-grow={w} style={s(`width:${w};height:100%;background:#8052ff;border-radius:24px`)}></div></div><span style={s("width:28px;text-align:right;font-size:14px")}>{n}</span></div>
            ))}
          </div>
        </div>
        <div data-reveal="" style={s("border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:24px;background:#000;display:flex;flex-direction:column;gap:18px")}>
          <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Sentiment split</span>
          <div style={s("display:flex;align-items:center;gap:30px;flex:1")}>
            <svg width="150" height="150" viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
              <circle cx="80" cy="80" r="60" fill="none" stroke="#8052ff" strokeWidth="20" strokeDasharray={`${posLen} ${C}`} transform="rotate(-90 80 80)" />
              <circle cx="80" cy="80" r="60" fill="none" stroke="#9a9a9a" strokeWidth="20" strokeDasharray={`${neuLen} ${C}`} strokeDashoffset={-posLen} transform="rotate(-90 80 80)" />
              <circle cx="80" cy="80" r="60" fill="none" stroke="#ffb829" strokeWidth="20" strokeDasharray={`${negLen} ${C}`} strokeDashoffset={-(posLen + neuLen)} transform="rotate(-90 80 80)" />
              <text x="80" y="76" textAnchor="middle" fill="#fff" fontFamily="Space Grotesk" fontWeight="300" fontSize="30">{posPct}%</text>
              <text x="80" y="94" textAnchor="middle" fill="#9a9a9a" fontFamily="Space Grotesk" fontSize="10" letterSpacing="1">POSITIVE</text>
            </svg>
            <div style={s("display:flex;flex-direction:column;gap:14px")}>
              <div style={s("display:flex;align-items:center;gap:10px")}><span style={s("width:10px;height:10px;border-radius:3px;background:#8052ff")}></span><span style={s("font-size:14px;color:#fff")}>Positive</span><span style={s("font-size:14px;color:#9a9a9a;margin-left:auto")}>{posPct}%</span></div>
              <div style={s("display:flex;align-items:center;gap:10px")}><span style={s("width:10px;height:10px;border-radius:3px;background:#9a9a9a")}></span><span style={s("font-size:14px;color:#fff")}>Neutral</span><span style={s("font-size:14px;color:#9a9a9a;margin-left:auto")}>{neuPct}%</span></div>
              <div style={s("display:flex;align-items:center;gap:10px")}><span style={s("width:10px;height:10px;border-radius:3px;background:#ffb829")}></span><span style={s("font-size:14px;color:#fff")}>Negative</span><span style={s("font-size:14px;color:#9a9a9a;margin-left:auto")}>{negPct}%</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* trend */}
      <section data-reveal="" style={s("border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:24px;background:#000;display:flex;flex-direction:column;gap:18px")}>
        <div style={s("display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:8px")}>
          <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Rating over time</span>
          <span style={s("font-size:12px;color:#9a9a9a")}>last 12 months · by app version</span>
        </div>
        <div style={s("display:flex;gap:30px;align-items:stretch;flex-wrap:wrap")}>
          <svg viewBox="0 0 720 200" preserveAspectRatio="none" style={{ flex: 1, minWidth: '320px', height: '200px' }}>
            <line x1="0" y1="40" x2="720" y2="40" stroke="#ffffff" strokeOpacity="0.07" />
            <line x1="0" y1="90" x2="720" y2="90" stroke="#ffffff" strokeOpacity="0.07" />
            <line x1="0" y1="140" x2="720" y2="140" stroke="#ffffff" strokeOpacity="0.07" />
            <line x1="0" y1="190" x2="720" y2="190" stroke="#ffffff" strokeOpacity="0.07" />
            <polyline ref={lineRef} points={trendPts} fill="none" stroke="#8052ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div style={s("display:flex;flex-direction:column;gap:10px;min-width:160px;justify-content:center")}>
            <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Rating by version</span>
            <div style={s("display:flex;align-items:flex-end;gap:10px;height:90px")}>
              {versionBarsD.map(([h, lab]) => (
                <div key={lab} style={s("flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;justify-content:flex-end;height:100%")}><div data-grow={h} style={s(`width:100%;height:${h};background:#8052ff;border-radius:6px`)}></div><span style={s("font-size:11px;color:#9a9a9a")}>{lab}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* negative themes */}
      <section data-reveal="" style={s("display:flex;flex-direction:column;gap:24px")}>
        <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Where it hurts</span>
        <div style={s("display:flex;flex-direction:column")}>
          {negThemesD.map((t) => (
            <Box key={t.rank} onClick={() => onTheme(t)} css="display:grid;grid-template-columns:28px 1fr 220px 18px;align-items:center;gap:18px;padding:18px 0;border-bottom:1px solid rgba(255,255,255,0.08);cursor:pointer;transition:opacity .2s" hover="opacity:0.72">
              <span style={s("font-size:14px;color:#9a9a9a;font-variant-numeric:tabular-nums")}>{t.rank}</span>
              <div style={s("display:flex;flex-direction:column;gap:8px")}>
                <span style={s("font-weight:600;font-size:18px;letter-spacing:0.021em")}>{t.label}</span>
                <div style={s("height:3px;background:rgba(255,255,255,0.07);border-radius:24px;overflow:hidden;max-width:420px")}><div data-grow={t.width} style={s(`height:100%;background:#ffb829;border-radius:24px;width:${t.width}`)}></div></div>
              </div>
              <span style={s("font-size:14px;color:#bdbdbd;text-align:right;letter-spacing:0.021em")}>{t.freq} · {t.pct} of negatives</span>
              <span style={s("font-size:14px;color:#9a9a9a")}>→</span>
            </Box>
          ))}
        </div>
      </section>

      {/* taxonomy + emotion + mismatch */}
      <section data-reveal="" style={s("display:grid;grid-template-columns:1fr 1fr;gap:24px")}>
        <div style={s("border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:24px;background:#000;display:flex;flex-direction:column;gap:18px")}>
          <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Issue taxonomy</span>
          <div style={s("display:flex;flex-direction:column;gap:14px;margin-top:6px")}>
            {taxonomyD.length === 0 && <span style={s("font-size:14px;color:#9a9a9a")}>No negative issues to categorize.</span>}
            {taxonomyD.map(([lab, n, w]) => (
              <div key={lab} style={s("display:flex;align-items:center;gap:12px")}><span style={s("width:120px;font-size:14px;color:#bdbdbd")}>{lab}</span><div style={s("flex:1;height:8px;background:rgba(255,255,255,0.08);border-radius:24px;overflow:hidden")}><div data-grow={w} style={s(`width:${w};height:100%;background:#8052ff;border-radius:24px`)}></div></div><span style={s("width:28px;text-align:right;font-size:14px")}>{n}</span></div>
            ))}
          </div>
          <span style={s("font-size:12px;color:#9a9a9a;letter-spacing:0.021em")}>{mismatchNote}</span>
        </div>
        <div style={s("border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:24px;background:#000;display:flex;flex-direction:column;gap:18px")}>
          <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Emotion breakdown</span>
          <div style={s("display:flex;flex-direction:column;gap:14px;margin-top:6px")}>
            {emotionD.length === 0 && <span style={s("font-size:14px;color:#9a9a9a")}>No emotion signal.</span>}
            {emotionD.map(([lab, n, w]) => (
              <div key={lab} style={s("display:flex;align-items:center;gap:12px")}><span style={s("width:120px;font-size:14px;color:#bdbdbd;text-transform:capitalize")}>{lab}</span><div style={s("flex:1;height:8px;background:rgba(255,255,255,0.08);border-radius:24px;overflow:hidden")}><div data-grow={w} style={s(`width:${w};height:100%;background:#ffb829;border-radius:24px`)}></div></div><span style={s("width:28px;text-align:right;font-size:14px")}>{n}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* insights */}
      <section data-reveal="" style={s("display:flex;flex-direction:column;gap:24px")}>
        <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>What to fix</span>
        <div style={s("display:grid;grid-template-columns:1fr 1fr;gap:24px")}>
          {insightsD.map((it, i) => (
            <Box key={i} css="border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:24px;background:#000;display:flex;gap:18px;align-items:flex-start" hover="border-color:rgba(128,82,255,0.5)">
              <span style={s("width:8px;height:8px;border-radius:50%;background:#15846e;flex-shrink:0;margin-top:10px")}></span>
              <div style={s("display:flex;flex-direction:column;gap:8px")}>
                <span style={s("font-weight:600;font-size:14px;letter-spacing:0.05em;text-transform:uppercase;color:#8052ff")}>{it.tag}</span>
                <p style={s("font-weight:400;font-size:18px;line-height:1.5;letter-spacing:0.025em;color:#fff")}>{it.text}</p>
              </div>
            </Box>
          ))}
        </div>
        <span style={s("font-size:12px;color:#9a9a9a;letter-spacing:0.025em;margin-top:6px")}>{engineNote}</span>
      </section>
    </div>
  );
}

/* ============================ REVIEWS ============================ */
function Reviews({ chipDefs, filter, setFilter, search, setSearch, visibleReviews, onReview, openDownload }) {
  return (
    <div style={s("max-width:1200px;margin:0 auto;padding:48px 24px 96px;display:flex;flex-direction:column;gap:36px")}>
      <div data-reveal="" style={s("display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:12px")}>
        <span style={s("font-weight:300;font-size:48px;letter-spacing:-0.04em")}>Reviews</span>
        <span style={s("font-size:13px;color:#9a9a9a")}>Apple App Store reviews · translated to English · most recent + most helpful</span>
      </div>

      <div data-reveal="" style={s("display:flex;flex-direction:column;gap:18px")}>
        <div style={s("display:flex;gap:10px;flex-wrap:wrap;align-items:center")}>
          {chipDefs.map((c) => {
            const active = filter === c.id;
            const css = "border:1px solid " + (active ? '#8052ff' : 'rgba(255,255,255,0.16)') + ";background:" + (active ? '#8052ff' : 'transparent') + ";color:" + (active ? '#ffffff' : '#bdbdbd') + ";font-size:13px;letter-spacing:0.021em;padding:8px 16px;border-radius:24px;cursor:pointer;transition:all .18s";
            return <button key={c.id} onClick={() => setFilter(c.id)} style={s(css)}>{c.label}</button>;
          })}
        </div>
        <div style={s("display:flex;gap:12px;flex-wrap:wrap;align-items:center")}>
          <Box as="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search reviews…" css="flex:1;min-width:240px;background:rgba(0,0,0,0.55);border:1px solid #bdbdbd;border-radius:24px;color:#fff;font-size:14px;padding:12px 20px;outline:none" focus="border-color:#8052ff" />
          <Box as="button" onClick={openDownload} css="background:transparent;border:1px solid #ffffff;border-radius:24px;color:#fff;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding:12px 22px;cursor:pointer" hover="background:rgba(255,255,255,0.06)">Download · JSON/CSV</Box>
        </div>
      </div>

      <div style={s("display:flex;flex-direction:column")}>
        {visibleReviews.map((r, i) => (
          <Box key={i} data-reveal="" onClick={() => onReview(r)} css="display:flex;flex-direction:column;gap:10px;padding:24px 0;border-bottom:1px solid rgba(255,255,255,0.08);cursor:pointer;transition:opacity .2s" hover="opacity:0.78">
            <div style={s("display:flex;align-items:center;gap:14px;flex-wrap:wrap")}>
              <span style={s("color:#ffb829;font-size:14px;letter-spacing:2px")}>{r.stars}</span>
              <span style={s("font-weight:600;font-size:18px;letter-spacing:0.021em")}>{r.title}</span>
              <span style={{ ...s("font-size:11px;text-transform:uppercase;letter-spacing:0.06em;padding:4px 10px;border-radius:24px"), background: r.pillBg, color: r.pillColor }}>{r.sentiment}</span>
              <span style={s("margin-left:auto;font-size:14px;color:#9a9a9a")}>→</span>
            </div>
            <span style={s("font-size:13px;color:#9a9a9a;letter-spacing:0.021em")}>{r.meta}</span>
            <p style={s("font-size:15px;line-height:1.5;color:#bdbdbd;max-width:80ch;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden")}>{r.body}</p>
            <span style={s("font-size:13px;color:#9a9a9a")}>▲ {r.helpful} helpful</span>
          </Box>
        ))}
        {visibleReviews.length === 0 && (
          <div style={s("padding:60px 0;text-align:center;color:#9a9a9a;font-size:15px")}>No reviews match this filter.</div>
        )}
      </div>
    </div>
  );
}

/* ============================ COMPARE ============================ */
const cmpRows = [
  ['Average rating', '4.6', '4.1'],
  ['Positive %', '72%', '64%'],
  ['Net sentiment', '+0.41', '+0.22'],
  ['Top negative theme', 'Subscription & billing', 'Onboarding confusion'],
  ['Most-praised theme', 'Daily guidance', 'Friend compatibility'],
];
const cmpDist = [
  ['5★', '100%', '76%'], ['4★', '34%', '52%'], ['3★', '12%', '28%'], ['2★', '8%', '20%'], ['1★', '6%', '16%'],
];
const nebPain = [['Subscription & billing', '31%', '100%'], ['Accuracy of readings', '24%', '77%'], ['Paywall pressure', '19%', '61%']];
const csPain = [['Onboarding confusion', '28%', '90%'], ['App stability', '22%', '71%'], ['Notification noise', '18%', '58%']];

function Donut({ value, dash1, off2, dash2, off3, dash3, label }) {
  return (
    <div style={s("display:flex;flex-direction:column;align-items:center;gap:10px")}>
      <svg width="110" height="110" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="60" fill="none" stroke="#8052ff" strokeWidth="18" strokeDasharray={dash1} transform="rotate(-90 80 80)" />
        <circle cx="80" cy="80" r="60" fill="none" stroke="#9a9a9a" strokeWidth="18" strokeDasharray={dash2} strokeDashoffset={off2} transform="rotate(-90 80 80)" />
        <circle cx="80" cy="80" r="60" fill="none" stroke="#ffb829" strokeWidth="18" strokeDasharray={dash3} strokeDashoffset={off3} transform="rotate(-90 80 80)" />
        <text x="80" y="86" textAnchor="middle" fill="#fff" fontFamily="Space Grotesk" fontWeight="300" fontSize="26">{value}</text>
      </svg>
      <span style={s("font-size:13px;color:#bdbdbd")}>{label}</span>
    </div>
  );
}

function Compare() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    // Prefer the precomputed Nebula vs Co–Star snapshot (instant, no API call);
    // fall back to a live analysis if the snapshot is missing.
    fetch(`${import.meta.env.BASE_URL}compare.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!Array.isArray(d) || d.length < 2) throw new Error('bad snapshot');
        setData(d);
      })
      .catch(() => {
        Promise.all([apiAnalyze('1459969523', 'europe', 100), apiAnalyze('1264782561', 'europe', 100)])
          .then(setData)
          .catch((e) => setErr(e.message || 'Compare failed'));
      });
  }, []);
  if (err) return (
    <div style={s("max-width:1200px;margin:0 auto;padding:96px 24px;text-align:center;color:#9a9a9a")}>
      <div style={s("font-size:24px;color:#fff;font-weight:300")}>Couldn't compare</div>
      <div style={s("margin-top:8px;font-size:14px")}>{err}</div>
    </div>
  );
  if (!data) return (
    <div style={s("max-width:1200px;margin:0 auto;padding:96px 24px;text-align:center;color:#9a9a9a")}>
      <div style={s("font-size:24px;color:#fff;font-weight:300")}>Loading comparison…</div>
    </div>
  );
  const [A, B] = data;
  const pc = (x) => Math.round(x || 0);
  const net = (ins) => { const r = ((ins.sentiment_pct.positive || 0) - (ins.sentiment_pct.negative || 0)) / 100; return (r >= 0 ? '+' : '') + r.toFixed(2); };
  const topNeg = (ins) => (ins.negative_themes[0] ? ins.negative_themes[0].theme : '—');
  const cmpRows = [
    ['Average rating', String(A.metrics.average), String(B.metrics.average)],
    ['Positive %', pc(A.metrics.top_box_pct) + '%', pc(B.metrics.top_box_pct) + '%'],
    ['Net sentiment', net(A.insights), net(B.insights)],
    ['Top negative theme', topNeg(A.insights), topNeg(B.insights)],
  ];
  const distOf = (mm) => { const tot = Object.values(mm.distribution).reduce((a, b) => a + b, 0) || 1; return (k) => Math.round((mm.distribution[k] || 0) / tot * 100) + '%'; };
  const dA = distOf(A.metrics), dB = distOf(B.metrics);
  const cmpDist = ['5', '4', '3', '2', '1'].map((k) => [k + '★', dA(k), dB(k)]);
  const painOf = (ins) => ins.negative_themes.slice(0, 3).map((t) => [t.theme, Math.round(t.share) + '%', Math.min(100, Math.round(t.share)) + '%']);
  const nebPain = painOf(A.insights), csPain = painOf(B.insights);
  const CIRC = 376.99;
  const donutOf = (ins) => {
    const p = pc(ins.sentiment_pct.positive), n = pc(ins.sentiment_pct.neutral), g = pc(ins.sentiment_pct.negative);
    const pl = (p / 100) * CIRC, nl = (n / 100) * CIRC, gl = (g / 100) * CIRC;
    return { value: p + '%', dash1: `${pl} ${CIRC}`, dash2: `${nl} ${CIRC}`, off2: -pl, dash3: `${gl} ${CIRC}`, off3: -(pl + nl) };
  };
  const donutA = donutOf(A.insights), donutB = donutOf(B.insights);
  return (
    <div style={s("max-width:1200px;margin:0 auto;padding:48px 24px 96px;display:flex;flex-direction:column;gap:60px")}>
      <div data-reveal="" style={s("display:flex;flex-direction:column;gap:18px")}>
        <h2 style={s("font-weight:300;font-size:48px;letter-spacing:-0.04em")}>Nebula vs Co–Star</h2>
        <span style={s("font-size:14px;color:#9a9a9a")}>100 reviews each · Europe region · most recent + most helpful</span>
        <div style={s("display:flex;gap:18px;flex-wrap:wrap;margin-top:6px")}>
          <div style={s("display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,0.14);border-radius:24px;padding:8px 16px")}><span style={s("width:10px;height:10px;border-radius:3px;background:#8052ff")}></span><span style={s("font-size:14px")}>Nebula</span></div>
          <div style={s("display:flex;align-items:center;gap:10px;border:1px solid rgba(255,255,255,0.14);border-radius:24px;padding:8px 16px")}><span style={s("width:10px;height:10px;border-radius:3px;background:#9a9a9a")}></span><span style={s("font-size:14px")}>Co–Star</span></div>
        </div>
      </div>

      <section data-reveal="" style={s("display:flex;flex-direction:column")}>
        <div style={s("display:grid;grid-template-columns:1fr 1fr 1fr;padding:0 0 14px;border-bottom:1px solid rgba(255,255,255,0.14)")}>
          <span></span>
          <span style={s("font-size:14px;font-weight:600;text-align:right")}>Nebula</span>
          <span style={s("font-size:14px;font-weight:600;text-align:right")}>Co–Star</span>
        </div>
        {cmpRows.map(([label, a, b], i) => (
          <div key={i} style={s("display:grid;grid-template-columns:1fr 1fr 1fr;padding:18px 0;border-bottom:1px solid rgba(255,255,255,0.08)")}>
            <span style={s("font-size:15px;color:#bdbdbd")}>{label}</span>
            <span style={{ ...s("text-align:right;font-weight:600"), fontSize: i < 3 ? '18px' : '15px', color: '#8052ff' }}>{a}</span>
            <span style={{ ...s("text-align:right;color:#fff"), fontSize: i < 3 ? '18px' : '15px' }}>{b}</span>
          </div>
        ))}
      </section>

      <section data-reveal="" style={s("display:grid;grid-template-columns:1fr 1fr;gap:24px")}>
        <div style={s("border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:24px;background:#000;display:flex;flex-direction:column;gap:18px")}>
          <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Rating distribution</span>
          <div style={s("display:flex;flex-direction:column;gap:16px;margin-top:6px")}>
            {cmpDist.map(([lab, wa, wb]) => (
              <div key={lab} style={s("display:flex;align-items:center;gap:12px")}><span style={s("width:28px;font-size:13px;color:#bdbdbd")}>{lab}</span><div style={s("flex:1;display:flex;flex-direction:column;gap:5px")}><div style={s("height:7px;background:rgba(255,255,255,0.07);border-radius:24px;overflow:hidden")}><div data-grow={wa} style={s(`width:${wa};height:100%;background:#8052ff;border-radius:24px`)}></div></div><div style={s("height:7px;background:rgba(255,255,255,0.07);border-radius:24px;overflow:hidden")}><div data-grow={wb} style={s(`width:${wb};height:100%;background:#9a9a9a;border-radius:24px`)}></div></div></div></div>
            ))}
          </div>
        </div>
        <div style={s("border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:24px;background:#000;display:flex;flex-direction:column;gap:18px")}>
          <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Sentiment split</span>
          <div style={s("display:flex;align-items:center;justify-content:space-around;gap:18px;flex:1;flex-wrap:wrap")}>
            <Donut {...donutA} label="Nebula" />
            <Donut {...donutB} label="Co–Star" />
          </div>
        </div>
      </section>

      <section data-reveal="" style={s("display:grid;grid-template-columns:1fr 1fr;gap:48px")}>
        <div style={s("display:flex;flex-direction:column;gap:18px")}>
          <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Nebula pain points</span>
          <div style={s("display:flex;flex-direction:column;gap:16px")}>
            {nebPain.map(([name, pct, w]) => (
              <div key={name} style={s("display:flex;flex-direction:column;gap:8px")}><div style={s("display:flex;justify-content:space-between")}><span style={s("font-weight:600;font-size:15px")}>{name}</span><span style={s("font-size:13px;color:#bdbdbd")}>{pct}</span></div><div style={s("height:3px;background:rgba(255,255,255,0.07);border-radius:24px;overflow:hidden")}><div data-grow={w} style={s(`width:${w};height:100%;background:#ffb829`)}></div></div></div>
            ))}
          </div>
        </div>
        <div style={s("display:flex;flex-direction:column;gap:18px")}>
          <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Co–Star pain points</span>
          <div style={s("display:flex;flex-direction:column;gap:16px")}>
            {csPain.map(([name, pct, w]) => (
              <div key={name} style={s("display:flex;flex-direction:column;gap:8px")}><div style={s("display:flex;justify-content:space-between")}><span style={s("font-weight:600;font-size:15px")}>{name}</span><span style={s("font-size:13px;color:#bdbdbd")}>{pct}</span></div><div style={s("height:3px;background:rgba(255,255,255,0.07);border-radius:24px;overflow:hidden")}><div data-grow={w} style={s(`width:${w};height:100%;background:#ffb829`)}></div></div></div>
            ))}
          </div>
        </div>
      </section>

      <section data-reveal="" style={s("display:flex;flex-direction:column;gap:18px")}>
        <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#8052ff")}>Read-out</span>
        <p style={s("font-weight:300;font-size:24px;line-height:1.35;letter-spacing:0.021em;color:#fff;max-width:46ch")}>Nebula leads on every headline metric — higher average rating, more positive reviews, stronger net sentiment. Its risk is concentrated and fixable: billing and paywall friction. Co–Star's pain is spread across onboarding and stability, harder to resolve in one pass.</p>
      </section>
    </div>
  );
}

/* ============================ ABOUT ============================ */
const approachCards = [
  ['Data', "Apple's public RSS feed — no keys, no scraping. ~100 reviews per app across a region (Europe / Asia / Africa), resilient to per-storefront gaps."],
  ['AI', 'A LangGraph graph — classify → synthesize → deterministic critic, with a re-synthesize loop. Cheap top-ranked OpenRouter models (Qwen, Gemini), distilled against a gpt-5.5 teacher.'],
  ['Observability', 'Langfuse traces every graph run — prompts, latencies, token spend.'],
  ['Metrics', 'Version analytics, sentiment scoring, and ranked negative themes — the read-out a PM actually uses.'],
  ['Design', 'The Dala system — particle cosmos on a void, one violet action color, zero shadows.'],
];

function About() {
  return (
    <div style={s("max-width:1200px;margin:0 auto;padding:60px 24px 96px;display:flex;flex-direction:column;gap:60px")}>
      <section data-reveal="" style={s("display:flex;flex-direction:column;gap:18px")}>
        <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#8052ff")}>OBRIO · Test Assignment</span>
        <h1 style={s("font-weight:300;font-size:clamp(44px,7vw,72px);line-height:0.9;letter-spacing:-0.04em;max-width:16ch")}>Apple Store review analysis, end to end.</h1>
        <p style={s("font-size:18px;line-height:1.5;color:#bdbdbd;max-width:60ch")}>Built by Illia Pastushok as a test task for OBRIO / Nebula.</p>
      </section>

      <section data-reveal="" style={s("display:flex;flex-direction:column;gap:18px")}>
        <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>The brief</span>
        <p style={s("font-size:18px;line-height:1.6;color:#fff;max-width:64ch")}>Collect Apple App Store reviews, process and score them for sentiment and themes, surface the metrics that matter, layer AI-written insights on top, expose it all through an API, and present it on a site. This is that site.</p>
      </section>

      <section data-reveal="" style={s("display:flex;flex-direction:column;gap:24px")}>
        <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Approach</span>
        <div style={s("display:grid;grid-template-columns:repeat(2,1fr);gap:24px")}>
          {approachCards.map(([tag, text]) => (
            <div key={tag} style={s("border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:24px;background:#000;display:flex;flex-direction:column;gap:10px")}><span style={s("font-weight:600;font-size:14px;letter-spacing:0.05em;text-transform:uppercase;color:#8052ff")}>{tag}</span><span style={s("font-size:16px;line-height:1.5;color:#bdbdbd")}>{text}</span></div>
          ))}
        </div>
      </section>

      <section data-reveal="" style={s("display:flex;flex-direction:column;gap:18px")}>
        <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Architecture</span>
        <ArchDiagram />
        <span style={s("font-size:12px;color:#9a9a9a")}>RSS ingest → preprocessing → LangGraph scoring → metrics store → FastAPI → this site.</span>
      </section>

      <section data-reveal="" style={s("display:flex;flex-direction:column;gap:18px")}>
        <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>AI / Insights pipeline</span>
        <PipelineDiagram />
        <span style={s("font-size:12px;color:#9a9a9a")}>A LangGraph state graph routes classify → synthesize → critic across cheap top-ranked models, with a deterministic grounding check. Offline prompt distillation lifts the student model's agreement with a gpt-5.5 teacher from 93% to 94% — measured, not assumed.</span>
      </section>

      <section data-reveal="" style={s("display:flex;flex-direction:column;gap:18px")}>
        <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Stack</span>
        <div style={s("display:flex;gap:10px;flex-wrap:wrap")}>
          {stack.map((x) => (
            <span key={x} style={s("font-family:'Space Mono',monospace;font-size:13px;color:#bdbdbd;border:1px solid rgba(255,255,255,0.14);border-radius:24px;padding:8px 16px")}>{x}</span>
          ))}
        </div>
      </section>

      <section data-reveal="" style={s("display:flex;gap:14px;flex-wrap:wrap")}>
        {['GitHub ↗', 'Demo video ↗', 'Sample report ↗'].map((x) => (
          <Box key={x} as="a" href="#" onClick={(e) => e.preventDefault()} css="border:1px solid #ffffff;border-radius:24px;color:#fff;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding:14px 26px;text-decoration:none" hover="background:rgba(255,255,255,0.06)">{x}</Box>
        ))}
      </section>
    </div>
  );
}

/* ============================ API DOCS ============================ */
function EndpointCode({ ep }) {
  const [tab, setTab] = useState('curl');
  const copy = (e) => {
    const txt = tab === 'curl' ? ep.curl : ep.json;
    try { navigator.clipboard && navigator.clipboard.writeText(txt); } catch (err) {}
    const b = e && e.currentTarget; if (b) { const o = b.textContent; b.textContent = 'Copied'; setTimeout(() => { b.textContent = o; }, 1200); }
  };
  const codeText = tab === 'curl' ? ep.curl : ep.json;
  return (
    <div style={s("background:#0a0a0a;border:1px solid rgba(255,255,255,0.14);border-radius:24px;overflow:hidden;display:flex;flex-direction:column")}>
      <div style={s("display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.1);padding:8px 12px")}>
        <div style={s("display:flex;gap:4px")}>
          <button onClick={() => setTab('curl')} style={{ ...s("background:transparent;border:none;font-family:'Space Mono',monospace;font-size:12px;padding:6px 10px;cursor:pointer;transition:color .2s"), borderBottom: '2px solid ' + (tab === 'curl' ? '#8052ff' : 'transparent'), color: tab === 'curl' ? '#ffffff' : '#9a9a9a' }}>cURL</button>
          <button onClick={() => setTab('json')} style={{ ...s("background:transparent;border:none;font-family:'Space Mono',monospace;font-size:12px;padding:6px 10px;cursor:pointer;transition:color .2s"), borderBottom: '2px solid ' + (tab === 'json' ? '#8052ff' : 'transparent'), color: tab === 'json' ? '#ffffff' : '#9a9a9a' }}>JSON</button>
        </div>
        <Box as="button" onClick={copy} css="background:transparent;border:1px solid rgba(255,255,255,0.16);color:#9a9a9a;font-family:'Space Mono',monospace;font-size:11px;padding:5px 12px;border-radius:24px;cursor:pointer;transition:all .2s" hover="color:#fff;border-color:rgba(255,255,255,0.4)">Copy</Box>
      </div>
      <div style={s("padding:18px;overflow-x:auto")}>
        <pre key={ep.id + tab} style={{ margin: 0, fontFamily: "'Space Mono', monospace", fontSize: '12.5px', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', animation: REDUCE ? 'none' : 'ra-up .25s cubic-bezier(.16,1,.3,1) both' }}>{highlight(codeText, tab === 'json')}</pre>
      </div>
    </div>
  );
}

function ApiDocs({ activeEndpoint, scrollToEp }) {
  const methodColor = (m) => (m === 'POST' ? '#8052ff' : '#15846e');
  const methodBg = (m) => (m === 'POST' ? 'rgba(128,82,255,0.14)' : 'rgba(21,132,110,0.16)');
  return (
    <div style={s("max-width:1200px;margin:0 auto;padding:48px 24px 96px;display:flex;flex-direction:column;gap:36px")}>
      <div data-reveal="" style={s("display:flex;flex-direction:column;gap:12px")}>
        <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#8052ff")}>Reference</span>
        <h1 style={s("font-weight:300;font-size:clamp(40px,6vw,64px);line-height:0.95;letter-spacing:-0.04em")}>API Docs</h1>
        <p style={s("font-size:17px;line-height:1.5;color:#bdbdbd;max-width:60ch")}>Collect Apple App Store reviews for any app and analyze them — metrics, sentiment, emotions, themes, and recommendations. JSON over HTTP, open by default.</p>
      </div>

      <div style={s("display:grid;grid-template-columns:220px minmax(0,1fr);gap:48px;align-items:start")}>

        <nav style={s("position:sticky;top:96px;display:flex;flex-direction:column;gap:20px;align-self:start")}>
          {apiSidebarGroups.map((g) => (
            <div key={g.group} style={s("display:flex;flex-direction:column;gap:8px")}>
              <span style={s("font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#9a9a9a")}>{g.group}</span>
              {g.items.map((it) => {
                const active = activeEndpoint === it.id;
                return (
                  <a key={it.id} href="#" onClick={(e) => { e.preventDefault(); scrollToEp(it.id); }} style={{ ...s("font-family:'Space Mono',monospace;font-size:12.5px;text-decoration:none;padding:3px 0 3px 12px;transition:color .2s,border-color .2s"), color: active ? '#8052ff' : '#9a9a9a', borderLeft: '2px solid ' + (active ? '#8052ff' : 'transparent') }}>{it.label}</a>
                );
              })}
            </div>
          ))}
        </nav>

        <div style={s("display:flex;flex-direction:column;gap:48px;min-width:0")}>
          <section data-endpoint="intro" data-reveal="" style={s("display:flex;flex-direction:column;gap:14px")}>
            <h2 style={s("font-weight:600;font-size:24px;letter-spacing:0.021em")}>Introduction</h2>
            <p style={s("font-size:15px;line-height:1.6;color:#bdbdbd")}>Review Atlas wraps Apple's public review RSS with an NLP/LLM analysis pipeline. Every endpoint returns JSON; an interactive Swagger UI is available at <span style={s("font-family:'Space Mono',monospace;color:#fff")}>/docs</span>.</p>
            <div style={s("display:flex;flex-direction:column;gap:0;border:1px solid rgba(255,255,255,0.12);border-radius:24px;overflow:hidden")}>
              <div style={s("display:grid;grid-template-columns:160px 1fr;gap:18px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08)")}><span style={s("font-size:13px;color:#9a9a9a")}>Base URL (local)</span><span style={s("font-family:'Space Mono',monospace;font-size:13px;color:#fff")}>http://localhost:8100</span></div>
              <div style={s("display:grid;grid-template-columns:160px 1fr;gap:18px;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08)")}><span style={s("font-size:13px;color:#9a9a9a")}>Auth</span><span style={s("font-size:13px;color:#bdbdbd")}>optional — set <span style={s("font-family:'Space Mono',monospace;color:#fff")}>ACCESS_TOKEN</span> to require an <span style={s("font-family:'Space Mono',monospace;color:#fff")}>X-Access-Token</span> header; open by default</span></div>
              <div style={s("display:grid;grid-template-columns:160px 1fr;gap:18px;padding:14px 18px")}><span style={s("font-size:13px;color:#9a9a9a")}>Format</span><span style={s("font-size:13px;color:#bdbdbd")}>JSON · Swagger UI at /docs</span></div>
            </div>

            {/* Running locally needs your own LLM keys — they are not bundled with the code. */}
            <div style={s("border:1px solid rgba(255,184,41,0.35);border-radius:24px;padding:20px 24px;display:flex;flex-direction:column;gap:8px;background:rgba(255,184,41,0.04)")}>
              <span style={s("font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#ffb829")}>Running locally — bring your own keys</span>
              <span style={s("font-size:14px;line-height:1.6;color:#bdbdbd")}>The LLM provider keys are <strong style={s("color:#fff;font-weight:600")}>not bundled</strong> with the code — on the hosted demo they live in the server's environment. To run the analysis pipeline on your own machine, copy <span style={s("font-family:'Space Mono',monospace;color:#fff")}>.env.example</span> → <span style={s("font-family:'Space Mono',monospace;color:#fff")}>.env</span> and add at least <span style={s("font-family:'Space Mono',monospace;color:#fff")}>OPENROUTER_API_KEY</span> (the insights graph requires it). <span style={s("font-family:'Space Mono',monospace;color:#fff")}>OPENAI_API_KEY</span> (paid escalation) and <span style={s("font-family:'Space Mono',monospace;color:#fff")}>LANGFUSE_*</span> (tracing) are optional. Collection &amp; rating metrics work with no keys at all.</span>
            </div>
          </section>

          <section data-endpoint="conventions" data-reveal="" style={s("display:flex;flex-direction:column;gap:14px")}>
            <h2 style={s("font-weight:600;font-size:24px;letter-spacing:0.021em")}>Conventions</h2>
            <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Common query parameters</span>
            <div style={s("border:1px solid rgba(255,255,255,0.12);border-radius:24px;overflow:hidden")}>
              <div style={s("display:grid;grid-template-columns:1.1fr 0.8fr 1fr 1.6fr;gap:12px;padding:12px 18px;border-bottom:1px solid rgba(255,255,255,0.12);font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}><span>Param</span><span>Type</span><span>Default</span><span>Notes</span></div>
              {[['app_id', 'string', 'required', 'Numeric id, e.g. 1459969523'], ['region', 'enum', 'europe', 'europe · asia · africa'], ['limit', 'int', '100', '1–500 reviews to sample'], ['refresh', 'bool', 'false', 'Recompute instead of cache']].map((row, i) => (
                <div key={i} style={{ ...s("display:grid;grid-template-columns:1.1fr 0.8fr 1fr 1.6fr;gap:12px;padding:12px 18px"), borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}><span style={s("font-family:'Space Mono',monospace;font-size:12.5px;color:#fff")}>{row[0]}</span><span style={s("font-size:13px;color:#bdbdbd")}>{row[1]}</span><span style={s("font-size:13px;color:#9a9a9a")}>{row[2]}</span><span style={s("font-size:13px;color:#bdbdbd")}>{row[3]}</span></div>
              ))}
            </div>
            <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a;margin-top:6px")}>Errors — standard HTTP codes with a JSON detail body</span>
            <div style={s("border:1px solid rgba(255,255,255,0.12);border-radius:24px;overflow:hidden")}>
              {[['400', 'Invalid app id (non-numeric)'], ['404', 'No reviews found for the app'], ['422', 'Invalid query parameter (e.g. unknown region)'], ['502', 'Upstream (Apple RSS) failure after retries']].map((row, i) => (
                <div key={i} style={{ ...s("display:grid;grid-template-columns:100px 1fr;gap:18px;padding:12px 18px"), borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}><span style={s("font-family:'Space Mono',monospace;font-size:12.5px;color:#ffb829")}>{row[0]}</span><span style={s("font-size:13px;color:#bdbdbd")}>{row[1]}</span></div>
              ))}
            </div>
          </section>

          {endpoints.map((ep) => (
            <section key={ep.id} data-endpoint={ep.id} data-reveal="" style={s("display:flex;flex-direction:column;gap:14px")}>
              <div style={s("display:flex;align-items:center;gap:12px;flex-wrap:wrap")}>
                <span style={{ ...s("font-family:'Space Mono',monospace;font-size:12px;font-weight:700;letter-spacing:0.04em;padding:5px 12px;border-radius:8px"), background: methodBg(ep.method), color: methodColor(ep.method) }}>{ep.method}</span>
                <span style={s("font-family:'Space Mono',monospace;font-size:18px;color:#fff;letter-spacing:0.01em")}>{ep.path}</span>
              </div>
              <p style={s("font-size:15px;line-height:1.6;color:#bdbdbd")}>{ep.desc}</p>
              {ep.params.length > 0 && (
                <div style={s("display:flex;flex-direction:column;gap:8px")}>
                  <span style={s("font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Parameters</span>
                  <div style={s("border:1px solid rgba(255,255,255,0.12);border-radius:16px;overflow:hidden")}>
                    {ep.params.map((p, i) => (
                      <div key={i} style={{ ...s("display:grid;grid-template-columns:1fr 0.7fr 1.6fr;gap:12px;padding:11px 16px"), borderBottom: i < ep.params.length - 1 ? '1px solid rgba(255,255,255,0.07)' : 'none' }}><span style={s("font-family:'Space Mono',monospace;font-size:12.5px;color:#fff")}>{p[0]}</span><span style={s("font-size:12.5px;color:#9a9a9a")}>{p[1]}</span><span style={s("font-size:12.5px;color:#bdbdbd")}>{p[3]}</span></div>
                    ))}
                  </div>
                </div>
              )}
              <div style={s("display:flex;flex-direction:column;gap:8px")}>
                <span style={s("font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Response fields</span>
                <div style={s("display:flex;flex-direction:column")}>
                  {ep.fields.map((f, i) => (
                    <div key={i} style={s("display:grid;grid-template-columns:0.9fr 1.6fr;gap:14px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,0.07)")}><span style={s("font-family:'Space Mono',monospace;font-size:12.5px;color:#15846e")}>{f[0]}</span><span style={s("font-size:13px;color:#bdbdbd;line-height:1.5")}>{f[1]}</span></div>
                  ))}
                </div>
              </div>
              <EndpointCode ep={ep} />
            </section>
          ))}

          <section data-reveal="" style={s("display:flex;flex-direction:column;gap:18px")}>
            <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#9a9a9a")}>Where it runs</span>
            <ArchDiagram />
          </section>
        </div>

      </div>
    </div>
  );
}

/* ============================ PRICING ============================ */
function Pricing({ onPlan }) {
  return (
    <div style={s("max-width:1200px;margin:0 auto;padding:60px 24px 96px;display:flex;flex-direction:column;gap:48px;position:relative")}>
      <div data-reveal="" style={s("display:flex;flex-direction:column;gap:12px;text-align:center;align-items:center")}>
        <span style={s("font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#8052ff")}>Pricing</span>
        <h1 style={s("font-weight:300;font-size:clamp(40px,6vw,64px);line-height:0.95;letter-spacing:-0.04em")}>Pick a plan</h1>
        <p style={s("font-size:17px;line-height:1.5;color:#bdbdbd;max-width:48ch")}>Three tiers, carefully designed. All of them cost exactly the same.</p>
      </div>

      <div style={s("display:grid;grid-template-columns:repeat(3,1fr);gap:24px;align-items:stretch")}>
        {tiers.map((tier) => (
          <div key={tier.name} data-reveal="" style={{ ...s("position:relative;border-radius:24px;padding:32px 28px;background:#000;display:flex;flex-direction:column;gap:20px;overflow:hidden"), border: '1px solid ' + tier.border }}>
            <Box css="position:absolute;top:18px;right:-34px;transform:rotate(45deg);background:#8052ff;color:#fff;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:5px 40px" hover="animation:ra-wobble .45s ease">Test Task</Box>
            {tier.recommended && <span style={s("font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#8052ff;font-weight:600")}>Recommended</span>}
            <div style={s("display:flex;flex-direction:column;gap:8px")}>
              <span style={s("font-weight:600;font-size:22px;letter-spacing:0.021em")}>{tier.name}</span>
              <div style={s("display:flex;align-items:baseline;gap:6px")}><span style={s("font-weight:300;font-size:48px;letter-spacing:-0.03em;color:#8052ff")}>{tier.price}</span><span style={s("font-size:14px;color:#9a9a9a")}>{tier.per}</span></div>
            </div>
            <p style={s("font-size:15px;line-height:1.55;color:#bdbdbd;flex:1")}>{tier.blurb}</p>
            <Box as="button" onClick={onPlan} css={"border-radius:24px;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding:14px;cursor:pointer;transition:transform .18s;background:" + tier.btnBg + ";border:1px solid " + tier.btnBorder + ";color:" + tier.btnColor} hover="transform:scale(1.02)" active="transform:scale(0.98)">{tier.cta}</Box>
          </div>
        ))}
      </div>
    </div>
  );
}
