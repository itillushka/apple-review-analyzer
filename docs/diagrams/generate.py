"""Generate the Review Atlas architecture + AI-pipeline diagrams as SVG.

Clean, flat, structural diagrams meant as a base for a polished CloudDesign redesign.
Run: python3 docs/diagrams/generate.py   (then export PNG with rsvg-convert)
"""

from pathlib import Path
from xml.sax.saxutils import escape

OUT = Path(__file__).resolve().parent

# Palette (flat icon style)
INK = "#0f172a"
SUB = "#64748b"
CLIENT = "#2563eb"
API = "#4f46e5"
PIPE = "#0d9488"
STORE = "#d97706"
EXT = "#6b7280"
ACCENT = "#7c3aed"
GOOD = "#059669"
WARN = "#dc2626"


def esc(s):
    return escape(str(s))


def text(x, y, s, size=13, anchor="middle", weight="400", fill=INK):
    return (
        f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="{anchor}" '
        f'font-weight="{weight}" fill="{fill}">{esc(s)}</text>'
    )


def rect(x, y, w, h, fill="#ffffff", stroke=CLIENT, rx=10, sw=1.5, dash=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{d}/>'
    )


def node(x, y, w, h, title, sub=None, stroke=CLIENT, fill="#ffffff"):
    out = [rect(x, y, w, h, fill, stroke)]
    if sub:
        out.append(text(x + w / 2, y + h / 2 - 3, title, 13, "middle", "600"))
        out.append(text(x + w / 2, y + h / 2 + 14, sub, 11, "middle", "400", SUB))
    else:
        out.append(text(x + w / 2, y + h / 2 + 4, title, 13, "middle", "600"))
    return out


def chip(x, y, w, label, stroke=CLIENT):
    return [
        rect(x, y, w, 26, "#f8fafc", stroke, rx=13, sw=1),
        text(x + w / 2, y + 17, label, 11, "middle", "500", INK),
    ]


def arrow(x1, y1, x2, y2, color=CLIENT, dash=None, sw=1.8, mid=None, label=None):
    d = f' stroke-dasharray="{dash}"' if dash else ""
    out = [
        f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{color}" '
        f'stroke-width="{sw}"{d} marker-end="url(#a-{color.lstrip("#")})"/>'
    ]
    if label:
        mx, my = (mid if mid else ((x1 + x2) / 2, (y1 + y2) / 2 - 6))
        out.append(text(mx, my, label, 10, "middle", "500", color))
    return out


def markers(colors):
    out = ["<defs>"]
    for c in colors:
        cid = c.lstrip("#")
        out.append(
            f'<marker id="a-{cid}" markerWidth="10" markerHeight="7" refX="9" refY="3.5" '
            f'orient="auto"><path d="M0,0 L10,3.5 L0,7 z" fill="{c}"/></marker>'
        )
    out.append(
        '<style>text{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;}</style>'
    )
    out.append("</defs>")
    return out


def svg(viewbox, body, w, h):
    head = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" width="{w}" height="{h}">'
    ]
    head += [f'<rect x="0" y="0" width="{w}" height="{h}" fill="#ffffff"/>']
    return "\n".join(head + body + ["</svg>"])


# ===================== Diagram 1 — Architecture =====================

