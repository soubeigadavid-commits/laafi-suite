import Sidebar from "./sidebar";
import LogoutButton from "@/app/admin/dashboard/logout-button";

export default function AppShell({
  title,
  userName,
  roleName,
  children,
}: {
  title: string;
  userName?: string;
  roleName?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <Sidebar />
      <main className="ml-[70px] p-5 md:ml-[245px] md:p-7">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
          <div className="flex items-center gap-3">
            {userName && (
              <span className="hidden rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-600 sm:inline">
                {userName} {roleName ? `· ${roleName}` : ""}
              </span>
            )}
            <LogoutButton />
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
