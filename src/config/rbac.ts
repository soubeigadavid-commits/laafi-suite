export const ROLE_HOME: Record<string, string> = {
  SUPER_ADMIN: "/admin/dashboard",
  ADMIN: "/admin/dashboard",
  MANAGER: "/admin/dashboard",
  CAISSIER: "/staff/caisse",
  SERVEUR: "/staff/caisse",
  CUISINIER: "/kitchen",
  MAGASINIER: "/admin/stocks",
  AGENT_COWORKING: "/staff/coworking",
};

export function homeForRole(role: string): string {
  return ROLE_HOME[role] ?? "/admin/dashboard";
}
