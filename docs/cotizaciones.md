# Cotizaciones V2

La rama de implementación es `codex/cotizaciones-v2`. Parte de la primera entrega, commit `8ebbc2b`. El código V2 necesita la migración adicional antes de servir tráfico. La verificación local usa datos ficticios. En el proyecto Supabase DAB 2.0, `bxcxxhcnqoedfhhcyrlp`, se verificaron las tres migraciones V1 y tres presupuestos existentes. La revisión automática bloqueó el despliegue de V2 por falta de autorización explícita para modificar ese remoto. La carga de catálogos y las pruebas con escrituras remotas están fuera de los resultados locales.

## Captura y precios

Administración crea el presupuesto desde Cotizaciones. Puede empezar vacío o duplicar uno existente. La copia toma los datos generales y los precios aplicados, y recibe un nuevo folio al guardarse. Seguimiento, evidencia y aprobación pertenecen al original.

| Cálculo | Datos económicos | Horas presupuestadas |
|---|---|---|
| Importe directo | Importe negociado completo | Independientes, pueden ser cero |
| Por hora | Horas presupuestadas × precio editable por hora | Mayores que cero |
| Por unidad | Cantidad × precio editable por unidad | Independientes, pueden ser cero |

El área filtra los conceptos activos configurados en el catálogo. Una tarifa vigente precarga el precio. También se puede cotizar un concepto sin tarifa. Video/Film, TINT, Design y Social Media se representan mediante áreas y conceptos configurables. El manual y las columnas de horas/costos del Excel sustentan esta separación. La aplicación no carga tarifas, márgenes ni datos comerciales desde esos archivos.

PostgreSQL calcula cada subtotal en `numeric` y redondea a centésimas antes de sumar. En almacenamiento, `cantidad` es el multiplicador efectivo (1, horas o unidades). El navegador reproduce la operación con decimal.js. Se conservan los límites de 100 partidas, 10 000 unidades u horas por partida y 1 000 000 por precio capturado. El resumen muestra subtotales por área, horas e importe global. Los importes excluyen impuestos y descuentos.

Las partidas anteriores a V2 conservan cantidad, horas, nombre, unidad, precio y subtotal bajo el modo por unidad. La nueva versión conserva el identificador de las partidas que se editan para poder comparar los cambios. La RPC original sigue disponible para clientes V1 que guardan partidas por catálogo. Empresa, tipo, sede y código permanecen fijos al editar un folio emitido. La escritura usa bloqueo de fila y versión esperada.

## Estados y documentos

| Desde | Cambios disponibles |
|---|---|
| Borrador, Pendiente de Aprobación, En pausa | Otros estados abiertos, aprobación genérica/con PO/sin PO, rechazo, cancelación o patrocinio |
| PATROCINIO | Aprobación, rechazo o cancelación. Se conserva la clasificación de patrocinio después de resolver |
| Aprobada o Aprobada sin PO | Aprobada con PO o Facturado |
| Aprobada con PO | Facturado |
| Facturado | PAGADA |
| No Aprobada, Cancelada, PAGADA | Seguimiento administrativo y documentos |

Los identificadores internos son estables. Las variantes de capitalización del Excel como «Pagada» y «pagada» corresponden a `pagada`. Una futura importación debe mapear cada etiqueta y revisar los casos ambiguos. «Aprobada» indica autorización comercial. «PAGADA» registra el cobro total declarado por Administración. El número de PO indica una referencia de compra. Factura y comprobante de pago son evidencias distintas.

La salida de los estados abiertos bloquea los datos económicos en la base. Al rechazar o cancelar se exige un motivo. Las fechas de aprobación, resolución, facturación y pago se conservan por separado. La aplicación permite adjuntar documentos después del bloqueo y registrar la PO después de aprobar. Una corrección presupuestaria posterior se tramita con un nuevo borrador y un nuevo ciclo de aprobación. El original conserva su historial. Studio debe definir el procedimiento de sustitución si requiere vincular formalmente ambos folios.

El permiso `cotizaciones.seguimiento` se concede inicialmente a ADM y se comprueba junto con `cotizaciones.ver`. Los permisos existentes gobiernan creación y edición. La aplicación usa el cliente Supabase de la sesión. Las tablas comerciales tienen RLS y acceso directo de lectura condicionado. Las escrituras pasan por RPC, con autorización, versión y auditoría en la misma transacción.

