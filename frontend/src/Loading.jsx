import React, { useEffect, useRef, useState } from 'react';
import { s } from './ui.jsx';
import LoadingScene from './LoadingScene.jsx';

const REDUCE = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The real pipeline stages, in order — the labels the bar walks through.
const STAGES = [
  'Collecting reviews from Apple RSS',
  'Translating to a common language',
  'Scoring sentiment & emotion',
  'Mining negative themes',
  'Synthesizing insights',
];

// Full-bleed loading view shown while an analysis runs.
//
// The progress bar does NOT jump to 100% — it eases toward an asymptote (~90%)
// on a timer so it reads as genuine work, then snaps to 100% only once the API
// actually resolves (`done`). A minimum on-screen time keeps cached (instant)
// responses from flashing past. When the bar completes, `onDone` hands control
// back to the parent to swap in the dashboard.
export default function Loading({ done, onDone }) {
  const [stageIdx, setStageIdx] = useState(0);
  const barRef = useRef(null);
  const pctRef = useRef(null);
  const prog = useRef(0.03);          // shared 0..1 value the 3D scene reads each frame
  const doneRef = useRef(done);
  doneRef.current = done;
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let raf, fired = false, lastStage = -1;
    const start = performance.now();
    const EXPECT = 13000;   // expected analysis time; the creep asymptotes around this
    const MIN = 1200;       // keep the animation on screen at least this long

    const frame = (now) => {
      const el = now - start;
      // asymptotic creep to 0.9 — fast at first, never quite arriving until `done`
      const creep = 0.9 * (1 - Math.exp(-el / EXPECT));
      const target = doneRef.current ? 1 : Math.max(0.05, creep);
      prog.current += (target - prog.current) * 0.07;

      const pct = prog.current * 100;
      if (barRef.current) barRef.current.style.width = pct.toFixed(1) + '%';
      if (pctRef.current) pctRef.current.textContent = Math.round(Math.min(100, pct)) + '%';

      const si = Math.min(STAGES.length - 1, Math.floor((prog.current / 0.9) * STAGES.length));
      if (si !== lastStage) { lastStage = si; setStageIdx(si); }

      if (doneRef.current && prog.current > 0.992 && el > MIN && !fired) {
        fired = true;
        if (lastStage !== STAGES.length - 1) setStageIdx(STAGES.length - 1);
        onDoneRef.current && onDoneRef.current();
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => raf && cancelAnimationFrame(raf);
  }, []);

  return (
    <div style={s("position:relative;min-height:78vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:30px;text-align:center;padding:24px;overflow:hidden")}>
      {!REDUCE && <LoadingScene progressRef={prog} />}

      <div style={s("position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:30px;width:100%")}>
        <span style={s("font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#8052ff")}>Charting the reviews</span>

        {/* the current stage, with a settled list of what's already done */}
        <div style={s("min-height:34px;display:flex;align-items:center;justify-content:center")}>
          <span key={stageIdx} style={{ ...s("font-weight:300;font-size:clamp(22px,3.4vw,32px);letter-spacing:-0.02em;color:#fff"), animation: REDUCE ? 'none' : 'ra-up .4s cubic-bezier(.16,1,.3,1) both' }}>
            {STAGES[stageIdx]}…
          </span>
        </div>

        {/* progress bar — eases up, completes only when the API actually returns */}
        <div style={s("width:340px;max-width:82vw;display:flex;flex-direction:column;gap:10px")}>
          <div style={s("height:2px;background:rgba(255,255,255,0.12);border-radius:24px;overflow:hidden")}>
            <div ref={barRef} style={s("height:100%;width:3%;background:#8052ff;border-radius:24px")}></div>
          </div>
          <div style={s("display:flex;justify-content:space-between;font-size:12px;color:#9a9a9a;letter-spacing:0.04em")}>
            <span>Step {Math.min(stageIdx + 1, STAGES.length)} / {STAGES.length}</span>
            <span ref={pctRef}>3%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
