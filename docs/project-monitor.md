# Project Monitor V1

La rama local codex/project-monitor-v1 parte de c9f2909 en codex/cotizaciones-v2. La migración de Project Monitor V1 se validó en PGlite sobre el historial de Cotizaciones V2 y se aplicó con autorización a Supabase DAB 2.0 (bxcxxhcnqoedfhhcyrlp). El conector registró la versión 20261127074626. El archivo local se renombró para coincidir con el historial remoto. Se comprobó en modo de solo lectura que ADM puede consultar y una sesión sin usuario no recibe datos.

## Flujo

En /proyectos, Administración elige el tipo e incorpora una entrada pendiente. La RPC bloquea la fila de la cola privada, conserva como clave la cotización y copia el código, cliente, nombre, versión, fecha y líneas del presupuesto aprobado. El historial comercial y la carga original permanecen intactos. La misma transacción registra la incorporación y marca procesado_en. Repetirla devuelve el mismo identificador. Las complementarias conservan su folio independiente. El filtro mensual selecciona el mes UTC de aprobación sin duplicar proyectos.

En /proyectos/[id], Administración revisa el presupuesto, clasifica cada línea por departamento y rubro y actualiza tipo y estado. La clasificación empieza pendiente. Las horas originales permanecen fijas. Los rubros se escriben de forma explícita según corresponda a Film, TINT, Social Media o Design. Las asignaciones de departamentos a usuarios se mantienen en usuario_departamentos mediante administración de base de datos. TL sin asignación ve el listado vacío. Un TL asignado ve el proyecto completo si al menos un departamento coincide. AG y GL pueden consultar. TM carece de acceso al módulo.

## Implementación

Las páginas y el manejo de errores están en src/app/(dashboard)/proyectos. Las acciones de servidor y el contrato de consumo están en src/modules/proyectos. PostgreSQL protege las tablas con RLS, revoca las escrituras directas y restringe las RPC por identidad, rol y permiso. La cola solo se consulta mediante una proyección administrativa con identificador, código y proyecto.

El futuro Daily debe proporcionar horas confirmadas o null cuando falten registros. consumo.ts calcula saldo y umbrales de 100 % y 120 %, con porcentaje indefinido cuando el presupuesto es cero. Hasta entonces el detalle presenta un estado vacío. Siguen pendientes entregables, avance físico, correos, cierres históricos, reglas de igualas y administración visual de asignaciones de TL.

## Validación

Ejecutar npm test y npm run test:db. El caso de Project Monitor prueba falta de evidencia, reintento de incorporación, clasificación, presupuesto cero y alcance departamental. Playwright incluye protección de las rutas de lista y detalle en escritorio y móvil. La prueba SQL usa PostgreSQL embebido; la validación visual autenticada de las pantallas operativas queda pendiente. Se utilizó la documentación de Cotizaciones del repositorio en lugar de la copia cotizaciones(3).md, que no estaba en los adjuntos disponibles.

