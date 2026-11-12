
import { ProtectedPlaceholder } from "@/components/shared/protected-placeholder";

export default function DailyPage() {
  return (
    <ProtectedPlaceholder permission="daily.ver"
      title="Daily Activity Board"
      description="Planeación de actividades y registro de horas de trabajo."
    />
  );
}
