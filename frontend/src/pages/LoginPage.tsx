import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { buttonPrimary, card, input, label } from "../ui";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login fehlgeschlagen");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className={`mx-auto mt-16 max-w-sm p-6 ${card}`}>
      <h1 className="mb-4 text-xl font-semibold text-white">Login</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={label}>Benutzername</label>
          <input
            className={`mt-1 w-full ${input}`}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label className={label}>Passwort</label>
          <input
            type="password"
            className={`mt-1 w-full ${input}`}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        {error && <p className="text-sm text-rose-400">{error}</p>}
        <button type="submit" disabled={isSubmitting} className={`w-full ${buttonPrimary}`}>
          {isSubmitting ? "…" : "Einloggen"}
        </button>
      </form>
    </div>
  );
}
