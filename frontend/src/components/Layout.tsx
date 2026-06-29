import { Link, NavLink, Outlet } from "react-router-dom";

const navLink = ({ isActive }: { isActive: boolean }) =>
  `text-sm transition-colors ${isActive ? "text-bone" : "text-smoke hover:text-bone"}`;

export default function Layout({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="hairline border-x-0 border-t-0">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="font-semibold tracking-[0.04em]">
            REVIEW ATLAS
          </Link>
          <nav className="flex items-center gap-6">
            <NavLink to="/" className={navLink} end>
              Analyze
            </NavLink>
            <NavLink to="/about" className={navLink}>
              About
            </NavLink>
            <NavLink to="/docs" className={navLink}>
              API Docs
            </NavLink>
            <NavLink to="/pricing" className={navLink}>
              Pricing
            </NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <span className="rounded-[24px] border border-plum px-3 py-1 text-[11px] uppercase tracking-[0.05em] text-plum">
              OBRIO · Test Task
            </span>
            <button
              onClick={onSignOut}
              className="text-xs text-smoke transition-colors hover:text-bone"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="hairline border-x-0 border-b-0">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs tracking-[0.025em] text-smoke">
          <span>A test assignment for OBRIO / Nebula — built by Illia Pastushok</span>
          <span>Data from Apple's public RSS · no tracking</span>
        </div>
      </footer>
    </div>
  );
}
