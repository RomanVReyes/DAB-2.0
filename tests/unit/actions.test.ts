import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  permission: vi.fn(),
  save: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/permissions", () => ({
  exigirPermiso: mocks.permission,
}));
vi.mock("@/modules/cotizaciones/server/cotizaciones.service", () => ({
  guardarBorrador: mocks.save,
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));
import { guardarCotizacionAction } from "@/modules/cotizaciones/actions/cotizaciones.actions";
import { CotizacionError } from "@/modules/cotizaciones/server/cotizaciones.repository";
const uuid = "10000000-0000-4000-8000-000000000001";
const data = {
  empresa_id: uuid,
  solicitante_id: uuid,
  tipo_id: uuid,
  sede_id: uuid,
  proyecto: "Video",
  especificaciones: "",
  partidas: [{ concepto_id: uuid, tarifa_id: uuid, cantidad: "1", horas: "0" }],
};
function form(value: unknown) {
  const f = new FormData();
  f.set("datos", JSON.stringify(value));
  return f;
}
beforeEach(() => {
  vi.resetAllMocks();
  mocks.permission.mockResolvedValue(undefined);
  mocks.save.mockResolvedValue(uuid);
});
it("bloquea una petición directa sin permiso antes de guardar", async () => {
  mocks.permission.mockRejectedValue(new Error("REDIRECT:/sin-permiso"));
  await expect(guardarCotizacionAction({}, form(data))).rejects.toThrow(
    "/sin-permiso",
  );
  expect(mocks.save).not.toHaveBeenCalled();
});
it("valida crear o editar independientemente de ver", async () => {
  mocks.permission.mockImplementation(async (p: string) => {
    if (p === "cotizaciones.crear") throw new Error("DENIED");
  });
  await expect(guardarCotizacionAction({}, form(data))).rejects.toThrow(
    "DENIED",
  );
  expect(mocks.save).not.toHaveBeenCalled();
});
it("devuelve errores de campo sin invocar persistencia", async () => {
  expect(
    (await guardarCotizacionAction({}, form({ ...data, partidas: [] }))).fields,
  ).toHaveProperty("partidas");
  expect(mocks.save).not.toHaveBeenCalled();
});
it("muestra un conflicto esperado sin perder el formulario", async () => {
  mocks.save.mockRejectedValue(
    new CotizacionError("Otra persona modificó este borrador."),
  );
  expect((await guardarCotizacionAction({}, form(data))).error).toContain(
    "Otra persona",
  );
});
it("invalida listado/detalle y no captura NEXT_REDIRECT", async () => {
  await expect(guardarCotizacionAction({}, form(data))).rejects.toThrow(
    `REDIRECT:/cotizaciones?guardada=${uuid}`,
  );
  expect(mocks.revalidate).toHaveBeenCalledWith("/cotizaciones");
  expect(mocks.revalidate).toHaveBeenCalledWith(`/cotizaciones/${uuid}`);
});
