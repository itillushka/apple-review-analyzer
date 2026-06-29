import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  analyze,
  downloadReviews,
  type AnalysisResult,
} from "../api";

const PLUM = "#8052ff";
const AMBER = "#ffb829";
const SMOKE = "#9a9a9a";
const SENT_COLORS: Record<string, string> = {
  positive: PLUM,
  neutral: SMOKE,
  negative: AMBER,
};
const REGIONS = ["europe", "asia", "africa"];

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-[24px] p-6 hairline">{children}</div>;
}

export default function Results() {
  const { appId = "" } = useParams();
  const [region, setRegion] = useState("europe");
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    setData(null);
    analyze(appId, region)
      .then((r) => alive && setData(r))
      .catch((e) => alive && setError(e.message || "Analysis failed"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [appId, region]);

  if (loading) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-32 text-center text-smoke">
        <div className="text-2xl font-light text-bone">Charting reviews…</div>
        <div className="mt-2 text-sm">
          Collecting and analyzing 100 reviews for app {appId} ({region}). First run can take
          a moment.
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1200px] px-6 py-32 text-center">
        <div className="text-2xl font-light">Couldn't analyze this app</div>
        <div className="mt-2 text-sm text-smoke">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const { metrics, insights, collected } = data;
  const ratingData = Object.entries(metrics.distribution).map(([star, count]) => ({
    star: `${star}★`,
    count,
  }));
  const sentimentData = Object.entries(insights.sentiment_distribution).map(([name, value]) => ({
    name,
    value,
  }));
  const taxonomyData = Object.entries(insights.taxonomy)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  return (
    <section className="mx-auto max-w-[1200px] px-6 py-12">
      {/* App header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">App {appId}</h1>
          <div className="mt-1 text-sm text-smoke">
            {collected.returned} reviews · sources: {collected.countries.join(", ") || "—"} ·
            engine: {insights.backend}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="rounded-[24px] bg-void px-4 py-2 text-sm hairline"
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <button
            onClick={() => downloadReviews(appId, region, "csv")}
            className="rounded-[24px] px-4 py-2 text-xs uppercase tracking-[0.05em] hairline hover:border-bone"
          >
            CSV
          </button>
          <button
            onClick={() => downloadReviews(appId, region, "json")}
            className="rounded-[24px] px-4 py-2 text-xs uppercase tracking-[0.05em] hairline hover:border-bone"
          >
            JSON
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <div className="text-5xl font-light">{metrics.average}</div>
          <div className="mt-1 text-xs text-smoke">average rating</div>
        </Card>
        <Card>
          <div className="text-5xl font-light">{metrics.total}</div>
          <div className="mt-1 text-xs text-smoke">reviews</div>
        </Card>
        <Card>
          <div className="text-5xl font-light text-plum">{metrics.top_box_pct}%</div>
          <div className="mt-1 text-xs text-smoke">positive (4–5★)</div>
        </Card>
        <Card>
          <div className="text-5xl font-light">{insights.mismatch_count}</div>
          <div className="mt-1 text-xs text-smoke">star↔text mismatch</div>
        </Card>
      </div>

      {/* Charts */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.05em] text-smoke">
            Rating distribution
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ratingData}>
              <XAxis dataKey="star" stroke={SMOKE} tickLine={false} axisLine={false} />
              <YAxis stroke={SMOKE} tickLine={false} axisLine={false} width={28} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.04)" }}
                contentStyle={{ background: "#000", border: "1px solid #333", borderRadius: 12 }}
              />
              <Bar dataKey="count" fill={PLUM} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.05em] text-smoke">
            Sentiment
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={sentimentData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85}>
                {sentimentData.map((d) => (
                  <Cell key={d.name} fill={SENT_COLORS[d.name] ?? SMOKE} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#000", border: "1px solid #333", borderRadius: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-xs text-smoke">
            {sentimentData.map((d) => (
              <span key={d.name}>
                <span style={{ color: SENT_COLORS[d.name] }}>●</span> {d.name} {d.value}
              </span>
            ))}
          </div>
        </Card>
      </div>

      {/* Negative themes + actionable */}
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.05em] text-plum">
            Where it hurts
          </div>
          <div className="flex flex-col gap-3">
            {insights.negative_themes.length === 0 && (
              <span className="text-sm text-smoke">No significant negative themes.</span>
            )}
            {insights.negative_themes.map((t) => (
              <div key={t.theme}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{t.theme}</span>
                  <span className="text-ash">{t.share}% of negatives</span>
                </div>
                <div className="mt-1 h-1 w-full rounded bg-white/10">
                  <div className="h-1 rounded" style={{ width: `${t.share}%`, background: AMBER }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div className="mb-4 text-xs font-semibold uppercase tracking-[0.05em] text-plum">
            What to fix
          </div>
          <ul className="flex flex-col gap-3 text-[15px]">
            {insights.actionable.map((a, i) => (
              <li key={i} className="flex gap-2">
                <span style={{ color: "#15846e" }}>●</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
          {taxonomyData.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.05em] text-smoke">
                Issue taxonomy
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={taxonomyData} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" stroke={SMOKE} width={90} tickLine={false} axisLine={false} />
                  <Bar dataKey="value" fill={PLUM} radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