def architecture():
    W, H = 1120, 1120
    b = markers([CLIENT, API, PIPE, STORE, EXT, ACCENT])
    b.append(text(W / 2, 38, "Review Atlas — System Architecture", 20, "middle", "700"))
    b.append(text(W / 2, 60, "Apple Store review collection → analysis → API + web app", 12, "middle", "400", SUB))

    # Client layer
    b.append(rect(40, 80, 1040, 78, "#eff6ff", CLIENT, 14, 1.2, "6,4"))
    b.append(text(60, 100, "CLIENT", 11, "start", "700", CLIENT))
    b += node(60, 108, 200, 42, "React + Vite + Tailwind", "Dala design system", CLIENT, "#ffffff")
    pages = ["Home", "Dashboard", "Explorer", "Compare", "About", "API Docs", "Pricing"]
    px = 290
    for p in pages:
        w = 96
        b += chip(px, 116, w, p, CLIENT)
        px += w + 12

    # API layer
    b.append(rect(40, 188, 1040, 86, "#eef2ff", API, 14, 1.2, "6,4"))
    b.append(text(60, 208, "REST API — FastAPI (Swagger /docs)", 11, "start", "700", API))
    eps = ["POST /collect", "GET /metrics", "GET /insights", "GET /analyze", "GET /reviews/download", "GET /health"]
    ex = 60
    for e in eps:
        w = 150
        b += chip(ex, 224, w, e, API)
        ex += w + 12
    b += node(60, 256, 0, 0, "", None, API)  # noop spacing

    # Service / pipeline
    b.append(rect(40, 304, 1040, 132, "#f0fdfa", PIPE, 14, 1.2, "6,4"))
    b.append(text(60, 324, "SERVICE — pipeline orchestration (heavy work off the event loop)", 11, "start", "700", PIPE))
    stages = [
        ("Collector", "Apple RSS · regional · cache"),
        ("Translation", "multilingual → EN"),
        ("Processing", "clean / normalize"),
        ("Metrics", "rating + sentiment-derived"),
        ("Insights", "LangGraph graph"),
    ]
    sx = 60
    sw = 184
    for i, (t, s) in enumerate(stages):
        b += node(sx, 344, sw, 64, t, s, PIPE, "#ffffff")
        if i < len(stages) - 1:
            b += arrow(sx + sw, 376, sx + sw + 18, 376, PIPE)
        sx += sw + 18

    # Storage
    b += node(60, 470, 300, 70, "Storage — JSON file cache", "collection state + full analysis · no DB", STORE, "#fffbeb")

    # External services
    b.append(rect(390, 458, 690, 96, "#f8fafc", EXT, 14, 1.2, "6,4"))
    b.append(text(410, 478, "EXTERNAL SERVICES", 11, "start", "700", EXT))
    exts = [
        ("Apple App Store RSS", "no key", EXT),
        ("OpenRouter", "multi-model LLMs", ACCENT),
        ("Langfuse", "LLM tracing", ACCENT),
        ("Google Translate", "free", EXT),
    ]
    exx = 410
    for t, s, col in exts:
        b += node(exx, 488, 156, 52, t, s, col, "#ffffff")
        exx += 168

    # Deployment band
    b.append(rect(40, 584, 1040, 70, "#f5f3ff", ACCENT, 14, 1.2, "6,4"))
    b.append(text(60, 606, "DEPLOYMENT", 11, "start", "700", ACCENT))
    b += chip(60, 616, 220, "Docker Compose: api + frontend", ACCENT)
    b += chip(292, 616, 150, "nginx + certbot", ACCENT)
    b += chip(454, 616, 150, "personal VPS", ACCENT)

    # Flow arrows
    b += arrow(160, 158, 160, 188, CLIENT, label="requests")
    b += arrow(160, 274, 160, 304, API, label="service")
    b += arrow(152, 408, 130, 470, PIPE)  # pipeline -> storage
    b += arrow(152, 344, 152, 320, PIPE, sw=0)  # spacer (invisible-ish)
    b += arrow(152, 344, 488, 488, EXT, dash="5,4", label="Apple")
    b += arrow(620, 408, 620, 488, ACCENT, dash="5,4", label="LLM + trace")
    b += arrow(390, 408, 350, 470, STORE, dash="5,4", label="cache")

    # Legend
    b.append(rect(840, 680, 240, 60, "#ffffff", EXT, 8, 1))
    b.append(text(852, 698, "Legend", 11, "start", "700", INK))
    b += arrow(852, 714, 882, 714, CLIENT, label=None, sw=2)
    b.append(text(890, 718, "request / data flow", 10, "start", "400", INK))
    b += arrow(852, 730, 882, 730, EXT, dash="5,4", label=None, sw=2)
    b.append(text(890, 734, "external call", 10, "start", "400", INK))

    return svg("0 0 1120 1120", b, W, H)


# ===================== Diagram 2 — AI / Insights pipeline =====================

