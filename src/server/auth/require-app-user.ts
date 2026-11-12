
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

  const { data: perfil, error: perfilError } =
    await supabase
      .from("usuarios")
      .select("id, nombre, activo")
      .eq("id", user.id)
      .maybeSingle();

  if (perfilError || !perfil || !perfil.activo) {
    redirect("/acceso-denegado");
  }

  const { data: roles, error: rolesError } =
    await supabase
      .from("usuario_roles")
      .select("rol_id")
      .eq("usuario_id", user.id)
      .limit(1);

  if (rolesError || !roles || roles.length === 0) {
    redirect("/acceso-denegado");
  }

  return {
    id: user.id,
    email: user.email ?? "",
    nombre: perfil.nombre,
  };
}
