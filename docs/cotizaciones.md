# Cotizaciones — primera entrega funcional

## Estado de entrega y alcance

Implementados: listado persistido, búsqueda por código/proyecto, filtros por cliente/estado, orden por fecha, paginación de 20 filas, creación y edición de borradores, detalle, partidas dinámicas, resumen decimal, historial, permisos por módulo y navegación por permisos.

Las rutas y acciones consultan Supabase con la sesión del usuario y clave publicable. No hay datos comerciales simulados en las pantallas ni uso de `service_role` en operaciones normales.

**Pendiente para validar el recorrido completo remoto:** autorizar/cargar `supabase/seed.sql` o proporcionar catálogos reales autorizados, y disponer de una cuenta ADM de pruebas para el navegador. La revisión automática bloqueó el seed remoto porque la rama principal aparece como `production`, aunque el encargo identifica el proyecto como desarrollo. No se intentó eludir ese bloqueo. Al verificar, el catálogo remoto de empresas estaba vacío.

El esquema remoto ya está aplicado al proyecto **DAB 2.0**, referencia **bxcxxhcnqoedfhhcyrlp**. No se tocaron otros proyectos ni se ejecutó un reset remoto.

## Auditoría inicial y conservación del trabajo

La auditoría inicial de ESLint, TypeScript y `next build` pasó. Se revisaron las guías instaladas de Next.js 16.4.6 para autenticación con Cache Components y Server Actions, así como la implementación real del login, Proxy, cliente Supabase, shell y permisos.

Había modificaciones manuales previas en `next.config.ts`, el cliente Supabase de servidor, Cotizaciones y páginas de acceso, además de la eliminación de `src/app/page.tsx`. Se conservaron las correcciones de `connection()`, `cookies()` y `Suspense`. No se recreó la página raíz eliminada; su redirect configurado utiliza ahora `/inicio`, que resuelve el destino por permisos.

## Organización

```text
src/
├── app/
│   ├── (auth)/sin-permiso/page.tsx            # Acceso restringido y logout
│   └── (dashboard)/
│       ├── layout.tsx                       # Sesión y navegación autorizada
│       ├── inicio/page.tsx                  # Destino por permisos
│       ├── espejo/page.tsx                  # Pantalla provisional de TM
│       ├── reportes/page.tsx                # Pantalla provisional protegida
│       ├── proyectos/page.tsx               # Permiso proyectos.ver
│       ├── daily/page.tsx                   # Permiso daily.ver
│       ├── rh/page.tsx                      # No disponible (404)
│       └── cotizaciones/
│           ├── page.tsx                     # Listado y filtros de URL
│           ├── nueva/page.tsx
│           ├── [id]/page.tsx                # Detalle e historial
│           ├── [id]/editar/page.tsx
│           ├── loading.tsx
│           ├── error.tsx
│           └── not-found.tsx
├── components/
│   ├── layout/{app-shell,app-navigation}.tsx
│   └── shared/protected-placeholder.tsx
├── config/navigation.ts
├── modules/
│   ├── auth/actions/auth.actions.ts
│   └── cotizaciones/
│       ├── actions/cotizaciones.actions.ts
│       ├── components/
│       │   ├── cotizacion-form.tsx
│       │   ├── partidas-editor.tsx
│       │   ├── cotizacion-summary.tsx
│       │   ├── cotizacion-status.tsx
│       │   ├── cotizaciones-filters.tsx
│       │   └── cotizaciones-table.tsx
│       ├── constants/cotizacion-statuses.ts
│       ├── lib/importes.ts
│       ├── schemas/cotizacion.schema.ts
│       ├── server/cotizaciones.service.ts
│       ├── server/cotizaciones.repository.ts
│       └── types/cotizacion.types.ts
└── server/auth/
    ├── require-app-user.ts
    └── permissions.ts
supabase/
├── migrations/20261112110139_catalogos_comerciales.sql
├── migrations/20261112110144_cotizaciones_partidas.sql
└── seed.sql
tests/
├── unit/{cotizaciones,actions,auth,permissions}.test.ts
├── integration/database.test.mjs
├── integration/remote-readonly.sql
├── integration/remote.test.mjs
└── e2e/cotizaciones.spec.ts
playwright.config.ts
vitest.config.ts
```

