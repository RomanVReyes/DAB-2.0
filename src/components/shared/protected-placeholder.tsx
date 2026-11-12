import { Suspense } from "react";
import { exigirPermiso } from "@/server/auth/permissions";
import { ModulePlaceholder } from "./module-placeholder";
type Props = { permission: string; title: string; description: string };
async function Content({ permission, ...props }: Props) {
  await exigirPermiso(permission);
  return <ModulePlaceholder {...props} />;
}
export function ProtectedPlaceholder(props: Props) {
  return (
    <Suspense fallback={<p role="status">Validando acceso…</p>}>
      <Content {...props} />
    </Suspense>
  );
}
