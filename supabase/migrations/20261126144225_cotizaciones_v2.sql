BEGIN;
ALTER TABLE public.partidas ALTER COLUMN tarifa_id DROP NOT NULL,
 ADD COLUMN modo text NOT NULL DEFAULT 'unidad' CHECK (modo IN ('unidad','hora','directo')),
 ADD CHECK ((modo <> 'hora' OR cantidad=horas) AND (modo <> 'directo' OR cantidad=1));
ALTER TABLE public.cotizaciones DROP CONSTRAINT cotizaciones_estado_check,
 ADD CHECK (estado IN ('borrador','pendiente','pausa','aprobada','aprobada_po','aprobada_sin_po','rechazada','facturada','pagada','patrocinio','cancelada')),
 ADD COLUMN es_patrocinio boolean NOT NULL DEFAULT false,
 ADD COLUMN bloqueado_en timestamptz, ADD COLUMN resuelto_en timestamptz,
 ADD COLUMN aprobado_en timestamptz, ADD COLUMN version_aprobada integer,
 ADD COLUMN facturado_en timestamptz, ADD COLUMN pagado_en timestamptz,
 ADD COLUMN numero_po text NOT NULL DEFAULT '', ADD COLUMN motivo text NOT NULL DEFAULT '';
ALTER TABLE public.cotizacion_historial DROP CONSTRAINT cotizacion_historial_accion_check,
 ADD CHECK (accion IN ('creada','editada','seguimiento','documento')),
 ADD COLUMN resumen jsonb;
