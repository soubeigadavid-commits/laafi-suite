import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/app-shell";
import KitchenBoard from "./kitchen-board";

export default async function KitchenPage() {
  const user = await getCurrentUser();

  return (
    <AppShell title="Cuisine" userName={user?.firstName} roleName={user?.role.name}>
      <KitchenBoard />
    </AppShell>
  );
}