También cambiaron `package.json`, `package-lock.json`, `.gitignore` y este README/documento. Dependencias añadidas: Zod, decimal.js y server-only; herramientas de pruebas Vitest, Playwright, PGlite y Prettier. Los tipos de Node se alinearon con Node 24. No se actualizó Next.js ni se reemplazó el sistema de componentes existente.

## Flujo de una operación

1. La página comprueba `cotizaciones.ver` y, cuando corresponde, crear o editar.
2. El formulario envía identificadores, texto, cantidades y horas. No envía un total definitivo.
3. La Server Action verifica permisos y valida con Zod. Los errores esperados se devuelven al formulario.
4. El servicio vuelve a proteger la operación y entrega los datos validados al repositorio.
5. El repositorio llama a `public.guardar_cotizacion` con el cliente Supabase de la sesión.
6. PostgreSQL comprueba permisos activos, catálogos, estado y versión; obtiene la tarifa, genera folio/código, guarda cabecera/partidas e historial en una transacción.
7. La acción invalida listado/detalle y redirige al listado con un enlace al registro guardado. Los redirects de Next.js no se capturan como errores de negocio.

No hay caché global de autorización o información comercial. Los componentes que leen sesión/parámetros están dentro de `Suspense`, conservando Cache Components y Partial Prefetching.

## Tablas y relaciones

| Tabla | Responsabilidad |
|---|---|
| empresas | Cliente y código corto controlado |
| solicitantes | Persona ficticia o contacto autorizado vinculado a una empresa |
| areas | Agrupación comercial de conceptos |
| conceptos | Nombre y unidad de cada concepto, vinculado a área |
| tarifas | Precio `numeric(12,2)` y vigencia por concepto |
| tipos_cotizacion, sedes | Prefijos configurables |
| cotizaciones | Folio, código, cliente, solicitante, proyecto, borrador, autor y versión |
| partidas | Concepto/tarifa de origen y copia de nombre, unidad y precio aplicado |
| cotizacion_historial | Autor, fecha, acción, versión e importe de cada guardado |

La FK compuesta de solicitante y empresa evita asociar contactos de otro cliente. Las partidas tienen FK y orden único por cotización. Se indexaron las FK y el orden de consulta. El historial es básico, no una auditoría exhaustiva con diferencias por campo.

## Permisos y garantías

Se conserva `private.tiene_permiso(text)`, que consulta los roles de `auth.uid()` y exige perfil activo. `obtenerPermisosUsuario` une los permisos de todos los roles; `exigirPermiso` protege páginas y acciones. No se usan roles recibidos del navegador ni `user_metadata`.

| Módulo | Permiso |
|---|---|
| Cotizaciones | cotizaciones.ver |
| Project Monitor | proyectos.ver |
| Daily | daily.ver |
| Mi Espejo | espejo.ver |
| Reportes | reportes.ver |

TM con solo `espejo.ver` inicia en `/espejo`. RH no aparece en la navegación y su ruta devuelve 404. Sin sesión se envía a `/login`; un perfil inactivo/sin rol a `/acceso-denegado`; un módulo no autorizado a `/sin-permiso`.

En esta entrega, `cotizaciones.ver` permite leer el conjunto comercial completo y `cotizaciones.editar` permite editar cualquier borrador. Es coherente con el mapa inicial, donde ADM tiene esos permisos. **No hay separación por departamento, propietario o tenant**; esa política requiere definición antes de conceder permisos comerciales a nuevos roles.

RLS está habilitado en todas las tablas nuevas; SELECT exige el permiso comercial. `anon` no tiene acceso. Se revoca INSERT/UPDATE/DELETE directo incluso a `authenticated`: concederlo permitiría saltarse la operación indivisible o alterar importes.

Por esa razón se utiliza una función **SECURITY DEFINER en `private`**, con `search_path=''`, identidad/permisos explícitos, sin SQL dinámico a partir del cliente y sin parámetros privilegiados. El wrapper expuesto es **SECURITY INVOKER**. EXECUTE se revoca a PUBLIC/anon y se concede solo a authenticated. No se usa definer como sustituto de la comprobación de permisos. Las pruebas comprueban tanto RLS como privilegios de tabla y función.

## Importes, tarifas y edición

