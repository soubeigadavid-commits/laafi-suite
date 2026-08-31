import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/app-shell";
import InventoryPanel from "./inventory-panel";

export default async function StocksPage() {
  const user = await getCurrentUser();

  return (
    <AppShell title="Stocks" userName={user?.firstName} roleName={user?.role.name}>
      <InventoryPanel />
    </AppShell>
  );
}