INSERT INTO public.permisos(codigo,descripcion) VALUES ('cotizaciones.seguimiento','Actualizar seguimiento comercial y documentos');
INSERT INTO public.rol_permisos SELECT r.id,p.id FROM public.roles r,public.permisos p WHERE r.codigo='ADM' AND p.codigo='cotizaciones.seguimiento';
CREATE OR REPLACE FUNCTION private.guardar_cotizacion(p_datos jsonb, p_id uuid DEFAULT NULL, p_version integer DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
 v_id uuid; v_folio bigint; v_codigo text; v_nombre text; v_old public.cotizaciones%ROWTYPE;
 v_empresa uuid; v_solicitante uuid; v_tipo uuid; v_sede uuid; v_part jsonb; v_orden integer := 0;
 v_tarifa public.tarifas%ROWTYPE; v_concepto public.conceptos%ROWTYPE; v_anterior public.partidas%ROWTYPE;
 v_modo text; v_precio numeric; v_cantidad numeric; v_horas numeric; v_version integer;
BEGIN
 IF auth.uid() IS NULL OR NOT private.tiene_permiso('cotizaciones.ver') OR
    NOT private.tiene_permiso(CASE WHEN p_id IS NULL THEN 'cotizaciones.crear' ELSE 'cotizaciones.editar' END) THEN
   RAISE EXCEPTION 'Acceso denegado' USING ERRCODE = '42501';
 END IF;
 IF jsonb_typeof(p_datos) IS DISTINCT FROM 'object' OR
    jsonb_typeof(p_datos->'partidas') IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Datos inválidos' USING ERRCODE = '22023';
 END IF;
 IF jsonb_array_length(p_datos->'partidas') NOT BETWEEN 1 AND 100 OR
    length(btrim(coalesce(p_datos->>'proyecto',''))) NOT BETWEEN 1 AND 200 OR
    length(coalesce(p_datos->>'especificaciones','')) > 5000 THEN
   RAISE EXCEPTION 'Datos inválidos' USING ERRCODE = '22023';
 END IF;
 v_empresa := (p_datos->>'empresa_id')::uuid; v_solicitante := (p_datos->>'solicitante_id')::uuid;
 v_tipo := (p_datos->>'tipo_id')::uuid; v_sede := (p_datos->>'sede_id')::uuid;
 SELECT nombre INTO STRICT v_nombre FROM public.usuarios WHERE id = auth.uid() AND activo;
 IF NOT EXISTS(SELECT 1 FROM public.empresas WHERE id=v_empresa AND activo) OR
    NOT EXISTS(SELECT 1 FROM public.solicitantes WHERE id=v_solicitante AND empresa_id=v_empresa AND activo) OR
    NOT EXISTS(SELECT 1 FROM public.tipos_cotizacion WHERE id=v_tipo AND activo) OR
    NOT EXISTS(SELECT 1 FROM public.sedes WHERE id=v_sede AND activo) THEN
   RAISE EXCEPTION 'Catálogos inválidos' USING ERRCODE = '22023';
 END IF;
 IF p_id IS NOT NULL THEN
  SELECT * INTO v_old FROM public.cotizaciones WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR v_old.bloqueado_en IS NOT NULL THEN RAISE EXCEPTION 'No editable' USING ERRCODE='42501'; END IF;
  IF p_version IS DISTINCT FROM v_old.version THEN RAISE EXCEPTION 'Versión desactualizada' USING ERRCODE='40001'; END IF;
  IF (v_empresa,v_tipo,v_sede) IS DISTINCT FROM (v_old.empresa_id,v_old.tipo_id,v_old.sede_id) THEN
   RAISE EXCEPTION 'El código comercial es inmutable' USING ERRCODE='22023';
  END IF;
  v_id := p_id; v_version := v_old.version+1;
  UPDATE public.cotizaciones SET proyecto=btrim(p_datos->>'proyecto'), especificaciones=coalesce(p_datos->>'especificaciones',''),
   solicitante_id=v_solicitante, version=v_version, actualizado_en=now() WHERE id=v_id;
 ELSE
  v_folio := nextval('public.cotizaciones_folio_seq'::regclass);
  SELECT t.codigo || '-' || s.codigo || '-' || e.codigo || '-' || v_folio::text INTO v_codigo
   FROM public.tipos_cotizacion t, public.sedes s, public.empresas e WHERE t.id=v_tipo AND s.id=v_sede AND e.id=v_empresa;
  v_version := 1;
  INSERT INTO public.cotizaciones(folio,codigo,empresa_id,solicitante_id,tipo_id,sede_id,proyecto,especificaciones,creado_por,creador_nombre)
   VALUES(v_folio,v_codigo,v_empresa,v_solicitante,v_tipo,v_sede,btrim(p_datos->>'proyecto'),coalesce(p_datos->>'especificaciones',''),auth.uid(),v_nombre)
   RETURNING id INTO v_id;
 END IF;
 -- Preparar nuevas partidas antes de borrar las anteriores permite conservar sus tarifas.
 -- Orden temporal negativo no es necesario: se validan y guardan en un array interno.
 DECLARE v_nuevas jsonb := '[]'::jsonb; v_item jsonb; BEGIN
 FOR v_part IN SELECT value FROM jsonb_array_elements(p_datos->'partidas') LOOP
  v_orden := v_orden+1;
  IF coalesce(v_part->>'cantidad','') !~ '^[0-9]{1,5}(\.[0-9]{1,2})?$' OR
     coalesce(v_part->>'horas','') !~ '^[0-9]{1,5}(\.[0-9]{1,2})?$' THEN
   RAISE EXCEPTION 'Cantidad u horas inválidas' USING ERRCODE='22023';
  END IF;
  v_cantidad := (v_part->>'cantidad')::numeric; v_horas := (v_part->>'horas')::numeric;
  IF v_cantidad <= 0 OR v_cantidad > 10000 OR v_horas > 10000 THEN RAISE EXCEPTION 'Partida inválida' USING ERRCODE='22023'; END IF;
  v_modo := coalesce(v_part->>'modo','unidad');
  IF v_modo NOT IN ('directo','hora','unidad') THEN RAISE EXCEPTION 'Modo inválido' USING ERRCODE='22023'; END IF;
  IF v_part ? 'modo' THEN
   IF coalesce(v_part->>'precio','') !~ '^[0-9]{1,7}(\.[0-9]{1,2})?$' OR (v_part->>'precio')::numeric > 1000000 THEN
    RAISE EXCEPTION 'Precio inválido' USING ERRCODE='22023';
   END IF;
   v_precio := (v_part->>'precio')::numeric;
   v_cantidad := CASE v_modo WHEN 'directo' THEN 1 WHEN 'hora' THEN v_horas ELSE v_cantidad END;
   IF v_cantidad <= 0 THEN RAISE EXCEPTION 'Indica las horas presupuestadas' USING ERRCODE='22023'; END IF;
  ELSE
   v_precio := NULL;
  END IF;
  IF p_id IS NOT NULL AND nullif(v_part->>'id','') IS NOT NULL THEN
   SELECT * INTO v_anterior FROM public.partidas WHERE id=(v_part->>'id')::uuid AND cotizacion_id=p_id;
   IF NOT FOUND OR v_anterior.concepto_id IS DISTINCT FROM (v_part->>'concepto_id')::uuid THEN
    RAISE EXCEPTION 'Partida ajena o concepto alterado' USING ERRCODE='22023';
   END IF;
   IF v_precio IS NULL AND v_anterior.modo <> 'unidad' THEN RAISE EXCEPTION 'Actualiza el editor del presupuesto' USING ERRCODE='22023'; END IF;
   v_nuevas := v_nuevas || jsonb_build_array(jsonb_build_object('concepto_id',v_anterior.concepto_id,'tarifa_id',v_anterior.tarifa_id,
    'id',v_anterior.id,'modo',v_modo,'nombre',v_anterior.concepto_nombre,'unidad',v_anterior.unidad,'precio',coalesce(v_precio,v_anterior.precio_unitario),'cantidad',v_cantidad,'horas',v_horas));
  ELSE
   SELECT c.* INTO v_concepto FROM public.conceptos c JOIN public.areas a ON a.id=c.area_id
     WHERE c.id=(v_part->>'concepto_id')::uuid AND c.activo AND a.activo;
   IF NOT FOUND THEN RAISE EXCEPTION 'Concepto inválido' USING ERRCODE='22023'; END IF;
   IF v_precio IS NULL THEN
    SELECT * INTO v_tarifa FROM public.tarifas WHERE concepto_id=v_concepto.id AND vigente_desde<=current_date
     AND (vigente_hasta IS NULL OR vigente_hasta>=current_date) ORDER BY vigente_desde DESC LIMIT 1;
    IF NOT FOUND OR v_tarifa.id IS DISTINCT FROM (v_part->>'tarifa_id')::uuid THEN
     RAISE EXCEPTION 'La tarifa cambió; actualiza el formulario' USING ERRCODE='22023';
    END IF;
   ELSE
    SELECT * INTO v_tarifa FROM public.tarifas WHERE concepto_id=v_concepto.id AND id=(v_part->>'tarifa_id')::uuid;
    IF NOT FOUND AND v_part->>'tarifa_id' IS NOT NULL THEN RAISE EXCEPTION 'Tarifa de otro concepto' USING ERRCODE='22023'; END IF;
   END IF;
   v_nuevas := v_nuevas || jsonb_build_array(jsonb_build_object('concepto_id',v_concepto.id,'tarifa_id',v_tarifa.id,
    'modo',v_modo,'nombre',v_concepto.nombre,'unidad',v_concepto.unidad,'precio',coalesce(v_precio,v_tarifa.precio),'cantidad',v_cantidad,'horas',v_horas));
  END IF;
 END LOOP;
 DELETE FROM public.partidas WHERE cotizacion_id=v_id;
 v_orden := 0;
 FOR v_item IN SELECT value FROM jsonb_array_elements(v_nuevas) LOOP
  v_orden := v_orden+1;
  INSERT INTO public.partidas(id,modo,cotizacion_id,concepto_id,tarifa_id,concepto_nombre,unidad,cantidad,horas,precio_unitario,orden)
   VALUES(coalesce((v_item->>'id')::uuid,gen_random_uuid()),v_item->>'modo',v_id,(v_item->>'concepto_id')::uuid,(v_item->>'tarifa_id')::uuid,v_item->>'nombre',v_item->>'unidad',
    (v_item->>'cantidad')::numeric,(v_item->>'horas')::numeric,(v_item->>'precio')::numeric,v_orden);
 END LOOP;
 END;
 UPDATE public.cotizaciones SET importe=(SELECT sum(subtotal) FROM public.partidas WHERE cotizacion_id=v_id),
  horas=(SELECT sum(horas) FROM public.partidas WHERE cotizacion_id=v_id) WHERE id=v_id;
 INSERT INTO public.cotizacion_historial(cotizacion_id,usuario_id,usuario_nombre,accion,version,importe)
  SELECT id,auth.uid(),v_nombre,CASE WHEN p_id IS NULL THEN 'creada' ELSE 'editada' END,version,importe FROM public.cotizaciones WHERE id=v_id;
 RETURN v_id;
END $$;
CREATE TABLE public.cotizacion_documentos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cotizacion_id uuid NOT NULL REFERENCES public.cotizaciones(id),
 tipo text NOT NULL CHECK(tipo IN ('po','aprobacion','factura','pago')),
 enlace text CHECK(length(enlace)<=2000 AND enlace ~ '^https://drive[.]google[.]com/(file/d/[A-Za-z0-9_-]+(/(view|preview|edit))?/?([?][A-Za-z0-9_=%&.+-]+)?|open[?]id=[A-Za-z0-9_-]+(&[A-Za-z0-9_=%&.+-]+)?)$'),
 objeto text UNIQUE, usuario_id uuid NOT NULL REFERENCES public.usuarios(id),
 usuario_nombre text NOT NULL, creado_en timestamptz NOT NULL DEFAULT now(),
 CHECK(num_nonnulls(enlace,objeto)=1)
);
CREATE INDEX ON public.cotizacion_documentos(cotizacion_id);
ALTER TABLE public.cotizacion_documentos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cotizacion_documentos FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.cotizacion_documentos TO authenticated;
CREATE POLICY lectura_comercial ON public.cotizacion_documentos FOR SELECT TO authenticated USING ((SELECT private.tiene_permiso('cotizaciones.ver')));
CREATE INDEX ON public.cotizacion_documentos(usuario_id);
CREATE TABLE private.project_monitor_pendientes (
 cotizacion_id uuid PRIMARY KEY REFERENCES public.cotizaciones(id),
 carga jsonb NOT NULL, creado_en timestamptz NOT NULL DEFAULT now(), procesado_en timestamptz
);
REVOKE ALL ON private.project_monitor_pendientes FROM PUBLIC,anon,authenticated;

