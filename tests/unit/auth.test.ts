import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: vi.fn(), from: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mock.user }, from: mock.from }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
import { requireAppUser } from "@/server/auth/require-app-user";
beforeEach(() => vi.resetAllMocks());
it("separa usuario anónimo de perfil inactivo", async () => {
  mock.user.mockResolvedValue({ data: { user: null }, error: null });
  await expect(requireAppUser()).rejects.toThrow("/login");
  mock.user.mockResolvedValue({ data: { user: { id: "id" } }, error: null });
  const q = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: { id: "id", activo: false }, error: null }),
  };
  mock.from.mockReturnValue(q);
  await expect(requireAppUser()).rejects.toThrow("/acceso-denegado");
});
