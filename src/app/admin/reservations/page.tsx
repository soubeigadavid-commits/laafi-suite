import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/app-shell";
import ReservationsPanel from "./reservations-panel";

export default async function ReservationsPage() {
  const user = await getCurrentUser();

  return (
    <AppShell title="Réservations" userName={user?.firstName} roleName={user?.role.name}>
      <ReservationsPanel />
    </AppShell>
  );
}