CREATE FUNCTION private.snapshot_cotizacion(p_id uuid) RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT jsonb_build_object('proyecto',c.proyecto,'cliente',e.nombre,'solicitante',s.nombre,'especificaciones',c.especificaciones,
 'es_patrocinio',c.es_patrocinio,'estado',c.estado,'numero_po',c.numero_po,'motivo',c.motivo,'horas',c.horas,'importe',c.importe,
 'partidas',(SELECT jsonb_agg(jsonb_build_object('id',p.id,'concepto',p.concepto_nombre,'area',a.nombre,'area_id',a.id,
 'modo',p.modo,'horas',p.horas,'cantidad',p.cantidad,'precio',p.precio_unitario,'subtotal',p.subtotal) ORDER BY p.orden)
 FROM public.partidas p JOIN public.conceptos k ON k.id=p.concepto_id JOIN public.areas a ON a.id=k.area_id WHERE p.cotizacion_id=c.id))
 FROM public.cotizaciones c JOIN public.empresas e ON e.id=c.empresa_id JOIN public.solicitantes s ON s.id=c.solicitante_id WHERE c.id=p_id
$$;
-- Solo la última versión V1 es reconstruible con exactitud.
UPDATE public.cotizacion_historial h SET resumen=private.snapshot_cotizacion(h.cotizacion_id)
 FROM public.cotizaciones c WHERE h.cotizacion_id=c.id AND h.version=c.version;
