import "server-only";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { requireAppUser } from "@/server/auth/require-app-user";

export async function obtenerPermisosUsuario(): Promise<string[]> {
  const usuario = await requireAppUser();
  const supabase = await createClient();

  // 1. Consultar los roles del usuario.
  const { data: roles, error: rolesError } = await supabase
    .from("usuario_roles")
    .select("rol_id")
    .eq("usuario_id", usuario.id);

  if (rolesError) {
    throw new Error("No fue posible consultar los roles.");
  }

  const rolesIds = [...new Set((roles ?? []).map((rol) => rol.rol_id))];

  if (rolesIds.length === 0) {
    return [];
  }

  // 2. Consultar los permisos vinculados a esos roles.
  const { data: relaciones, error: relacionesError } = await supabase
    .from("rol_permisos")
    .select("permiso_id")
    .in("rol_id", rolesIds);

  if (relacionesError) {
    throw new Error("No fue posible consultar los permisos.");
  }

  const permisosIds = [
    ...new Set((relaciones ?? []).map((relacion) => relacion.permiso_id)),
  ];

  if (permisosIds.length === 0) {
    return [];
  }

  // 3. Recuperar los códigos de permiso.
  const { data: permisos, error: permisosError } = await supabase
    .from("permisos")
    .select("codigo")
    .in("id", permisosIds);

  if (permisosError) {
    throw new Error("No fue posible obtener los permisos.");
  }

  return [...new Set((permisos ?? []).map((permiso) => permiso.codigo))];
}

export async function exigirPermiso(codigo: string) {
  const permisos = await obtenerPermisosUsuario();

  if (!permisos.includes(codigo)) {
    redirect("/sin-permiso");
  }
}

export async function hasPermission(codigo: string) {
  return (await obtenerPermisosUsuario()).includes(codigo);
}
