import React from 'react';
import { s } from './ui.jsx';

const outChip = 'border:1px solid rgba(255,255,255,0.16);border-radius:24px;padding:5px 12px;font-size:11px;color:#bdbdbd';

export default function PipelineDiagram() {
  return (
    <div data-om-raster="1" style={s("background:#000;border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:30px;overflow-x:auto;background-image:radial-gradient(rgba(128,82,255,0.07) 1px,transparent 1px);background-size:22px 22px")}>
      <div style={s("min-width:760px;display:flex;flex-direction:column;gap:0;font-family:'Space Grotesk',ui-sans-serif,system-ui,sans-serif;color:#fff")}>

        <div style={s("display:flex;flex-direction:column;gap:6px;margin-bottom:24px")}>
          <span style={s("font-weight:600;font-size:18px;letter-spacing:0.021em")}>AI / Insights Pipeline</span>
          <span style={s("font-size:13px;color:#9a9a9a;letter-spacing:0.025em")}>LangGraph state graph · multi-model routing · deterministic critic · distillation</span>
        </div>

        {/* runtime row */}
        <div style={s("display:flex;align-items:stretch;gap:14px;flex-wrap:wrap")}>
          <div style={s("align-self:center;border:1px solid rgba(21,132,110,0.7);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:4px;min-width:150px")}>
            <span style={s("font-weight:600;font-size:14px")}>Reviews (EN)</span>
            <span style={s("font-size:11px;color:#9a9a9a")}>translated + cleaned</span>
          </div>
          <div style={s("align-self:center;display:flex;flex-direction:column;align-items:center")}><span style={s("font-size:11px;color:#15846e")}>EN reviews</span><span style={s("color:#15846e;font-size:16px;line-height:1")}>→</span></div>
          <div style={s("flex:1;min-width:380px;border:1px dashed rgba(128,82,255,0.55);border-radius:24px;padding:16px;display:flex;flex-direction:column;gap:12px")}>
            <span style={s("font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#8052ff;font-weight:600")}>LangGraph — classify → synthesize → critic</span>
            <div style={s("display:flex;align-items:stretch;gap:6px;flex-wrap:wrap")}>
              <div style={s("flex:1;min-width:110px;border:1px solid rgba(128,82,255,0.7);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:4px")}><span style={s("font-weight:600;font-size:13px")}>classify</span><span style={s("font-size:11px;color:#9a9a9a")}>sentiment + emotion · Qwen3 Instruct</span></div>
              <span style={s("align-self:center;color:#8052ff;font-size:15px")}>›</span>
              <div style={s("flex:1;min-width:110px;border:1px solid rgba(128,82,255,0.7);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:4px")}><span style={s("font-weight:600;font-size:13px")}>synthesize</span><span style={s("font-size:11px;color:#9a9a9a")}>themes + actions + taxonomy · Gemini 2.5 Flash-Lite</span></div>
              <span style={s("align-self:center;color:#8052ff;font-size:15px")}>›</span>
              <div style={s("flex:1;min-width:110px;border:1px solid rgba(21,132,110,0.7);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:4px")}><span style={s("font-weight:600;font-size:13px")}>critic</span><span style={s("font-size:11px;color:#9a9a9a")}>grounding check (deterministic)</span></div>
            </div>
            <div style={s("display:flex;align-items:center;gap:8px;align-self:flex-end")}><span style={s("width:40px;height:0;border-top:2px dashed #ff4d4d")}></span><span style={s("font-size:11px;color:#ff6b6b")}>retry if themes dropped ↺</span></div>
          </div>
        </div>

        {/* assemble */}
        <div style={s("display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:18px")}>
          <div style={s("display:flex;flex-direction:column;align-items:center;min-width:150px")}><span style={s("font-size:11px;color:#8052ff")}>assemble</span><span style={s("color:#8052ff;font-size:16px;line-height:1")}>↓</span></div>
          <div style={s("flex:1")}></div>
        </div>
        <div style={s("display:flex;align-items:center;gap:14px;flex-wrap:wrap")}>
          <div style={s("border:1px solid rgba(128,82,255,0.7);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:4px;min-width:170px")}>
            <span style={s("font-weight:600;font-size:14px")}>Insights</span>
            <span style={s("font-size:11px;color:#9a9a9a")}>assembled result</span>
          </div>
          <span style={s("color:#8052ff;font-size:16px")}>→</span>
          <div style={s("border:1px solid rgba(128,82,255,0.5);border-radius:16px;padding:14px 16px;display:flex;flex-direction:column;gap:6px")}>
            <span style={s("font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#8052ff;font-weight:600")}>Outputs</span>
            <div style={s("display:flex;gap:8px;flex-wrap:wrap")}>
              {['sentiment', 'emotion', 'taxonomy', 'mismatch', 'themes', 'actionable'].map(x => (
                <span key={x} style={s(outChip)}>{x}</span>
              ))}
            </div>
          </div>
          <div style={s("margin-left:auto;display:flex;align-items:center;gap:8px;border:1px solid rgba(255,255,255,0.14);border-radius:14px;padding:10px 14px")}><span style={s("font-weight:600;font-size:13px")}>Langfuse</span><span style={s("font-size:11px;color:#9a9a9a")}>· traces every LLM call</span></div>
        </div>

        {/* distillation */}
        <div style={s("border:1px dashed rgba(255,184,41,0.6);border-radius:24px;padding:18px;display:flex;flex-direction:column;gap:14px;margin-top:24px")}>
          <span style={s("font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#ffb829;font-weight:600")}>Dev-time prompt distillation (offline — not in the runtime path)</span>
          <div style={s("display:flex;align-items:stretch;gap:6px;flex-wrap:wrap")}>
            <div style={s("flex:1;min-width:130px;border:1px solid rgba(255,255,255,0.2);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:4px")}><span style={s("font-weight:600;font-size:13px")}>Teacher gpt-5.5</span><span style={s("font-size:11px;color:#9a9a9a")}>labels 100 reviews → gold</span></div>
            <span style={s("align-self:center;color:#ffb829;font-size:15px")}>›</span>
            <div style={s("flex:1;min-width:130px;border:1px solid rgba(255,184,41,0.6);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:4px")}><span style={s("font-weight:600;font-size:13px")}>Build few-shots</span><span style={s("font-size:11px;color:#9a9a9a")}>from student mistakes</span></div>
            <span style={s("align-self:center;color:#ffb829;font-size:15px")}>›</span>
            <div style={s("flex:1;min-width:130px;border:1px solid rgba(128,82,255,0.7);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:4px")}><span style={s("font-weight:600;font-size:13px")}>Student Qwen3</span><span style={s("font-size:11px;color:#9a9a9a")}>classify before / after</span></div>
            <span style={s("align-self:center;color:#15846e;font-size:15px")}>→</span>
            <div style={s("flex:1;min-width:130px;border:1px solid rgba(21,132,110,0.7);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:4px")}><span style={s("font-weight:600;font-size:13px")}>Agreement</span><span style={s("font-size:11px;color:#9a9a9a")}>93% → 94%</span></div>
          </div>
          <span style={s("font-size:12px;color:#ffb829;letter-spacing:0.025em")}>few-shots injected into the runtime classify prompt</span>
        </div>

        {/* legend */}
        <div style={s("display:flex;gap:24px;margin-top:24px;flex-wrap:wrap")}>
          <div style={s("display:flex;align-items:center;gap:8px")}><span style={s("width:26px;height:0;border-top:2px solid #8052ff")}></span><span style={s("font-size:11px;color:#9a9a9a")}>LLM flow</span></div>
          <div style={s("display:flex;align-items:center;gap:8px")}><span style={s("width:26px;height:0;border-top:2px dashed #ff4d4d")}></span><span style={s("font-size:11px;color:#9a9a9a")}>retry loop</span></div>
        </div>

      </div>
    </div>
  );
}
