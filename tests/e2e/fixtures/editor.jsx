import React from "react";
import { createRoot } from "react-dom/client";
import { CotizacionForm } from "@/modules/cotizaciones/components/cotizacion-form.tsx";
import { Seguimiento } from "@/modules/cotizaciones/components/seguimiento.tsx";
const catalogos = {
  empresas: [],
  solicitantes: [],
  tipos: [],
  sedes: [],
  tarifas: [],
  conceptos: [
    {
      id: "material",
      activo: true,
      nombre: "Impreso de prueba",
      unidad: "pieza",
      area_id: "tint",
      areas: { nombre: "TINT" },
    },
  ],
};
createRoot(document.getElementById("root")).render(
  React.createElement(
    React.Fragment,
    null,
    React.createElement(CotizacionForm, { catalogos, today: "2026-01-01" }),
    React.createElement(Seguimiento, {
      permitido: true,
      cot: {
        id: "demo",
        version: 1,
        estado: "pendiente",
        motivo: "",
        numero_po: "",
        cotizacion_documentos: [],
      },
    }),
  ),
);
