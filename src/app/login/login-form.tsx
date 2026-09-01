"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("admin@laafi.cafe");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Échec de connexion");
        return;
      }

      const next = searchParams.get("next") || data.redirectTo || "/";
      router.push(next);
      router.refresh();
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 h-16 w-16 overflow-hidden rounded-full bg-white shadow-md ring-1 ring-neutral-200">
          <Image
            src="/branding/logo-mark.png"
            alt="LAAFI CAFÉ"
            width={64}
            height={64}
            className="h-full w-full object-cover"
          />
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">LAAFI CAFÉ</h1>
        <p className="text-sm text-neutral-500">Le goût des ambitions</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none focus:ring-1 focus:ring-laafi-bronze"
            placeholder="admin@laafi.cafe"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700">Mot de passe</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none focus:ring-1 focus:ring-laafi-bronze"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-laafi-bronze px-3 py-2.5 text-sm font-medium text-white transition hover:bg-laafi-bronze/90 disabled:opacity-60"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <p className="mt-6 text-center text-xs text-neutral-400">
        Compte démo : admin@laafi.cafe / admin123
      </p>
    </div>
  );
}
