import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { parseAppId } from "../api";

const SAMPLES = [
  { name: "Nebula", id: "1459969523" },
  { name: "Co–Star", id: "1264782561" },
];

export default function Home() {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function submit(e: FormEvent) {
    e.preventDefault();
    const id = parseAppId(value);
    if (!id) {
      setError("Enter a numeric App Store id or an App Store URL.");
      return;
    }
    navigate(`/app/${id}`);
  }

  return (
    <section className="mx-auto max-w-[1200px] px-6">
      <div className="flex flex-col items-start gap-6 py-24">
        <span className="text-xs font-semibold uppercase tracking-[0.05em] text-plum">
          Apple Store Review Intelligence
        </span>
        <h1 className="max-w-[18ch] text-6xl font-light leading-[0.9] tracking-tight md:text-[96px]">
          Find the signal in millions of voices.
        </h1>
        <p className="max-w-[60ch] text-lg font-light text-ash">
          Collect, score and decode Apple App Store reviews — sentiment, themes, and the
          fixes that matter, in one pass.
        </p>

        <form onSubmit={submit} className="mt-4 flex w-full max-w-2xl flex-col gap-3 sm:flex-row">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="App Store URL or app ID…"
            className="flex-1 rounded-[24px] bg-void px-6 py-4 text-[15px] outline-none hairline focus:border-ash"
          />
          <button
            type="submit"
            className="rounded-[24px] bg-plum px-8 py-4 text-xs font-semibold uppercase tracking-[0.05em] transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            Analyze
          </button>
        </form>
        {error && <span className="text-[13px] text-amber">{error}</span>}

        <div className="text-[13px] text-smoke">
          Try:{" "}
          {SAMPLES.map((s, i) => (
            <span key={s.id}>
              {i > 0 && " · "}
              <button
                onClick={() => navigate(`/app/${s.id}`)}
                className="text-ash underline-offset-4 hover:text-bone hover:underline"
              >
                {s.name} ({s.id})
              </button>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
