import { redirect } from "next/navigation";

import { dashboardHome } from "@/config/navigation";

export default function HomePage() {
  redirect(dashboardHome);
}