def ai_pipeline():
    W, H = 1120, 1120
    b = markers([CLIENT, PIPE, ACCENT, GOOD, WARN, EXT])
    b.append(text(W / 2, 38, "Review Atlas — AI / Insights Pipeline", 20, "middle", "700"))
    b.append(text(W / 2, 60, "LangGraph state graph · multi-model routing · deterministic critic · distillation", 12, "middle", "400", SUB))

    # Entry
    b += node(60, 120, 150, 70, "Reviews (EN)", "translated + cleaned", PIPE, "#f0fdfa")
    b += arrow(210, 155, 440, 155, PIPE, label="EN reviews")

    # LangGraph graph
    b.append(rect(420, 86, 640, 150, "#f5f3ff", ACCENT, 14, 1.2, "6,4"))
    b.append(text(440, 106, "LANGGRAPH — classify → synthesize → critic (cheap top-ranked models)", 11, "start", "700", ACCENT))
    b += node(440, 120, 170, 70, "classify", "sentiment + emotion · Tencent Hy3", ACCENT, "#ffffff")
    b += node(630, 120, 170, 70, "synthesize", "themes + actions + taxonomy · DeepSeek V4", ACCENT, "#ffffff")
    b += node(820, 120, 170, 70, "critic", "grounding check (deterministic)", GOOD, "#ffffff")
    b += arrow(610, 155, 630, 155, ACCENT)
    b += arrow(800, 155, 820, 155, ACCENT)
    # retry loop critic -> synthesize
    b.append(f'<path d="M905,190 C905,225 715,225 715,192" fill="none" stroke="{WARN}" stroke-width="1.6" stroke-dasharray="5,3" marker-end="url(#a-{WARN.lstrip("#")})"/>')
    b.append(text(810, 222, "retry if themes dropped", 10, "middle", "500", WARN))

    # Langfuse cross-cut
    b += node(440, 360, 200, 48, "Langfuse", "traces every LLM call", EXT, "#f8fafc")
    b.append(f'<path d="M540,236 L540,360" stroke="{EXT}" stroke-width="1.4" stroke-dasharray="4,3"/>')

    # Assemble -> outputs
    b += node(700, 356, 160, 56, "Insights", "assembled result", ACCENT, "#ffffff")
    b += arrow(990, 190, 780, 356, ACCENT, label="assemble")

    outs = ["sentiment", "emotion", "taxonomy", "mismatch", "themes", "actionable"]
    oy = 356
    b.append(rect(900, 348, 180, 132, "#ffffff", ACCENT, 10, 1.2))
    b.append(text(990, 366, "Outputs", 12, "middle", "700", ACCENT))
    for i, o in enumerate(outs):
        b += chip(915, 378 + i * 16, 150, o, ACCENT)
    b += arrow(860, 384, 900, 400, ACCENT)

    # Distillation (dev-time)
    b.append(rect(60, 470, 1000, 170, "#fffbeb", STORE, 14, 1.2, "6,4"))
    b.append(text(80, 492, "DEV-TIME PROMPT DISTILLATION (offline — not in the runtime path)", 11, "start", "700", STORE))
    b += node(80, 510, 190, 70, "Teacher gpt-5.5", "labels 100 reviews → gold", WARN, "#ffffff")
    b += node(330, 510, 200, 70, "Build few-shots", "from student mistakes", STORE, "#ffffff")
    b += node(590, 510, 200, 70, "Student Tencent", "classify before / after", ACCENT, "#ffffff")
    b += node(850, 510, 190, 70, "Agreement", "95% → 97%", GOOD, "#ecfdf5")
    b += arrow(270, 545, 330, 545, STORE)
    b += arrow(530, 545, 590, 545, STORE)
    b += arrow(790, 545, 850, 545, GOOD)
    b.append(text(560, 615, "few-shots injected into the runtime classify prompt", 11, "middle", "500", STORE))

    # Legend
    b.append(rect(60, 656, 360, 34, "#ffffff", EXT, 8, 1))
    b += arrow(72, 673, 100, 673, ACCENT, sw=2)
    b.append(text(108, 677, "LLM flow", 10, "start", "400", INK))
    b += arrow(220, 673, 248, 673, WARN, dash="5,3", sw=2)
    b.append(text(256, 677, "retry loop", 10, "start", "400", INK))

    return svg("0 0 1120 1120", b, W, H)


(OUT / "architecture.svg").write_text(architecture(), encoding="utf-8")
(OUT / "ai-pipeline.svg").write_text(ai_pipeline(), encoding="utf-8")
print("wrote architecture.svg and ai-pipeline.svg")
