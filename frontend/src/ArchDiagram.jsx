import React from 'react';
import { s } from './ui.jsx';

const chip = 'border:1px solid rgba(255,255,255,0.18);border-radius:24px;padding:6px 14px;font-size:12px;color:#bdbdbd';
const monoChip = 'border:1px solid rgba(255,255,255,0.18);border-radius:24px;padding:8px 16px;font-family:\'Space Mono\',monospace;font-size:12px;color:#bdbdbd';
const deployChip = 'border:1px solid rgba(255,255,255,0.18);border-radius:24px;padding:8px 16px;font-size:12px;color:#bdbdbd';
const svcCard = 'flex:1;min-width:120px;border:1px solid rgba(21,132,110,0.7);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:4px';
const arrow = 'align-self:center;color:#15846e;font-size:16px';

export default function ArchDiagram() {
  return (
    <div data-om-raster="1" style={s("background:#000;border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:30px;overflow-x:auto;background-image:radial-gradient(rgba(128,82,255,0.07) 1px,transparent 1px);background-size:22px 22px")}>
      <div style={s("min-width:760px;display:flex;flex-direction:column;gap:0;font-family:'Space Grotesk',ui-sans-serif,system-ui,sans-serif;color:#fff")}>

        <div style={s("display:flex;flex-direction:column;gap:6px;margin-bottom:24px")}>
          <span style={s("font-weight:600;font-size:18px;letter-spacing:0.021em")}>System Architecture</span>
          <span style={s("font-size:13px;color:#9a9a9a;letter-spacing:0.025em")}>Apple Store review collection → analysis → API + web app</span>
        </div>

        {/* CLIENT */}
        <div style={s("border:1px dashed rgba(128,82,255,0.5);border-radius:24px;padding:18px;display:flex;align-items:center;gap:18px;flex-wrap:wrap")}>
          <span style={s("font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8052ff;font-weight:600")}>Client</span>
          <div style={s("border:1px solid #8052ff;border-radius:16px;padding:12px 18px;display:flex;flex-direction:column;gap:3px")}>
            <span style={s("font-weight:600;font-size:14px")}>React + Vite + Tailwind</span>
            <span style={s("font-size:12px;color:#9a9a9a")}>Dala design system</span>
          </div>
          <div style={s("display:flex;gap:8px;flex-wrap:wrap")}>
            {['Home', 'Dashboard', 'Explorer', 'Compare', 'About', 'API Docs', 'Pricing'].map(x => (
              <span key={x} style={s(chip)}>{x}</span>
            ))}
          </div>
        </div>

        <div style={s("display:flex;flex-direction:column;align-items:center;padding:6px 0 2px")}><span style={s("font-size:11px;color:#8052ff;letter-spacing:0.04em")}>requests</span><span style={s("color:#8052ff;font-size:14px;line-height:1")}>↓</span></div>

        {/* REST API */}
        <div style={s("border:1px dashed rgba(128,82,255,0.5);border-radius:24px;padding:18px;display:flex;flex-direction:column;gap:14px")}>
          <span style={s("font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8052ff;font-weight:600")}>REST API — FastAPI (Swagger /docs)</span>
          <div style={s("display:flex;gap:10px;flex-wrap:wrap")}>
            {['POST /collect', 'GET /metrics', 'GET /insights', 'GET /analyze', 'GET /reviews/download', 'GET /health'].map(x => (
              <span key={x} style={s(monoChip)}>{x}</span>
            ))}
          </div>
        </div>

        <div style={s("display:flex;flex-direction:column;align-items:center;padding:6px 0 2px")}><span style={s("font-size:11px;color:#8052ff;letter-spacing:0.04em")}>service</span><span style={s("color:#8052ff;font-size:14px;line-height:1")}>↓</span></div>

        {/* SERVICE */}
        <div style={s("border:1px dashed rgba(21,132,110,0.6);border-radius:24px;padding:18px;display:flex;flex-direction:column;gap:14px")}>
          <span style={s("font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#15846e;font-weight:600")}>Service — pipeline orchestration (heavy work off the event loop)</span>
          <div style={s("display:flex;align-items:stretch;gap:6px;flex-wrap:wrap")}>
            <div style={s(svcCard)}><span style={s("font-weight:600;font-size:14px")}>Collector</span><span style={s("font-size:11px;color:#9a9a9a")}>Apple RSS · regional · cache</span></div>
            <span style={s(arrow)}>›</span>
            <div style={s(svcCard)}><span style={s("font-weight:600;font-size:14px")}>Translation</span><span style={s("font-size:11px;color:#9a9a9a")}>multilingual → EN</span></div>
            <span style={s(arrow)}>›</span>
            <div style={s(svcCard)}><span style={s("font-weight:600;font-size:14px")}>Processing</span><span style={s("font-size:11px;color:#9a9a9a")}>clean / normalize</span></div>
            <span style={s(arrow)}>›</span>
            <div style={s(svcCard)}><span style={s("font-weight:600;font-size:14px")}>Metrics</span><span style={s("font-size:11px;color:#9a9a9a")}>rating + sentiment-derived</span></div>
            <span style={s(arrow)}>›</span>
            <div style={s("flex:1;min-width:120px;border:1px solid rgba(128,82,255,0.7);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:4px")}><span style={s("font-weight:600;font-size:14px")}>Insights</span><span style={s("font-size:11px;color:#9a9a9a")}>LangGraph graph</span></div>
          </div>
        </div>

        {/* storage + external */}
        <div style={s("display:flex;gap:18px;flex-wrap:wrap;margin-top:18px")}>
          <div style={s("flex:1;min-width:240px;display:flex;flex-direction:column;gap:6px")}>
            <div style={s("display:flex;flex-direction:column;align-items:center")}><span style={s("font-size:11px;color:#ffb829;letter-spacing:0.04em")}>persist + cache</span><span style={s("color:#ffb829;font-size:14px;line-height:1")}>↓</span></div>
            <div style={s("border:1px solid #ffb829;border-radius:24px;padding:18px;display:flex;flex-direction:column;gap:4px")}>
              <span style={s("font-weight:600;font-size:14px")}>Storage — JSON file cache</span>
              <span style={s("font-size:12px;color:#9a9a9a")}>collection state + full analysis · no DB</span>
            </div>
          </div>
          <div style={s("flex:1.4;min-width:280px;display:flex;flex-direction:column;gap:6px")}>
            <div style={s("display:flex;flex-direction:column;align-items:center")}><span style={s("font-size:11px;color:#8052ff;letter-spacing:0.04em")}>LLM · translate · trace</span><span style={s("color:#8052ff;font-size:14px;line-height:1")}>↓</span></div>
            <div style={s("border:1px dashed rgba(255,255,255,0.22);border-radius:24px;padding:18px;display:flex;flex-direction:column;gap:12px")}>
              <span style={s("font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#9a9a9a;font-weight:600")}>External services</span>
              <div style={s("display:flex;gap:10px;flex-wrap:wrap")}>
                <div style={s("border:1px solid rgba(255,255,255,0.18);border-radius:14px;padding:10px 14px;display:flex;flex-direction:column;gap:2px")}><span style={s("font-weight:600;font-size:13px")}>Apple App Store RSS</span><span style={s("font-size:11px;color:#9a9a9a")}>no key</span></div>
                <div style={s("border:1px solid rgba(128,82,255,0.6);border-radius:14px;padding:10px 14px;display:flex;flex-direction:column;gap:2px")}><span style={s("font-weight:600;font-size:13px")}>OpenRouter</span><span style={s("font-size:11px;color:#9a9a9a")}>multi-model LLMs</span></div>
                <div style={s("border:1px solid rgba(255,255,255,0.18);border-radius:14px;padding:10px 14px;display:flex;flex-direction:column;gap:2px")}><span style={s("font-weight:600;font-size:13px")}>Langfuse</span><span style={s("font-size:11px;color:#9a9a9a")}>LLM tracing</span></div>
                <div style={s("border:1px solid rgba(255,255,255,0.18);border-radius:14px;padding:10px 14px;display:flex;flex-direction:column;gap:2px")}><span style={s("font-weight:600;font-size:13px")}>Google Translate</span><span style={s("font-size:11px;color:#9a9a9a")}>free</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* DEPLOYMENT */}
        <div style={s("border:1px dashed rgba(128,82,255,0.5);border-radius:24px;padding:18px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin-top:18px")}>
          <span style={s("font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#8052ff;font-weight:600")}>Deployment</span>
          <div style={s("display:flex;gap:10px;flex-wrap:wrap")}>
            {['Docker Compose: api + frontend', 'nginx + certbot', 'personal VPS'].map(x => (
              <span key={x} style={s(deployChip)}>{x}</span>
            ))}
          </div>
        </div>

        {/* legend */}
        <div style={s("display:flex;gap:24px;margin-top:24px;flex-wrap:wrap")}>
          <div style={s("display:flex;align-items:center;gap:8px")}><span style={s("width:26px;height:0;border-top:2px solid #8052ff")}></span><span style={s("font-size:11px;color:#9a9a9a")}>request / data flow</span></div>
          <div style={s("display:flex;align-items:center;gap:8px")}><span style={s("width:26px;height:0;border-top:2px dashed #9a9a9a")}></span><span style={s("font-size:11px;color:#9a9a9a")}>external call</span></div>
        </div>

      </div>
    </div>
  );
}