Cada documento guarda tipo, referencia, usuario y fecha. Los PDF se almacenan en el bucket privado `cotizaciones-po`. La acción comprueba tipo, cabecera PDF y tamaño máximo de 5 MiB. La ruta de descarga verifica permiso, cotización y documento en cada petición y entrega el PDF como adjunto. Storage comprueba los permisos de la sesión. Un conflicto al registrar provoca un intento de retirar la carga provisional. Una interrupción entre la subida y el registro puede dejar un objeto sin vínculo para conciliación administrativa. Un enlace a archivo de Drive se abre tras verificar la sesión de DAB. El propietario de Drive controla los permisos del archivo externo.

## Historial y periodos

Cada versión guarda autor, hora, acción e importe. V2 conserva una instantánea con datos generales, partidas y seguimiento. La pestaña Historial compara versiones consecutivas y muestra cambios de estado, conceptos agregados o eliminados, cantidades, horas y precios. Los usuarios de la aplicación carecen de permisos de edición o eliminación del historial. En la migración solo se reconstruye la última instantánea disponible de cada presupuesto V1. Las versiones antiguas mantienen el importe y los datos que realmente se registraron.

El listado abre en el mes de Studio, `America/Tijuana`. PostgreSQL usa el intervalo desde el inicio local del mes hasta el inicio del siguiente, excluido. La consulta toma la última versión anterior al cierre. Incluye altas del mes, pendientes/en pausa arrastradas y registros con actividad en el mes, incluso si su creación fue anterior. La búsqueda cubre código, empresa, proyecto y solicitante. Tabla, indicadores y paginación comparten la misma selección.

| Indicador | Definición |
|---|---|
| Cotizado | Importe al cierre de cotizaciones creadas en el periodo |
| Pendientes | Número de pendientes y pausadas al cierre, incluido arrastre |
| Aprobado | Importe de presupuestos cuya primera aprobación ocurrió en el periodo |
| Facturado y cobrado | Importe completo del presupuesto al registrar cada hito en ese periodo |

Las cifras corresponden al seguimiento comercial. No hay un libro de facturas, conciliación bancaria ni desglose de pagos parciales. Los campos que V1 nunca conservó por versión, como nombres históricos o líneas eliminadas, no pueden recuperarse retrospectivamente.

## Contrato de Project Monitor

El manual exige aprobación del cliente y aprobación escrita y/o PO. Cuando se cumplen ambas condiciones, `private.seguir_cotizacion` inserta en `private.project_monitor_pendientes` dentro de la transacción de seguimiento. Esto funciona tanto si el documento llega antes de aprobar como si llega después. El número de PO por sí solo no sirve como evidencia documental.

La clave primaria es la cotización. `carga` contiene versión del contrato, ID y código de cotización, ID del cliente, fecha y versión de aprobación, identificador de evidencia y la instantánea aprobada del proyecto, áreas, partidas, precios y horas. `procesado_en` queda vacío. El futuro consumidor deberá usar la clave de cotización como clave idempotente al crear el proyecto y registrar el procesamiento solo al confirmar la operación. Facturación, pago y documentos posteriores conservan el primer evento.

## Archivos y despliegue

- `supabase/migrations/20261126090637_cotizaciones_v2.sql` amplía cabecera, partidas e historial, introduce documentos, cola privada, bucket y políticas, y crea las RPC de seguimiento y consulta mensual. Se conserva el esquema base y las tres migraciones anteriores.
- `src/modules/cotizaciones/{schemas,types,constants,server}` contiene la validación, modelos, estados y repositorio adaptados. En `components` se actualizaron formulario, editor, resumen, estado, filtros y tabla, y se añadieron seguimiento e historial.
- `src/modules/cotizaciones/actions/seguimiento.actions.ts` gestiona documentos y seguimiento. La ruta nueva `src/app/(dashboard)/cotizaciones/[id]/documentos/[doc]/route.ts` controla la apertura.
- Las cuatro páginas de Cotizaciones comparten navegación y formulario. El shell y el layout protegido muestran la cuenta y los roles en el encabezado. `require-app-user.ts` recupera los códigos de rol. `next.config.ts` admite el cuerpo de la subida conservando Cache Components.
- Pruebas en `tests/unit/seguimiento.test.ts`, `tests/integration/database.test.mjs`, `tests/e2e/cotizaciones.spec.ts` y `tests/e2e/editor-local.spec.ts` con su fixture en `tests/e2e/fixtures/editor.jsx`. `playwright.config.ts` admite un puerto local de pruebas mediante `E2E_PORT`.

