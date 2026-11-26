export type CatalogItem = { id: string; nombre: string; activo: boolean };
export type Empresa = CatalogItem & { codigo: string };
export type Solicitante = CatalogItem & { empresa_id: string };
export type Concepto = CatalogItem & {
  area_id: string;
  areas: { nombre: string };
  unidad: string;
};
export type Tarifa = {
  id: string;
  concepto_id: string;
  precio: string | number;
  vigente_desde: string;
  vigente_hasta: string | null;
};
export type Catalogos = {
  empresas: Empresa[];
  solicitantes: Solicitante[];
  conceptos: Concepto[];
  tarifas: Tarifa[];
  tipos: CatalogItem[];
  sedes: CatalogItem[];
};
export type Modo = "directo" | "unidad" | "hora";
export type Partida = {
  modo: Modo;
  id: string;
  concepto_id: string;
  tarifa_id: string | null;
  concepto_nombre: string;
  unidad: string;
  cantidad: string | number;
  horas: string | number;
  precio_unitario: string | number;
  subtotal: string | number;
  orden: number;
};
export type Cotizacion = {
  id: string;
  folio: number;
  codigo: string;
  empresa_id: string;
  solicitante_id: string;
  tipo_id: string;
  sede_id: string;
  proyecto: string;
  especificaciones: string;
  estado: string;
  arrastre?: boolean;
  es_patrocinio: boolean;
  bloqueado_en: string | null;
  motivo: string;
  numero_po: string;
  creado_en: string;
  actualizado_en: string;
  creado_por: string;
  creador_nombre: string;
  version: number;
  importe: string | number;
  horas: string | number;
  empresas: { nombre: string };
  solicitantes: { nombre: string };
};
export type Historial = {
  id: number;
  accion: string;
  resumen: {
    proyecto: string;
    cliente: string;
    solicitante: string;
    especificaciones: string;
    estado: string;
    motivo: string;
    numero_po: string;
    documento?: string;
    partidas: {
      id: string;
      concepto: string;
      modo: Modo;
      horas: number;
      cantidad: number;
      precio: number;
      subtotal: number;
    }[];
  } | null;
  usuario_nombre: string;
  creado_en: string;
  version: number;
  importe: string | number;
};
export type Detalle = Cotizacion & {
  partidas: Partida[];
  cotizacion_documentos: {
    id: string;
    tipo: string;
    usuario_nombre: string;
    creado_en: string;
    enlace: string | null;
    objeto: string | null;
  }[];
  cotizacion_historial: Historial[];
};
export type ActionState = { error?: string; fields?: Record<string, string[]> };
