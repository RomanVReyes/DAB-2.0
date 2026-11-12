import { ProtectedPlaceholder } from "@/components/shared/protected-placeholder";
export default function ReportesPage() {
  return (
    <ProtectedPlaceholder
      permission="reportes.ver"
      title="Reportes"
      description="Los reportes operativos se implementarán en una entrega posterior."
    />
  );
}
