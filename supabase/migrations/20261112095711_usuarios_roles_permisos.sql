-- DAB 2.0 · Primera migración: usuarios, roles y permisos
-- Destino: proyecto de DESARROLLO de Supabase, PostgreSQL 17.
-- Pegar el contenido en el archivo creado por: npx supabase migration new usuarios_roles_permisos
-- No modificar auth.users: lo administra Supabase Auth.
-- Roles y permisos iniciales = propuesta. Ajustar tras validación con Studio.

BEGIN;

-- 1) Perfil de cada cuenta autenticada. El UUID es exactamente auth.users.id.
CREATE TABLE public.usuarios (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nombre text NOT NULL CHECK (btrim(nombre) <> ''),
    activo boolean NOT NULL DEFAULT true,
    creado_en timestamptz NOT NULL DEFAULT now()
);

-- 2) Roles: funciones generales que podrá tener una persona.
CREATE TABLE public.roles (
    id smallint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo text NOT NULL UNIQUE CHECK (codigo IN ('ADM', 'GL', 'TL', 'TM', 'AG')),
    descripcion text NOT NULL
);

-- 3) Permisos: acciones concretas que existen en el sistema.
CREATE TABLE public.permisos (
    id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo text NOT NULL UNIQUE,
    descripcion text NOT NULL
);

-- 4) Un usuario puede tener más de un rol.
CREATE TABLE public.usuario_roles (
    usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    rol_id smallint NOT NULL REFERENCES public.roles(id) ON DELETE RESTRICT,
    asignado_en timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, rol_id)
);

-- 5) Un rol puede tener varios permisos; un permiso puede pertenecer a varios roles.
CREATE TABLE public.rol_permisos (
    rol_id smallint NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
    permiso_id integer NOT NULL REFERENCES public.permisos(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

CREATE INDEX idx_usuario_roles_rol ON public.usuario_roles(rol_id);
CREATE INDEX idx_rol_permisos_permiso ON public.rol_permisos(permiso_id);

-- Catálogo inicial de roles, según el manual operativo.
INSERT INTO public.roles (codigo, descripcion) VALUES
    ('ADM', 'Administración'),
    ('GL', 'Group Leader'),
    ('TL', 'Team Leader'),
    ('TM', 'Team Member'),
    ('AG', 'Alta Gerencia');

-- Catálogo mínimo de acciones. Los alcances por departamento se implementarán después.
INSERT INTO public.permisos (codigo, descripcion) VALUES
    ('usuarios.administrar', 'Dar de alta y administrar usuarios y roles'),
    ('cotizaciones.ver', 'Consultar cotizaciones autorizadas'),
    ('cotizaciones.crear', 'Crear cotizaciones'),
    ('cotizaciones.editar', 'Editar cotizaciones según su estado'),
    ('cotizaciones.registrar_aprobacion', 'Registrar evidencia de aprobación comercial'),
    ('cotizaciones.documentos', 'Gestionar documentos comerciales'),
    ('proyectos.ver', 'Consultar proyectos autorizados'),
    ('proyectos.crear', 'Dar de alta proyectos operativos'),
    ('proyectos.editar', 'Corregir datos maestros de proyectos'),
    ('proyectos.presupuesto_editar', 'Modificar presupuestos de horas autorizados'),
    ('daily.ver', 'Consultar la planeación del Daily'),
    ('daily.asignar', 'Crear y modificar asignaciones del Daily'),
    ('daily.registrar_horas', 'Registrar horas reales trabajadas'),
    ('espejo.ver', 'Consultar el Espejo personal'),
    ('reportes.ver', 'Consultar reportes y estadísticas autorizadas');

-- Mapa preliminar de permisos. NO representa aún los ámbitos por departamento.
INSERT INTO public.rol_permisos (rol_id, permiso_id)
SELECT r.id, p.id
FROM public.roles AS r
CROSS JOIN public.permisos AS p
WHERE r.codigo = 'ADM'
   OR (r.codigo = 'GL' AND p.codigo IN
       ('proyectos.ver', 'daily.ver', 'reportes.ver'))
   OR (r.codigo = 'TL' AND p.codigo IN
       ('proyectos.ver', 'daily.ver', 'daily.asignar', 'daily.registrar_horas'))
   OR (r.codigo = 'TM' AND p.codigo = 'espejo.ver')
   OR (r.codigo = 'AG' AND p.codigo IN ('proyectos.ver', 'reportes.ver'));

-- Seguridad: todas las tablas del esquema public deben tener RLS.
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuario_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rol_permisos ENABLE ROW LEVEL SECURITY;

-- No permitir acciones directas de escritura a usuarios de la aplicación.
-- Las futuras operaciones administrativas usarán un backend autorizado.
REVOKE ALL ON TABLE public.usuarios FROM anon, authenticated;
REVOKE ALL ON TABLE public.roles FROM anon, authenticated;
REVOKE ALL ON TABLE public.permisos FROM anon, authenticated;
REVOKE ALL ON TABLE public.usuario_roles FROM anon, authenticated;
REVOKE ALL ON TABLE public.rol_permisos FROM anon, authenticated;

-- Lectura para sesiones autenticadas; RLS decide qué filas son visibles.
GRANT SELECT ON TABLE public.usuarios TO authenticated;
GRANT SELECT ON TABLE public.roles TO authenticated;
GRANT SELECT ON TABLE public.permisos TO authenticated;
GRANT SELECT ON TABLE public.usuario_roles TO authenticated;
GRANT SELECT ON TABLE public.rol_permisos TO authenticated;

CREATE POLICY usuarios_lectura_propia
ON public.usuarios FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()));

CREATE POLICY usuario_roles_lectura_propia
ON public.usuario_roles FOR SELECT TO authenticated
USING (usuario_id = (SELECT auth.uid()));

-- Son catálogos de permisos (no contienen contraseñas ni secretos).
-- Poder leerlos NO permite asignarse o modificarse roles.
CREATE POLICY roles_catalogo_lectura
ON public.roles FOR SELECT TO authenticated
USING (true);

CREATE POLICY permisos_catalogo_lectura
ON public.permisos FOR SELECT TO authenticated
USING (true);

CREATE POLICY rol_permisos_catalogo_lectura
ON public.rol_permisos FOR SELECT TO authenticated
USING (true);

-- Función interna: verifica si el usuario autenticado tiene un permiso.
-- Se deja en un esquema NO expuesto por la API. No recibe un ID de usuario
-- ni permite consultar los permisos de otra persona.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;

CREATE FUNCTION private.tiene_permiso(p_codigo text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $func$
    SELECT EXISTS (
        SELECT 1
        FROM public.usuarios AS u
        JOIN public.usuario_roles AS ur ON ur.usuario_id = u.id
        JOIN public.rol_permisos AS rp ON rp.rol_id = ur.rol_id
        JOIN public.permisos AS p ON p.id = rp.permiso_id
        WHERE u.id = (SELECT auth.uid())
          AND u.activo = true
          AND p.codigo = p_codigo
    );
$func$;

REVOKE ALL ON FUNCTION private.tiene_permiso(text) FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.tiene_permiso(text) TO authenticated;

COMMENT ON FUNCTION private.tiene_permiso(text) IS
'Consulta interna de permisos del usuario de sesión. No reemplaza las comprobaciones de alcance ni autoriza modificar los roles.';

COMMIT;
