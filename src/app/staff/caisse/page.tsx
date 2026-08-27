import { getCurrentUser } from "@/lib/auth";

export default async function CaissePage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Caisse / POS</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {user ? `Connecté en tant que ${user.firstName} (${user.role.name})` : ""}
      </p>
      <div className="mt-6 rounded-xl border border-dashed border-neutral-300 bg-white p-8 text-center text-neutral-500">
        Le module Caisse / POS (prise de commande, tables, paiement) sera ajouté
        dans le prochain bloc de développement.
      </div>
    </div>
  );
}
