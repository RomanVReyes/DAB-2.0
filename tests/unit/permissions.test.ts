import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), user: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/require-app-user", () => ({
  requireAppUser: mocks.user,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: mocks.from }),
}));
import { obtenerPermisosUsuario } from "@/server/auth/permissions";
it("combina permisos de todos los roles sin duplicados", async () => {
  mocks.user.mockResolvedValue({ id: "test" });
  mocks.from.mockImplementation((table: string) => ({
    select: () => ({
      eq: async () => ({ data: [{ rol_id: 1 }, { rol_id: 2 }], error: null }),
      in: async () => ({
        data:
          table === "rol_permisos"
            ? [{ permiso_id: 1 }, { permiso_id: 2 }, { permiso_id: 1 }]
            : [{ codigo: "cotizaciones.ver" }, { codigo: "espejo.ver" }],
        error: null,
      }),
    }),
  }));
  expect(await obtenerPermisosUsuario()).toEqual([
    "cotizaciones.ver",
    "espejo.ver",
  ]);
});
