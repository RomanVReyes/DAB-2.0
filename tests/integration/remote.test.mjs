import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
try {
  process.loadEnvFile(".env.local");
} catch {
  /* CI puede inyectar las variables. */
}
const enabled = process.env.DAB_REMOTE_TESTS === "1";
test(
  "Supabase real: creaciones concurrentes y consulta persistida",
  { skip: !enabled },
  async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    assert.equal(
      new URL(url).hostname,
      "bxcxxhcnqoedfhhcyrlp.supabase.co",
      "Destino distinto al desarrollo autorizado",
    );
    assert.ok(
      process.env.E2E_ADM_EMAIL && process.env.E2E_ADM_PASSWORD,
      "Configura una cuenta ADM de pruebas",
    );
    const db = createClient(
      url,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { error: loginError } = await db.auth.signInWithPassword({
      email: process.env.E2E_ADM_EMAIL,
      password: process.env.E2E_ADM_PASSWORD,
    });
    assert.ifError(loginError);
    try {
      const input = {
        empresa_id: "10000000-0000-4000-8000-000000000001",
        solicitante_id: "20000000-0000-4000-8000-000000000001",
        tipo_id: "60000000-0000-4000-8000-000000000001",
        sede_id: "70000000-0000-4000-8000-000000000001",
        proyecto: `PRUEBA CONCURRENCIA ${Date.now()}`,
        especificaciones: "Registro ficticio de validación técnica",
        partidas: [
          {
            concepto_id: "40000000-0000-4000-8000-000000000001",
            tarifa_id: "50000000-0000-4000-8000-000000000001",
            cantidad: "1.25",
            horas: "2",
          },
        ],
      };
      const results = await Promise.all([
        db.rpc("guardar_cotizacion", { p_datos: input }),
        db.rpc("guardar_cotizacion", { p_datos: input }),
      ]);
      results.forEach((r) => assert.ifError(r.error));
      const ids = results.map((r) => r.data);
      assert.equal(new Set(ids).size, 2);
      const { data, error } = await db
        .from("cotizaciones")
        .select("id,folio,codigo,importe,partidas(*)")
        .in("id", ids);
      assert.ifError(error);
      assert.equal(data.length, 2);
      assert.equal(new Set(data.map((r) => r.folio)).size, 2);
      assert.equal(new Set(data.map((r) => r.codigo)).size, 2);
      assert.ok(
        data.every(
          (r) => r.partidas.length === 1 && Number(r.importe) === 1563.13,
        ),
      );
    } finally {
      await db.auth.signOut();
    }
  },
);