En un despliegue autorizado, comprobar el proyecto y el historial con la CLI autenticada, ejecutar `supabase db push --dry-run --skip-vault --remote=bxcxxhcnqoedfhhcyrlp` y comprobar que solo figura la migración V2. Aplicar primero la migración y después desplegar la aplicación. Comparar conteos, folios, horas e importes previos y posteriores. La migración no incluye el seed. En esta sesión el dry-run remoto de la CLI requirió un token ausente. El proyecto, esquema e historial se inspeccionaron por el conector Supabase.

## Verificación manual en una instancia con V2

1. Con ADM, abrir el listado, seleccionar mes y comprobar el menú de cuenta. Buscar un proyecto por empresa y después por solicitante. Verificar que los indicadores cambian con los filtros.
2. Crear un borrador con importe directo 22.25 y cero horas, otra partida de 2.5 horas a 22.25 y tres unidades a 22.25. Deben resultar 22.25, 55.63 y 66.75, con total 144.63. Cambiar la sugerencia y guardar. Duplicar desde el detalle y comprobar que se ofrece otro folio.
3. Abrir la edición en dos pestañas. Guardar en una y comprobar el conflicto en la segunda. Modificar otra partida y cancelar la salida. Verificar que los valores siguen presentes. Revisar la pestaña Historial tras guardar.
4. En Seguimiento, seleccionar Aprobada y cancelar la confirmación. Comprobar que se mantiene el estado anterior. Repetir y confirmar. Intentar entrar por la URL de edición y comprobar que vuelve a consulta. En una cotización distinta, intentar rechazar o cancelar sin motivo.
5. Registrar una PO en PDF o un archivo de Drive y abrirlo. Verificar usuario, fecha y presencia en Historial. Probar un archivo con extensión PDF y contenido inválido. Con TM, comprobar acceso denegado en módulo, detalle, descarga y llamadas directas.
6. Con los casos temporales ficticios de `npm run test:db`, comprobar enero (alta), febrero (arrastre) y marzo (resolución). Solo enero suma el alta y solo marzo suma la aprobación. La prueba usa fechas controladas sin alterar registros comerciales.
7. En una base de pruebas, aprobar sin evidencia y comprobar la ausencia de alta en la cola. Adjuntar aprobación escrita o PO y verificar exactamente una fila con la versión aprobada. Registrar factura y pago y comprobar que el recuento sigue siendo uno.
8. En escritorio y móvil, añadir y eliminar partidas, comprobar resumen y foco de teclado, abrir el historial y cerrar sesión. La prueba de navegador del editor utiliza los componentes reales con acciones locales controladas. El recorrido ADM contra Supabase requiere credenciales de prueba.

## Validación y decisiones abiertas

Resultados de la comprobación local de V2: 26 pruebas unitarias y 19 pruebas SQL, incluida la migración sobre un borrador V1. ESLint, TypeScript y el build de producción pasaron. Playwright aprobó seis casos y cubre acceso anónimo, teclado y editor en escritorio y móvil. Los dos recorridos ADM remotos se omiten sin credenciales. PGlite ejecuta PostgreSQL y las políticas de la migración, con identidades y metadatos de Storage de prueba. No valida el transporte real de archivos ni la concurrencia de dos conexiones físicas.

Studio debe confirmar moneda, impuestos, límites de precios, alcance de consulta por departamento, catálogo de tarifas y reglas de facturación parcial. También debe confirmar que el patrocinio congele el presupuesto hasta su resolución y que el flujo de corrección excepcional use una nueva cotización. La referencia de diseño utilizada fue el listado 2:13 y el editor 2:184 de Figma, junto con las dos capturas. Se inspeccionaron el Excel «CONTROL COTIZACIONES_FACTURAS - IMPLEMENTACIÓN.xlsx» y el «MANUAL DAB 2026.pdf» suministrados.
