import { useState, type FormEvent } from "react";
import { clearToken, setToken, verifyToken } from "../api";

/** Private-preview access screen. The real protection is server-side; this is the UX. */
export default function TokenGate({ onAuthed }: { onAuthed: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(false);
    setToken(value.trim());
    try {
      await verifyToken();
      onAuthed();
    } catch {
      clearToken();
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void p-6">
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        <span className="font-semibold tracking-[0.04em]">REVIEW ATLAS</span>
        <span className="text-xs uppercase tracking-[0.05em] text-plum">Private preview</span>
        <h1 className="text-4xl font-light leading-[0.95] tracking-tight">
          Enter your access token
        </h1>
        <p className="max-w-[38ch] text-[15px] leading-relaxed text-ash">
          This take-home is shared privately. Drop in the token to review it — your browser
          will be remembered after that.
        </p>
        <form onSubmit={submit} className="flex w-full max-w-[340px] flex-col gap-3">
          <input
            type="password"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Access token…"
            className="rounded-[24px] bg-void px-5 py-3.5 text-center text-[15px] tracking-[0.025em] outline-none hairline focus:border-plum"
          />
          {error && (
            <span className="text-[13px] text-amber">That token didn't match. Try again.</span>
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded-[24px] bg-plum px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.05em] transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "Checking…" : "Unlock"}
          </button>
        </form>
        <span className="text-xs tracking-[0.025em] text-smoke">
          A test assignment for OBRIO / Nebula
        </span>
      </div>
    </div>
  );
}
