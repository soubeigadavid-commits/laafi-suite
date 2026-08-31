import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/app-shell";
import InvoicesPanel from "./invoices-panel";

export default async function FacturationPage() {
  const user = await getCurrentUser();

  return (
    <AppShell title="Facturation" userName={user?.firstName} roleName={user?.role.name}>
      <InvoicesPanel />
    </AppShell>
  );
}
