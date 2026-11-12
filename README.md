# DAB 2.0

Aplicación interna de Studio con Next.js 16, React, TypeScript, Tailwind, Base UI y Supabase.

La primera entrega de Cotizaciones incluye permisos, catálogos, borradores con partidas, folio automático, guardado transaccional, consulta, edición e historial.

Consulta [la guía del módulo y el informe de verificación](docs/cotizaciones.md) para arquitectura, migraciones, pruebas y pendientes. **Las migraciones comerciales están aplicadas; la carga remota de catálogos ficticios está pendiente de autorización.**

## Desarrollo

Usar Node.js 24 y npm. Crear `.env.local` (no versionado):

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://bxcxxhcnqoedfhhcyrlp.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<clave-publicable-del-proyecto>
```

```powershell
npm ci
npm run dev
```

Para validar:

```powershell
npx eslint .
npx tsc --noEmit
npm test
npm run test:db
npm run build
npm run test:e2e
npm audit --omit=dev
```

`test:db` utiliza PostgreSQL embebido local; no necesita Docker ni conecta al proyecto remoto. Las pruebas E2E anónimas usan Microsoft Edge instalado. Las autenticadas requieren una cuenta ADM de pruebas y catálogos cargados; consulta la guía antes de habilitarlas.
