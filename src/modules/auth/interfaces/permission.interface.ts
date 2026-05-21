export interface IPermission {
  name: string; // Ej: "Crear Usuarios"
  slug: string; // Ej: "users:create"
  module: string; // Ej: "Administración", "Consultas" (Para agrupar en la UI)
  description?: string;
}
