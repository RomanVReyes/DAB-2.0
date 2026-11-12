-- Verificación remota de solo lectura. No crea usuarios ni modifica roles/datos.
BEGIN;
SELECT set_config('request.jwt.claim.sub', (
 SELECT u.id::text FROM public.usuarios u JOIN public.usuario_roles ur ON ur.usuario_id=u.id
 JOIN public.roles r ON r.id=ur.rol_id WHERE u.activo AND r.codigo='ADM' LIMIT 1
), true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF NOT private.tiene_permiso('cotizaciones.ver') THEN RAISE EXCEPTION 'No hay ADM activo para probar'; END IF;
 IF has_table_privilege(current_user,'public.cotizaciones','INSERT') THEN RAISE EXCEPTION 'DML directo permitido'; END IF;
 PERFORM id FROM public.cotizaciones LIMIT 1;
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 IF private.tiene_permiso('cotizaciones.ver') THEN RAISE EXCEPTION 'Sesión vacía autorizada'; END IF;
 IF EXISTS(SELECT 1 FROM public.cotizaciones) OR EXISTS(SELECT 1 FROM public.empresas) THEN RAISE EXCEPTION 'RLS expone filas'; END IF;
END $$;
RESET ROLE;
SELECT 'OK: ADM autorizado; sesión vacía denegada; DML directo revocado' AS resultado;
ROLLBACK;
