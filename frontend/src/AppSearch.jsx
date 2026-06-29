import React, { useMemo, useRef, useState } from 'react';
import { s, Box } from './ui.jsx';
import { parseAppId } from './api.js';
import { POPULAR_APPS } from './popularApps.js';

// Search box with name autocomplete over a built-in table of the top ~100 App Store
// apps (see popularApps.js). Typing filters by name; picking one analyzes its id.
// You can still paste any App Store URL or numeric id to go beyond the list — this is
// a take-home demo, so we ship a curated table instead of hammering the Store API.
export default function AppSearch({ onAnalyze, autoFocus = false }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0); // highlighted suggestion index
  const blurTimer = useRef(null);

  const looksLikeId = !!parseAppId(q);
  const matches = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term || looksLikeId) return [];
    return POPULAR_APPS.filter((a) => a.name.toLowerCase().includes(term)).slice(0, 7);
  }, [q, looksLikeId]);

  const pick = (app) => { setQ(app.name); setOpen(false); onAnalyze(app.id); };

  const submit = (e) => {
    if (e) e.preventDefault();
    // Priority: a pasted URL / numeric id → the highlighted suggestion → the raw text
    // (which startAnalyze resolves, falling back to the demo app when unparseable).
    const id = parseAppId(q);
    if (id) return onAnalyze(id);
    if (matches[hi]) return pick(matches[hi]);
    onAnalyze(q);
  };

  const onKey = (e) => {
    if (!matches.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((i) => (i + 1) % matches.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((i) => (i - 1 + matches.length) % matches.length); }
  };

  return (
    <div data-reveal="" style={s("width:100%;max-width:560px;display:flex;flex-direction:column;align-items:center;gap:10px")}>
      <form onSubmit={submit} style={s("position:relative;width:100%;display:flex;gap:12px;flex-wrap:wrap;justify-content:center")}>
        <div style={s("position:relative;flex:1;min-width:240px")}>
          <Box
            as="input" type="text" autoFocus={autoFocus}
            placeholder="App name, App Store URL, or app ID…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
            onFocus={() => { if (blurTimer.current) clearTimeout(blurTimer.current); setOpen(true); }}
            onBlur={() => { blurTimer.current = setTimeout(() => setOpen(false), 120); }}
            onKeyDown={onKey}
            css="width:100%;background:rgba(0,0,0,0.55);border:1px solid #bdbdbd;border-radius:24px;color:#fff;font-size:15px;letter-spacing:0.025em;padding:14px 22px;outline:none"
            focus="border:1px solid #8052ff"
          />
          {open && matches.length > 0 && (
            <div style={s("position:absolute;top:calc(100% + 8px);left:0;right:0;z-index:30;background:#0a0a0a;border:1px solid rgba(255,255,255,0.16);border-radius:18px;overflow:hidden;max-height:320px;overflow-y:auto;text-align:left")}>
              {matches.map((a, i) => (
                <div
                  key={a.id}
                  onMouseDown={(e) => { e.preventDefault(); pick(a); }}
                  onMouseEnter={() => setHi(i)}
                  style={s(`display:flex;align-items:center;gap:12px;padding:10px 16px;cursor:pointer;background:${i === hi ? 'rgba(128,82,255,0.16)' : 'transparent'}`)}
                >
                  {a.icon
                    ? <img src={a.icon} alt="" width="28" height="28" style={{ borderRadius: '7px', flexShrink: 0 }} />
                    : <span style={s("width:28px;height:28px;border-radius:7px;background:#8052ff;flex-shrink:0")}></span>}
                  <span style={s("font-size:14px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{a.name}</span>
                  <span style={s("margin-left:auto;font-size:11px;color:#9a9a9a;font-family:'Space Mono',monospace")}>{a.id}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <Box as="button" type="submit" css="background:#8052ff;border:none;border-radius:24px;color:#fff;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding:14px 28px;cursor:pointer;transition:transform .18s" hover="transform:scale(1.02)" active="transform:scale(0.98)">Analyze</Box>
      </form>
      <span style={s("font-size:12px;color:#9a9a9a;letter-spacing:0.02em;text-align:center")}>
        Search covers the top 100 App Store apps — don't see yours? Paste any App Store URL or numeric ID.
      </span>
    </div>
  );
}