- Fuente de verdad: `numeric` en PostgreSQL. Subtotal = `round(cantidad * precio_unitario, 2)`; total = suma de subtotales.
- El navegador reproduce ese redondeo técnico con decimal.js (HALF_UP), evitando operaciones financieras con `number` binario. Este redondeo a centésimas es de almacenamiento, no una política fiscal/comercial confirmada.
- Cantidades: mayor que 0 y hasta 10,000, dos decimales. Horas: 0 a 10,000, dos decimales. Hasta 100 partidas y precio de catálogo hasta 1,000,000.
- Las horas son el presupuesto total de cada partida; se suman y **no multiplican el precio**. Validar esta convención con Studio.
- Entre tarifas vigentes se elige la de inicio más reciente (fecha UTC de PostgreSQL). Si cambió después de abrir el formulario, se rechaza el guardado y se pide actualizar.
- Una partida existente conserva su tarifa/precio/nombre/unidad. Para cambiar de concepto se elimina y agrega otra. Las tarifas antiguas no se borran porque están referenciadas.
- Una edición bloquea la cabecera con `FOR UPDATE` y compara `version`. Una segunda edición con versión vieja falla sin sobrescribir datos.
- Empresa, tipo, sede, folio, código y creador no se cambian en una edición. El solicitante sí puede cambiar dentro de la empresa.
- Una partida inválida revierte también la cabecera, la versión y el historial. La secuencia puede dejar huecos después de fallos.

## Folio, código y decisiones provisionales

El folio usa una secuencia de PostgreSQL, nunca `MAX + 1`. Folio y código tienen restricciones UNIQUE.

Composición provisional: `TIPO-SEDE-CLIENTE-FOLIO`. Los prefijos se leen de catálogos. El seed usa `DEV-TEST-DEMO`; no son prefijos oficiales. Cambiar catálogos no reescribe códigos emitidos.

Se conserva la posibilidad técnica de importar folios/códigos históricos mediante una migración administrativa con `GENERATED BY DEFAULT` y ajuste posterior de secuencia. No hay una pantalla ni importador histórico en esta entrega.

Solo existe `borrador`. No se implementó aprobación definitiva ni pendiente de aprobación por falta de reglas/evidencia. PO, facturación, cobro y habilitación de proyectos/Daily son procesos separados y aún no implementados. Tampoco se agregaron impuestos, descuentos ni una moneda oficial por defecto. Deben confirmarse moneda, impuestos, alcance por departamento, prefijos, importaciones y reglas de aprobación con Studio.

La referencia visual fue la pantalla `Cotizaciones · Lista` (`2:13`) del archivo Figma suministrado. Se reutilizan Montserrat local, tokens, Card/Button y el shell existente. Se omiten indicadores de facturación/cobro del mockup por estar fuera del alcance. La comparación visual autenticada completa sigue pendiente.

## Migraciones y entornos

CLI comprobada: 3.1.0. La ayuda confirma que v3 usa local por defecto y requiere `--remote` para un destino hospedado.

Historial remoto verificado:

1. `20261112095711_usuarios_roles_permisos`: existente, no modificada ni reaplicada.
2. `20261112110139_catalogos_comerciales`: aplicada.
3. `20261112110144_cotizaciones_partidas`: aplicada.

En un entorno nuevo, configurar primero el proyecto correcto, revisar su historial y usar las migraciones versionadas. Para una instalación limpia local con Supabase CLI se necesita Docker; no estaba disponible en esta máquina. Las pruebas PGlite sí aplican desde cero todas las migraciones y el seed, sin Docker.

```powershell
npx supabase --version
npx supabase db push --help
npx supabase migration list --remote=<referencia-verificada>
npx supabase db push --dry-run --remote=<referencia-verificada>
# Solo después de comprobar y autorizar el destino:
npx supabase db push --remote=<referencia-verificada> --skip-vault --yes
```

Los archivos nuevos se crearon con `supabase migration new`. No editar una migración aplicada; cualquier corrección posterior requiere otra migración.

`seed.sql` es idempotente (`ON CONFLICT DO NOTHING`), contiene solo datos ficticios y no modifica roles ni usuarios. **No cargarlo en producción.** Tras confirmar el entorno de desarrollo, puede ejecutarse con `supabase db query --file supabase/seed.sql --remote=<referencia-verificada> --yes`. Este comando se documenta, pero la carga remota no se realizó en esta sesión.

