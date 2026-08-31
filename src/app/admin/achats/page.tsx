import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/app-shell";
import PurchasesPanel from "./purchases-panel";

export default async function AchatsPage() {
  const user = await getCurrentUser();

  return (
    <AppShell title="Achats & Fournisseurs" userName={user?.firstName} roleName={user?.role.name}>
      <PurchasesPanel />
    </AppShell>
  );
}
