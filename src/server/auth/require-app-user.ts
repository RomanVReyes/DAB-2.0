import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireAppUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const { data: perfil, error: perfilError } = await supabase
    .from("usuarios")
    .select("id, nombre, activo")
    .eq("id", user.id)
    .maybeSingle();

  if (perfilError || !perfil || !perfil.activo) {
    redirect("/acceso-denegado");
  }

  const { data: roles, error: rolesError } = await supabase
    .from("usuario_roles")
    .select("rol_id,roles(codigo)")
    .eq("usuario_id", user.id);

  if (rolesError || !roles || roles.length === 0) {
    redirect("/acceso-denegado");
  }

  return {
    id: user.id,
    roles: roles
      .flatMap((r) =>
        [r.roles]
          .flat()
          .map((role) => role?.codigo)
          .filter(Boolean),
      )
      .join(" · "),
    email: user.email ?? "",
    nombre: perfil.nombre,
  };
}
