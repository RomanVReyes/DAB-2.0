import { describe, expect, it } from "vitest";
import { subtotal, sumar, importe } from "@/modules/cotizaciones/lib/importes";
import { cotizacionSchema } from "@/modules/cotizaciones/schemas/cotizacion.schema";
import { authorizedNavigation, homeForPermissions } from "@/config/navigation";
const uuid = "10000000-0000-4000-8000-000000000001";
const valid = {
  empresa_id: uuid,
  solicitante_id: uuid,
  tipo_id: uuid,
  sede_id: uuid,
  proyecto: "Video",
  especificaciones: "",
  partidas: [
    { concepto_id: uuid, tarifa_id: uuid, cantidad: "1.25", horas: "2" },
  ],
};
describe("Importes decimales", () => {
  it("evita errores binarios y redondea por partida como PostgreSQL", () => {
    expect(subtotal("3", "0.10")).toBe("0.30");
    expect(subtotal("1.25", "1250.50")).toBe("1563.13");
    expect(sumar([subtotal("1.25", "1250.50"), subtotal("2", "500.25")])).toBe(
      "2563.63",
    );
  });
  it("conserva precisión en los límites del presupuesto", () => {
    expect(sumar(Array(100).fill(subtotal("10000", "1000000")))).toBe(
      "1000000000000.00",
    );
    expect(importe("1000000000000.01")).toBe("1,000,000,000,000.01");
  });
});
describe("Validación de entradas", () => {
  it("acepta borradores válidos", () =>
    expect(cotizacionSchema.safeParse(valid).success).toBe(true));
  it.each(["-1", "0", "NaN", "Infinity", "1.001", "1e3", "10001", ""])(
    "rechaza cantidad %s",
    (cantidad) => {
      expect(
        cotizacionSchema.safeParse({
          ...valid,
          partidas: [{ ...valid.partidas[0], cantidad }],
        }).success,
      ).toBe(false);
    },
  );
  it("rechaza borradores vacíos y edición sin versión", () => {
    expect(cotizacionSchema.safeParse({ ...valid, partidas: [] }).success).toBe(
      false,
    );
    expect(cotizacionSchema.safeParse({ ...valid, id: uuid }).success).toBe(
      false,
    );
  });
  it("descarta autor, folio, código y totales del navegador", () => {
    const parsed = cotizacionSchema.parse({
      ...valid,
      creado_por: uuid,
      folio: 1,
      codigo: "FALSO",
      importe: 0,
    });
    expect(parsed).not.toHaveProperty("importe");
    expect(parsed).not.toHaveProperty("creado_por");
    expect(parsed).not.toHaveProperty("folio");
    expect(parsed).not.toHaveProperty("codigo");
  });
});
describe("Navegación por permisos", () => {
  it("TM solo accede a Espejo", () => {
    expect(homeForPermissions(["espejo.ver"])).toBe("/espejo");
    expect(authorizedNavigation(["espejo.ver"]).map((i) => i.href)).toEqual([
      "/espejo",
    ]);
  });
  it("ADM abre cotizaciones; sin módulos muestra acceso restringido", () => {
    expect(homeForPermissions(["cotizaciones.ver", "espejo.ver"])).toBe(
      "/cotizaciones",
    );
    expect(homeForPermissions([])).toBe("/sin-permiso");
    expect(
      authorizedNavigation(["usuarios.administrar"]).map((i) => i.href),
    ).not.toContain("/rh");
  });
});
