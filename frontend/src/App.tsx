import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import TokenGate from "./components/TokenGate";
import Home from "./pages/Home";
import Results from "./pages/Results";
import { clearToken, verifyToken } from "./api";

function Placeholder({ title }: { title: string }) {
  return (
    <section className="mx-auto max-w-[1200px] px-6 py-32 text-center">
      <h1 className="text-4xl font-light">{title}</h1>
      <p className="mt-3 text-smoke">Coming soon.</p>
    </section>
  );
}

export default function App() {
  // null = checking; the backend decides (token gate is a no-op when ACCESS_TOKEN is unset).
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    verifyToken()
      .then(() => setAuthed(true))
      .catch(() => setAuthed(false));
  }, []);

  if (authed === null) {
    return <div className="flex h-full items-center justify-center text-smoke">Loading…</div>;
  }
  if (!authed) {
    return <TokenGate onAuthed={() => setAuthed(true)} />;
  }

  return (
    <Routes>
      <Route
        element={
          <Layout
            onSignOut={() => {
              clearToken();
              setAuthed(false);
            }}
          />
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/app/:appId" element={<Results />} />
        <Route path="/about" element={<Placeholder title="About" />} />
        <Route path="/docs" element={<Placeholder title="API Docs" />} />
        <Route path="/pricing" element={<Placeholder title="Pricing" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
