import { Suspense } from "react";
import { redirect } from "next/navigation";
import { homeForPermissions } from "@/config/navigation";
import { obtenerPermisosUsuario } from "@/server/auth/permissions";

async function Destination() {
  return redirect(homeForPermissions(await obtenerPermisosUsuario()));
}
export default function InicioPage() {
  return (
    <Suspense fallback={<p role="status">Abriendo tu espacio…</p>}>
      <Destination />
    </Suspense>
  );
}
