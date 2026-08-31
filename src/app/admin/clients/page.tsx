import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/app-shell";
import ClientsPanel from "./clients-panel";

export default async function ClientsPage() {
  const user = await getCurrentUser();

  return (
    <AppShell title="Clients" userName={user?.firstName} roleName={user?.role.name}>
      <ClientsPanel />
    </AppShell>
  );
}