CREATE FUNCTION private.snapshot_historial() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN
 NEW.resumen := private.snapshot_cotizacion(NEW.cotizacion_id) || coalesce(NEW.resumen,'{}');
 RETURN NEW;
END $$;
CREATE TRIGGER snapshot_historial BEFORE INSERT ON public.cotizacion_historial FOR EACH ROW EXECUTE FUNCTION private.snapshot_historial();

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES ('cotizaciones-po','cotizaciones-po',false,5242880,ARRAY['application/pdf']);
CREATE POLICY cotizaciones_subir_pdf ON storage.objects FOR INSERT TO authenticated WITH CHECK
 (bucket_id='cotizaciones-po' AND (SELECT private.tiene_permiso('cotizaciones.seguimiento'))
 AND (SELECT private.tiene_permiso('cotizaciones.ver')) AND split_part(name,'/',2)=(SELECT auth.uid())::text
 AND EXISTS(SELECT FROM public.cotizaciones c WHERE c.id::text=split_part(name,'/',1))
 AND name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[1-9][0-9]{0,8}/(po|aprobacion|factura|pago)/[0-9a-f-]{36}[.]pdf$');
CREATE POLICY cotizaciones_leer_pdf ON storage.objects FOR SELECT TO authenticated USING
 (bucket_id='cotizaciones-po' AND (SELECT private.tiene_permiso('cotizaciones.ver')) AND
 (EXISTS(SELECT FROM public.cotizacion_documentos d WHERE d.objeto=name)
 OR (split_part(name,'/',2)=(SELECT auth.uid())::text AND (SELECT private.tiene_permiso('cotizaciones.seguimiento')))));
CREATE POLICY cotizaciones_limpiar_carga ON storage.objects FOR DELETE TO authenticated USING
 (bucket_id='cotizaciones-po' AND split_part(name,'/',2)=(SELECT auth.uid())::text
 AND (SELECT private.tiene_permiso('cotizaciones.ver')) AND (SELECT private.tiene_permiso('cotizaciones.seguimiento'))
 AND NOT EXISTS(SELECT FROM public.cotizacion_documentos d WHERE d.objeto=name));

CREATE FUNCTION private.seguir_cotizacion(p_id uuid,p_version integer,p_datos jsonb) RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 c public.cotizaciones%ROWTYPE; destino text; autor text; doc uuid;
 v_motivo text := btrim(coalesce(p_datos->>'motivo','')); po text; objeto text := p_datos->>'objeto';
 abiertos constant text[] := ARRAY['borrador','pendiente','pausa'];
 aprobados constant text[] := ARRAY['aprobada','aprobada_po','aprobada_sin_po'];
BEGIN
 IF auth.uid() IS NULL OR NOT private.tiene_permiso('cotizaciones.ver') OR NOT private.tiene_permiso('cotizaciones.seguimiento')
 THEN RAISE EXCEPTION 'Acceso denegado' USING ERRCODE='42501'; END IF;
 SELECT * INTO STRICT c FROM public.cotizaciones WHERE id=p_id FOR UPDATE;
 IF c.version IS DISTINCT FROM p_version THEN RAISE EXCEPTION 'Versión desactualizada' USING ERRCODE='40001'; END IF;
 SELECT nombre INTO STRICT autor FROM public.usuarios WHERE id=auth.uid();
 destino := coalesce(p_datos->>'estado',c.estado);
 po := btrim(coalesce(p_datos->>'numero_po',c.numero_po));
 IF length(po)>120 OR length(v_motivo)>2000 THEN RAISE EXCEPTION 'Texto demasiado largo'; END IF;
 IF p_datos ? 'tipo' THEN
  IF objeto IS NOT NULL AND (split_part(objeto,'/',1)<>p_id::text OR split_part(objeto,'/',2)<>auth.uid()::text OR
   NOT EXISTS(SELECT FROM storage.objects WHERE bucket_id='cotizaciones-po' AND name=objeto)) THEN RAISE EXCEPTION 'Archivo inválido'; END IF;
  INSERT INTO public.cotizacion_documentos(cotizacion_id,tipo,enlace,objeto,usuario_id,usuario_nombre)
   VALUES(p_id,p_datos->>'tipo',p_datos->>'enlace',objeto,auth.uid(),autor) RETURNING id INTO doc;
 END IF;
 IF destino<>c.estado AND NOT (
  (c.estado=ANY(abiertos) AND (destino=ANY(abiertos||aprobados) OR destino IN ('rechazada','cancelada','patrocinio'))) OR
  (c.estado='patrocinio' AND (destino=ANY(aprobados) OR destino IN ('rechazada','cancelada'))) OR
  (c.estado=ANY(aprobados) AND destino IN ('aprobada_po','facturada')) OR
  (c.estado='facturada' AND destino='pagada')
 ) THEN RAISE EXCEPTION 'Transición no permitida' USING ERRCODE='22023'; END IF;
 IF destino='aprobada_po' AND po='' AND NOT EXISTS(SELECT FROM public.cotizacion_documentos WHERE cotizacion_id=p_id AND tipo='po')
 THEN RAISE EXCEPTION 'Indica el número o adjunta la PO' USING ERRCODE='22023'; END IF;
 IF destino IN ('rechazada','cancelada') AND v_motivo='' AND (destino<>c.estado OR c.motivo='') THEN RAISE EXCEPTION 'Indica el motivo' USING ERRCODE='22023'; END IF;
 IF destino=c.estado AND po=c.numero_po AND doc IS NULL AND (v_motivo='' OR v_motivo=c.motivo) THEN RETURN; END IF;
 UPDATE public.cotizaciones SET estado=destino,es_patrocinio=c.es_patrocinio OR destino='patrocinio',numero_po=po,motivo=coalesce(nullif(v_motivo,''),c.motivo),
 bloqueado_en=coalesce(c.bloqueado_en,CASE WHEN NOT destino=ANY(abiertos) THEN now() END),
 resuelto_en=coalesce(c.resuelto_en,CASE WHEN destino<>'patrocinio' AND NOT destino=ANY(abiertos) THEN now() END),
 aprobado_en=coalesce(c.aprobado_en,CASE WHEN destino=ANY(aprobados) THEN now() END),
 version_aprobada=coalesce(c.version_aprobada,CASE WHEN destino=ANY(aprobados) THEN c.version+1 END),
 facturado_en=coalesce(c.facturado_en,CASE WHEN destino='facturada' THEN now() END),
 pagado_en=coalesce(c.pagado_en,CASE WHEN destino='pagada' THEN now() END),version=c.version+1,actualizado_en=now()
 WHERE id=p_id RETURNING * INTO c;
 INSERT INTO public.cotizacion_historial(cotizacion_id,usuario_id,usuario_nombre,accion,version,importe,resumen)
 VALUES(p_id,auth.uid(),autor,CASE WHEN doc IS NULL THEN 'seguimiento' ELSE 'documento' END,c.version,c.importe,
 CASE WHEN doc IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('documento',p_datos->>'tipo') END);
 IF c.aprobado_en IS NOT NULL THEN
  INSERT INTO private.project_monitor_pendientes(cotizacion_id,carga)
  SELECT c.id,jsonb_build_object('contrato',1,'cotizacion_id',c.id,'codigo',c.codigo,'empresa_id',c.empresa_id,
  'version_aprobada',c.version_aprobada,'aprobado_en',c.aprobado_en,'evidencia_id',d.id,'presupuesto',h.resumen)
  FROM public.cotizacion_documentos d JOIN public.cotizacion_historial h ON h.cotizacion_id=d.cotizacion_id AND h.version=c.version_aprobada
  WHERE d.cotizacion_id=c.id AND d.tipo IN ('po','aprobacion') ORDER BY d.creado_en,d.id LIMIT 1 ON CONFLICT DO NOTHING;
 END IF;
END $$;
CREATE FUNCTION public.seguir_cotizacion(p_id uuid,p_version integer,p_datos jsonb) RETURNS void
 LANGUAGE sql SECURITY INVOKER SET search_path='' AS $$ SELECT private.seguir_cotizacion(p_id,p_version,p_datos) $$;
REVOKE ALL ON FUNCTION private.snapshot_cotizacion(uuid),private.snapshot_historial(),private.seguir_cotizacion(uuid,integer,jsonb),public.seguir_cotizacion(uuid,integer,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION private.seguir_cotizacion(uuid,integer,jsonb),public.seguir_cotizacion(uuid,integer,jsonb) TO authenticated;
CREATE FUNCTION public.cotizaciones_periodo(p_mes date,p_buscar text,p_empresa uuid,p_estado text,p_pagina integer,p_asc boolean)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 WITH periodo AS (
  SELECT date_trunc('month',p_mes::timestamp) AT TIME ZONE 'America/Tijuana' inicio,
  (date_trunc('month',p_mes::timestamp)+interval '1 month') AT TIME ZONE 'America/Tijuana' fin
 ), datos AS (
  SELECT c.id,c.folio,c.codigo,c.creado_en,c.empresa_id,coalesce(h.resumen->>'proyecto',c.proyecto) proyecto,
   coalesce(h.resumen->>'numero_po','') numero_po,coalesce(h.resumen->>'estado','borrador') estado,h.importe,(h.resumen->>'horas')::numeric horas,
   jsonb_build_object('nombre',coalesce(h.resumen->>'cliente',e.nombre)) empresas,
   jsonb_build_object('nombre',coalesce(h.resumen->>'solicitante',s.nombre)) solicitantes,
   c.creado_en<p.inicio arrastre,c.aprobado_en>=p.inicio AND c.aprobado_en<p.fin aprobada,
   c.facturado_en>=p.inicio AND c.facturado_en<p.fin facturada,c.pagado_en>=p.inicio AND c.pagado_en<p.fin pagada
  FROM public.cotizaciones c JOIN public.empresas e ON e.id=c.empresa_id CROSS JOIN periodo p
  JOIN public.solicitantes s ON s.id=c.solicitante_id
  JOIN LATERAL (SELECT * FROM public.cotizacion_historial WHERE cotizacion_id=c.id AND creado_en<p.fin ORDER BY version DESC LIMIT 1) h ON true
  WHERE (c.creado_en>=p.inicio OR h.resumen->>'estado' IN ('pendiente','pausa')
   OR EXISTS(SELECT FROM public.cotizacion_historial ev WHERE ev.cotizacion_id=c.id AND ev.creado_en>=p.inicio AND ev.creado_en<p.fin))
 ), filtradas AS (
  SELECT * FROM datos WHERE (p_empresa IS NULL OR empresa_id=p_empresa) AND (p_estado='' OR estado=p_estado)
  AND (p_buscar='' OR strpos(lower(concat_ws(' ',codigo,proyecto,empresas->>'nombre',solicitantes->>'nombre')),lower(p_buscar))>0)
 ), pagina AS (SELECT * FROM filtradas ORDER BY CASE WHEN p_asc THEN creado_en END ASC,creado_en DESC,id LIMIT 20 OFFSET (greatest(1,p_pagina)-1)::bigint*20)
 SELECT jsonb_build_object('rows',coalesce((SELECT jsonb_agg(to_jsonb(pagina)) FROM pagina),'[]'),
 'count',count(*),'cotizado',coalesce(sum(importe) FILTER(WHERE NOT arrastre),0),
 'pendientes',count(*) FILTER(WHERE estado IN ('pendiente','pausa')),
 'aprobado',coalesce(sum(importe) FILTER(WHERE aprobada),0),'facturado',coalesce(sum(importe) FILTER(WHERE facturada),0),
 'cobrado',coalesce(sum(importe) FILTER(WHERE pagada),0)) FROM filtradas
$$;
REVOKE ALL ON FUNCTION public.cotizaciones_periodo(date,text,uuid,text,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cotizaciones_periodo(date,text,uuid,text,integer,boolean) TO authenticated;
COMMENT ON TABLE public.cotizaciones IS 'Presupuesto comercial versionado con bloqueo económico permanente al resolver.';
COMMIT;
