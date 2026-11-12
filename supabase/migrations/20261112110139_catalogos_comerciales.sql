BEGIN;
CREATE TABLE public.empresas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL CHECK (length(btrim(nombre)) BETWEEN 1 AND 200),
 codigo text NOT NULL UNIQUE CHECK (codigo ~ '^[A-Z0-9]{1,20}$'), activo boolean NOT NULL DEFAULT true,
 creado_en timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.solicitantes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL REFERENCES public.empresas(id),
 nombre text NOT NULL CHECK (length(btrim(nombre)) BETWEEN 1 AND 200), activo boolean NOT NULL DEFAULT true,
 creado_en timestamptz NOT NULL DEFAULT now(), UNIQUE(id, empresa_id)
);
CREATE INDEX ON public.solicitantes(empresa_id);
CREATE TABLE public.areas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nombre text NOT NULL UNIQUE CHECK (btrim(nombre) <> ''), activo boolean NOT NULL DEFAULT true
);
CREATE TABLE public.conceptos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), area_id uuid NOT NULL REFERENCES public.areas(id),
 nombre text NOT NULL CHECK (btrim(nombre) <> ''), unidad text NOT NULL CHECK (btrim(unidad) <> ''), activo boolean NOT NULL DEFAULT true
);
CREATE INDEX ON public.conceptos(area_id);
CREATE TABLE public.tarifas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), concepto_id uuid NOT NULL REFERENCES public.conceptos(id),
 precio numeric(12,2) NOT NULL CHECK (precio >= 0 AND precio <= 1000000),
 vigente_desde date NOT NULL, vigente_hasta date, creado_en timestamptz NOT NULL DEFAULT now(),
 CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde), UNIQUE(concepto_id, vigente_desde)
);
CREATE TABLE public.tipos_cotizacion (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codigo text NOT NULL UNIQUE CHECK (codigo ~ '^[A-Z0-9]{1,12}$'),
 nombre text NOT NULL, activo boolean NOT NULL DEFAULT true
);
CREATE TABLE public.sedes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), codigo text NOT NULL UNIQUE CHECK (codigo ~ '^[A-Z0-9]{1,12}$'),
 nombre text NOT NULL, activo boolean NOT NULL DEFAULT true
);
-- Los catálogos se administran mediante migraciones, no desde el cliente.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['empresas','solicitantes','areas','conceptos','tarifas','tipos_cotizacion','sedes'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
  EXECUTE format('CREATE POLICY lectura_comercial ON public.%I FOR SELECT TO authenticated USING ((SELECT private.tiene_permiso(''cotizaciones.ver'')))', t);
 END LOOP;
END $$;
COMMENT ON TABLE public.tipos_cotizacion IS 'Prefijos configurables. Composición TIPO-SEDE-CLIENTE-FOLIO provisional; pendiente de validar con Studio.';
COMMIT;
