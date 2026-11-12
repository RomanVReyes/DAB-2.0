
import { ProtectedPlaceholder } from "@/components/shared/protected-placeholder";

export default function ProyectosPage() {
  return (
    <ProtectedPlaceholder permission="proyectos.ver"
      title="Project Monitor"
      description="Seguimiento de proyectos, departamentos y presupuestos de horas."
    />
  );
}
