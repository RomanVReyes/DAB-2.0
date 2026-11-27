// Daily deberá entregar la suma de registros confirmados, o null si no hay registros.
export function consumo(presupuesto: number, confirmadas: number | null) {
  if (confirmadas === null)
    return { porcentaje: null, saldo: null, alerta: "Sin registros de horas" };
  const porcentaje = presupuesto > 0 ? (100 * confirmadas) / presupuesto : null;
  return {
    porcentaje,
    saldo: presupuesto - confirmadas,
    alerta:
      porcentaje === null
        ? "Sin presupuesto"
        : porcentaje >= 120
          ? "Crítico"
          : porcentaje >= 100
            ? "En el límite"
            : "Dentro del presupuesto",
  };
}