## Pruebas y resultados

| Verificación | Resultado de esta sesión |
|---|---|
| Auditoría inicial: ESLint, TypeScript, build | Pasaron |
| Unitarias (`npm test`) | 22 pruebas pasaron |
| SQL local (`npm run test:db`) | 13 pruebas pasaron |
| ESLint final / TypeScript / build | Pasaron |
| E2E escritorio/móvil | 4 casos anónimos pasaron; 2 casos ADM omitidos sin credenciales |
| Auditoría producción (`npm audit --omit=dev`) | 0 vulnerabilidades |
| Historial, RLS y privilegios remotos | Consultados y verificados |
| `remote-readonly.sql` con SET ROLE authenticated | Pasó para ADM, sesión vacía y revocación de DML |
| Advisors seguridad | Sin incidencias de esquema; aviso de protección de contraseñas filtradas desactivada |
| Advisors rendimiento | Información de índices aún no usados en tablas recién creadas |
| Concurrencia real remota | Pendiente, no ejecutada |
| Recorrido ADM de navegador y revisión visual completa | Pendiente, no ejecutado |

PGlite ejecuta PostgreSQL real en memoria. Solo se simulan `auth.users`/`auth.uid` y las identidades de prueba; la aplicación SQL usa `SET LOCAL ROLE authenticated`. Cubre ADM, TM, inactivo, lector sin permiso de escribir, anon, atomicidad, decimales, snapshots, tarifas desactualizadas, campos privilegiados, versión, partidas ajenas y restricciones. Su única conexión serializa las consultas: el lote paralelo **no demuestra concurrencia entre sesiones**.

Las pruebas unitarias de acciones usan mocks y comprueban autorización/validación/revalidación; no reemplazan las pruebas SQL. Las pruebas E2E autenticadas y remotas están preparadas y requieren una cuenta de pruebas y autorización de escritura:

```powershell
$env:E2E_ADM_EMAIL = '<correo-de-cuenta-de-pruebas>'
$env:E2E_ADM_PASSWORD = '<contraseña-de-pruebas>'
npm run build
npm run test:e2e
# Solo después de autorizar las escrituras remotas:
$env:DAB_REMOTE_TESTS = '1'
npm run test:remote
```

No guardar contraseñas en Git. El test remoto utiliza la clave publicable y la sesión ADM, limita el destino al ref de desarrollo y deja dos borradores identificados como `PRUEBA CONCURRENCIA`; no borra datos automáticamente. El E2E deja borradores con nombre `E2E prueba`. El script remoto comprueba dos RPC simultáneas y lectura posterior con partidas. No fue ejecutado en esta sesión.

## Comprobaciones manuales pendientes

- [ ] Autorizar y cargar catálogos de desarrollo o catálogos reales validados.
- [ ] ADM: login, navegación a Cotizaciones y listado vacío inicial.
- [ ] Crear con dos partidas, cantidades decimales, horas y solicitante de la empresa.
- [ ] Guardar, encontrar en búsqueda/filtros, abrir detalle y comprobar folio/código/importes.
- [ ] Editar y verificar historial, código estable y conservación de precio.
- [ ] Abrir dos pestañas, guardar una y comprobar conflicto de versión en la otra.
- [ ] Probar agregar/eliminar partidas y mensajes de validación con teclado.
- [ ] Revisar tabla con desplazamiento horizontal y formulario en móvil.
- [ ] TM: inicio en Espejo y acceso denegado a rutas de Cotizaciones.
- [ ] Inactivo: acceso no habilitado, sin datos comerciales.
- [ ] Logout y ausencia de datos al volver a rutas protegidas sin sesión.
- [ ] Ejecutar el test de concurrencia remoto con cuenta de pruebas autorizada.
- [ ] Resolver con Studio las reglas comerciales pendientes antes de ampliar estados.

## Git

Se trabajó en el checkout existente, conservando cambios previos. No se hicieron commits ni push. Revisar `git status --short` y el diff antes de crear un commit conjunto; los archivos de acceso denegado, permisos y configuración incluían trabajo manual anterior.
