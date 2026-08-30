import { getCurrentUser } from "@/lib/auth";
import LogoutButton from "@/app/admin/dashboard/logout-button";
import WorkstationGrid from "./workstation-grid";

export default async function CoworkingPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-neutral-50 p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Coworking</h1>
          <p className="text-sm text-neutral-500">
            {user ? `${user.firstName} — ${user.role.name}` : ""}
          </p>
        </div>
        <LogoutButton />
      </header>

      <WorkstationGrid />
    </div>
  );
}
