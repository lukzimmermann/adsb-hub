import { useState } from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-full px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-indigo-500 text-white shadow-glow" : "text-slate-300 hover:bg-white/5 hover:text-white"
  }`;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { user } = useAuth();
  return (
    <>
      <NavLink to="/" end className={linkClass} onClick={onNavigate}>
        Karte
      </NavLink>
      <NavLink to="/flights" className={linkClass} onClick={onNavigate}>
        Flüge
      </NavLink>
      {user && (
        <NavLink to="/dashboard" className={linkClass} onClick={onNavigate}>
          Dashboard
        </NavLink>
      )}
      {user && (
        <NavLink to="/groups" className={linkClass} onClick={onNavigate}>
          Gruppen
        </NavLink>
      )}
      {user && (
        <NavLink to="/airports" className={linkClass} onClick={onNavigate}>
          Flugplätze
        </NavLink>
      )}
    </>
  );
}

function AuthStatus({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  return user ? (
    <>
      <span className="rounded-full bg-white/5 px-3 py-1 text-slate-300">{user.username}</span>
      <button
        onClick={() => {
          logout();
          onNavigate?.();
        }}
        className="text-slate-400 transition-colors hover:text-rose-400"
      >
        Logout
      </button>
    </>
  ) : (
    <NavLink to="/login" className={linkClass} onClick={onNavigate}>
      Login
    </NavLink>
  );
}

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="border-b border-white/5 bg-slate-900/80 backdrop-blur">
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="hidden items-center gap-1 sm:flex">
          <NavLinks />
        </div>
        <div className="hidden items-center gap-3 text-sm sm:flex">
          <AuthStatus />
        </div>

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          className="rounded-full p-2 text-slate-300 hover:bg-white/5 hover:text-white sm:hidden"
          aria-label={isMenuOpen ? "Menü schliessen" : "Menü öffnen"}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          )}
        </button>
      </div>

      {isMenuOpen && (
        <div className="flex flex-col gap-1 border-t border-white/5 px-4 py-3 text-sm sm:hidden">
          <NavLinks onNavigate={() => setIsMenuOpen(false)} />
          <div className="mt-2 flex items-center gap-3 border-t border-white/5 pt-3">
            <AuthStatus onNavigate={() => setIsMenuOpen(false)} />
          </div>
        </div>
      )}
    </nav>
  );
}
