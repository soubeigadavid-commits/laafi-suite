import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/app-shell";
import ReportsPanel from "./reports-panel";

export default async function RapportsPage() {
  const user = await getCurrentUser();

  return (
    <AppShell title="Rapports & statistiques" userName={user?.firstName} roleName={user?.role.name}>
      <ReportsPanel />
    </AppShell>
  );
}
