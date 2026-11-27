import { it, expect } from "vitest";
import { consumo } from "@/modules/proyectos/consumo";
it("distingue ausencia de registros, presupuesto cero y umbrales de consumo", () => {
  expect(consumo(10, null).saldo).toBeNull();
  expect(consumo(0, 2).porcentaje).toBeNull();
  expect(consumo(10, 10).alerta).toBe("En el límite");
  expect(consumo(10, 12)).toEqual({
    porcentaje: 120,
    saldo: -2,
    alerta: "Crítico",
  });
});
