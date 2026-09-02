"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDate } from "@/lib/utils";

interface RoleOption {
  id: string;
  name: string;
  permissions: string[];
}

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  roleId: string;
  roleName: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super administrateur",
  ADMIN: "Administrateur",
  MANAGER: "Manager",
  CAISSIER: "Caissier",
  SERVEUR: "Serveur",
  CUISINIER: "Cuisinier",
  MAGASINIER: "Magasinier",
  AGENT_COWORKING: "Agent coworking",
};

export default function UsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    const [usersRes, rolesRes] = await Promise.all([
      fetch("/api/users"),
      fetch("/api/roles"),
    ]);
    setUsers(await usersRes.json());
    setRoles(await rolesRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function changeRole(userId: string, roleId: string) {
    await fetch("/api/users/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, roleId }),
    });
    load();
  }

  async function toggleActive(userId: string, isActive: boolean) {
    await fetch("/api/users/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, isActive: !isActive }),
    });
    load();
  }

  if (loading) return <p className="text-sm text-neutral-500">Chargement…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
          Utilisateurs ({users.length})
        </h2>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-lg bg-laafi-bronze px-3 py-1.5 text-sm font-medium text-white hover:bg-laafi-bronze/90"
        >
          + Nouvel utilisateur
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-neutral-500">
            <tr>
              <th className="px-4 py-2">Nom</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Rôle / Accès</th>
              <th className="px-4 py-2">Date d'ajout</th>
              <th className="px-4 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-neutral-100">
                <td className="px-4 py-2 font-medium text-neutral-900">
                  {u.firstName} {u.lastName}
                </td>
                <td className="px-4 py-2 text-neutral-500">{u.email}</td>
                <td className="px-4 py-2">
                  <select
                    value={u.roleId}
                    onChange={(e) => changeRole(u.id, e.target.value)}
                    className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-xs focus:border-laafi-bronze focus:outline-none"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {ROLE_LABELS[r.name] ?? r.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-neutral-500">
                  {formatDate(u.createdAt)}
                </td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => toggleActive(u.id, u.isActive)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      u.isActive
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    }`}
                  >
                    {u.isActive ? "Actif" : "Désactivé"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <NewUserModal
          roles={roles}
          onClose={() => setShowNew(false)}
          onDone={() => {
            setShowNew(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function NewUserModal({
  roles,
  onClose,
  onDone,
}: {
  roles: RoleOption[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState(roles[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!firstName || !lastName || !email || !password || !roleId) {
      setError("Tous les champs marqués * sont requis");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, phone, password, roleId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erreur");
        return;
      }
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h3 className="mb-4 text-lg font-semibold text-neutral-900">Nouvel utilisateur</h3>

        {error && (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="mb-3 grid grid-cols-2 gap-2">
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Prénom *"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
          />
          <input
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Nom *"
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
          />
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email *"
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
        />
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Téléphone (optionnel)"
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mot de passe (min. 6 caractères) *"
          className="mb-3 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
        />

        <label className="mb-1 block text-sm font-medium text-neutral-700">
          Rôle / niveau d'accès *
        </label>
        <select
          value={roleId}
          onChange={(e) => setRoleId(e.target.value)}
          className="mb-4 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-laafi-bronze focus:outline-none"
        >
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {ROLE_LABELS[r.name] ?? r.name}
            </option>
          ))}
        </select>

        <button
          onClick={submit}
          disabled={busy}
          className="w-full rounded-lg bg-laafi-bronze px-3 py-2.5 text-sm font-medium text-white hover:bg-laafi-bronze/90 disabled:opacity-50"
        >
          Créer l'utilisateur
        </button>
        <button
          onClick={onClose}
          className="mt-3 w-full text-center text-sm text-neutral-400 hover:underline"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
