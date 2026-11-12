import { ProtectedPlaceholder } from "@/components/shared/protected-placeholder";
export default function EspejoPage() {
  return (
    <ProtectedPlaceholder
      permission="espejo.ver"
      title="Mi Espejo"
      description="Tu espacio personal está habilitado. El registro de actividades se implementará en una entrega posterior."
    />
  );
}
