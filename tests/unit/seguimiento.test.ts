import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  permiso: vi.fn(),
  rpc: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/auth/permissions", () => ({ exigirPermiso: mock.permiso }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: mock.rpc,
    auth: { getUser: async () => ({ data: { user: { id: "adm" } } }) },
    storage: { from: () => ({ upload: mock.upload, remove: mock.remove }) },
  }),
}));
import { seguimientoAction } from "@/modules/cotizaciones/actions/seguimiento.actions";
function documento() {
  const form = new FormData();
  form.set("id", "10000000-0000-4000-8000-000000000001");
  form.set("version", "1");
  form.set("tipo", "po");
  return form;
}
beforeEach(() => {
  vi.resetAllMocks();
  mock.rpc.mockResolvedValue({ error: null });
  mock.upload.mockResolvedValue({ error: null });
});
it("exige seguimiento antes de acceder a Storage", async () => {
  mock.permiso.mockRejectedValueOnce(Error("denegado"));
  await expect(seguimientoAction({}, documento())).rejects.toThrow("denegado");
  expect(mock.upload).not.toHaveBeenCalled();
});
it("comprueba los bytes PDF además del tipo declarado", async () => {
  const form = documento();
  form.set(
    "archivo",
    new File(["texto"], "po.pdf", { type: "application/pdf" }),
  );
  expect((await seguimientoAction({}, form)).error).toBeTruthy();
  expect(mock.upload).not.toHaveBeenCalled();
});
it("registra un PDF y retira la carga si hay conflicto", async () => {
  const form = documento();
  form.set(
    "archivo",
    new File(["%PDF-1.7"], "po.pdf", { type: "application/pdf" }),
  );
  expect(await seguimientoAction({}, form)).toEqual({});
  expect(mock.rpc).toHaveBeenCalledWith(
    "seguir_cotizacion",
    expect.objectContaining({
      p_datos: { tipo: "po", objeto: expect.stringMatching(/\.pdf$/) },
    }),
  );
  mock.rpc.mockResolvedValue({ error: { code: "40001" } });
  expect((await seguimientoAction({}, form)).error).toMatch(/Actualiza/);
  expect(mock.remove).toHaveBeenCalledTimes(1);
});
it("acepta un archivo de Drive y rechaza un dominio parecido", async () => {
  const form = documento();
  form.set("enlace", "https://drive.google.com.example.org/file/d/prueba");
  expect((await seguimientoAction({}, form)).error).toBeTruthy();
  form.set("enlace", "https://drive.google.com/file/d/prueba/view");
  expect(await seguimientoAction({}, form)).toEqual({});
  expect(mock.upload).not.toHaveBeenCalled();
});
