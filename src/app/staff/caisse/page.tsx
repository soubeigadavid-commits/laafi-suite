import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/app-shell";
import TableGrid from "./table-grid";

export default async function CaissePage() {
  const user = await getCurrentUser();

  return (
    <AppShell title="Restaurant / POS" userName={user?.firstName} roleName={user?.role.name}>
      <TableGrid />
    </AppShell>
  );
}
