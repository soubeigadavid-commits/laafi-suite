import { getCurrentUser } from "@/lib/auth";
import AppShell from "@/components/layout/app-shell";
import UsersPanel from "./users-panel";

export default async function UtilisateursPage() {
  const user = await getCurrentUser();

  return (
    <AppShell title="Utilisateurs & Accès" userName={user?.firstName} roleName={user?.role.name}>
      <UsersPanel />
    </AppShell>
  );
}
