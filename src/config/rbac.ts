export const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/admin/dashboard",
  ADMIN: "/admin/dashboard",
  MANAGER: "/admin/dashboard",
  CAISSIER: "/staff/caisse",
  SERVEUR: "/staff/caisse",
  CUISINIER: "/staff/caisse",
  MAGASINIER: "/admin/dashboard",
  AGENT_COWORKING: "/admin/dashboard",
};

export function homeForRole(role: string): string {
  return ROLE_HOME[role] ?? "/admin/dashboard";
}
