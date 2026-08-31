import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/app-shell";
import WorkstationGrid from "./workstation-grid";

export default async function CoworkingPage() {
  const user = await getCurrentUser();

  return (
    <AppShell title="Coworking" userName={user?.firstName} roleName={user?.role.name}>
      <WorkstationGrid />
    </AppShell>
  );
}
