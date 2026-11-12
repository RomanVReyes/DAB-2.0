import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// PostgreSQL real embebido, sin red. Solo auth.users/auth.uid se simulan.
// Cada consulta de aplicación usa SET ROLE authenticated, no el dueño del esquema.
const db = new PGlite();
const adm = "a0000000-0000-4000-8000-000000000001";
const tm = "a0000000-0000-4000-8000-000000000002";
const inactive = "a0000000-0000-4000-8000-000000000003";
const viewer = "a0000000-0000-4000-8000-000000000004";
const input = {
  empresa_id: "10000000-0000-4000-8000-000000000001",
  solicitante_id: "20000000-0000-4000-8000-000000000001",
  tipo_id: "60000000-0000-4000-8000-000000000001",
  sede_id: "70000000-0000-4000-8000-000000000001",
  proyecto: "Prueba SQL",
  especificaciones: "",
  partidas: [
    {
      concepto_id: "40000000-0000-4000-8000-000000000001",
      tarifa_id: "50000000-0000-4000-8000-000000000001",
      cantidad: "1.25",
      horas: "2.5",
    },
    {
      concepto_id: "40000000-0000-4000-8000-000000000003",
      tarifa_id: "50000000-0000-4000-8000-000000000003",
      cantidad: "2",
      horas: "1",
    },
  ],
};
async function asUser(id, query, params = []) {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [
      id ?? "",
    ]);
    await tx.exec("SET LOCAL ROLE authenticated");
    return tx.query(query, params);
  });
}
async function save(user, data = input, id = null, version = null) {
  const result = await asUser(
    user,
    "select public.guardar_cotizacion($1::jsonb,$2::uuid,$3::integer) as id",
    [JSON.stringify(data), id, version],
  );
  return result.rows[0].id;
}
let created;
before(async () => {
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated,anon; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated,anon;`);
  for (const file of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${file}`, "utf8"));
  await db.exec(await readFile("supabase/seed.sql", "utf8"));
  for (const [id, name, active, role] of [
    [adm, "ADM prueba", true, "ADM"],
    [tm, "TM prueba", true, "TM"],
    [inactive, "Inactivo prueba", false, "ADM"],
    [viewer, "Lector prueba", true, "AG"],
  ]) {
    await db.query("INSERT INTO auth.users(id) VALUES ($1)", [id]);
    await db.query(
      "INSERT INTO public.usuarios(id,nombre,activo) VALUES($1,$2,$3)",
      [id, name, active],
    );
    await db.query(
      "INSERT INTO public.usuario_roles(usuario_id,rol_id) SELECT $1,id FROM public.roles WHERE codigo=$2",
      [id, role],
    );
  }
  // Un perfil solo lector para comprobar que ver no implica crear ni editar.
  await db.exec(
    "INSERT INTO public.rol_permisos SELECT r.id,p.id FROM public.roles r,public.permisos p WHERE r.codigo='AG' AND p.codigo='cotizaciones.ver'",
  );
});
after(async () => db.close());

test("ADM crea varias partidas y PostgreSQL calcula importes, horas, folio, código y creador", async () => {
  created = await save(adm, {
    ...input,
    importe: 1,
    folio: 900,
    codigo: "FALSO",
    creado_por: tm,
  });
  const {
    rows: [row],
  } = await asUser(adm, "select * from public.cotizaciones where id=$1", [
    created,
  ]);
  assert.equal(row.importe, "2563.63");
  assert.equal(row.horas, "3.50");
  assert.equal(row.creado_por, adm);
  assert.match(row.codigo, /^DEV-TEST-DEMO-\d+$/);
  assert.notEqual(Number(row.folio), 900);
  assert.equal(
    (
      await asUser(
        adm,
        "select * from public.partidas where cotizacion_id=$1",
        [created],
      )
    ).rows.length,
    2,
  );
});
test("TM e inactivo no ven filas ni crean o editan mediante RPC", async () => {
  for (const user of [tm, inactive, null]) {
    assert.equal(
      (await asUser(user, "select * from public.cotizaciones")).rows.length,
      0,
    );
    assert.equal(
      (await asUser(user, "select * from public.partidas")).rows.length,
      0,
    );
    assert.equal(
      (await asUser(user, "select * from public.empresas")).rows.length,
      0,
    );
    await assert.rejects(save(user), (e) => e.code === "42501");
    await assert.rejects(
      save(user, input, created, 1),
      (e) => e.code === "42501",
    );
  }
});
test("anon no tiene SELECT ni EXECUTE; authenticated no puede escribir tablas directamente", async () => {
  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.exec("SET LOCAL ROLE anon");
      return tx.query("select * from public.cotizaciones");
    }),
    (e) => e.code === "42501",
  );
  await assert.rejects(
    db.transaction(async (tx) => {
      await tx.exec("SET LOCAL ROLE anon");
      return tx.query("select public.guardar_cotizacion('{}')");
    }),
    (e) => e.code === "42501",
  );
  for (const sql of [
    "update public.cotizaciones set importe=0",
    "delete from public.partidas",
    "insert into public.cotizaciones(codigo) values('FALSO')",
  ])
    await assert.rejects(asUser(adm, sql), (e) => e.code === "42501");
});
test("ver no permite crear ni editar borradores de otro usuario", async () => {
  assert.ok(
    (await asUser(viewer, "select * from public.cotizaciones")).rows.length > 0,
  );
  await assert.rejects(save(viewer), (e) => e.code === "42501");
  await assert.rejects(
    save(viewer, input, created, 1),
    (e) => e.code === "42501",
  );
});
test("fallo en segunda partida revierte cabecera, partidas e historial", async () => {
  const count = async () =>
    (
      await asUser(
        adm,
        "select (select count(*) from public.cotizaciones) c,(select count(*) from public.partidas) p,(select count(*) from public.cotizacion_historial) h",
      )
    ).rows[0];
  const before = await count();
  await assert.rejects(
    save(adm, {
      ...input,
      partidas: [input.partidas[0], { ...input.partidas[1], cantidad: "-1" }],
    }),
  );
  assert.deepEqual(await count(), before);
});
test("rechaza cantidades, solicitantes, tarifas y partidas inválidas", async () => {
  for (const cantidad of ["0", "NaN", "Infinity", "1.001", "10001"])
    await assert.rejects(
      save(adm, { ...input, partidas: [{ ...input.partidas[0], cantidad }] }),
    );
  await assert.rejects(save(adm, { ...input, partidas: [] }));
  await assert.rejects(save(adm, { ...input, solicitante_id: adm }));
  await assert.rejects(
    save(adm, {
      ...input,
      partidas: [{ ...input.partidas[0], tarifa_id: adm }],
    }),
  );
});
test("editar conserva tarifa histórica, folio y código; incrementa versión e historial", async () => {
  const { rows: old } = await asUser(
    adm,
    "select * from public.partidas where cotizacion_id=$1 order by orden",
    [created],
  );
  const {
    rows: [header],
  } = await asUser(adm, "select * from public.cotizaciones where id=$1", [
    created,
  ]);
  await db.query("update public.tarifas set precio=9999 where id=$1", [
    input.partidas[0].tarifa_id,
  ]);
  await save(
    adm,
    {
      ...input,
      proyecto: "Editada",
      partidas: old.map((p) => ({
        id: p.id,
        concepto_id: p.concepto_id,
        tarifa_id: p.tarifa_id,
        cantidad: p.cantidad,
        horas: p.horas,
      })),
    },
    created,
    1,
  );
  const {
    rows: [updated],
  } = await asUser(adm, "select * from public.cotizaciones where id=$1", [
    created,
  ]);
  assert.equal(updated.importe, "2563.63");
  assert.equal(updated.codigo, header.codigo);
  assert.equal(updated.folio, header.folio);
  assert.equal(updated.version, 2);
  assert.equal(
    (
      await asUser(
        adm,
        "select * from public.cotizacion_historial where cotizacion_id=$1",
        [created],
      )
    ).rows.length,
    2,
  );
  await assert.rejects(save(adm, input, created, 1), (e) => e.code === "40001");
  await db.query("update public.tarifas set precio=1250.50 where id=$1", [
    input.partidas[0].tarifa_id,
  ]);
});
test("no permite usar partidas de otro borrador", async () => {
  const other = await save(adm);
  const {
    rows: [part],
  } = await asUser(
    adm,
    "select * from public.partidas where cotizacion_id=$1",
    [created],
  );
  await assert.rejects(
    save(
      adm,
      { ...input, partidas: [{ ...input.partidas[0], id: part.id }] },
      other,
      1,
    ),
    (e) => e.code === "22023",
  );
});
test("edición inválida revierte también cabecera, versión e historial", async () => {
  const {
    rows: [old],
  } = await asUser(adm, "select * from public.cotizaciones where id=$1", [
    created,
  ]);
  await assert.rejects(
    save(
      adm,
      {
        ...input,
        proyecto: "No debe persistir",
        partidas: [input.partidas[0], { ...input.partidas[1], horas: "-2" }],
      },
      created,
      old.version,
    ),
  );
  const {
    rows: [current],
  } = await asUser(adm, "select * from public.cotizaciones where id=$1", [
    created,
  ]);
  assert.deepEqual(current, old);
});
test("ignora estado, precios y unidades impuestos por el cliente", async () => {
  const id = await save(adm, {
    ...input,
    estado: "aprobada",
    partidas: input.partidas.map((p) => ({
      ...p,
      precio_unitario: 0,
      subtotal: 0,
      unidad: "FALSA",
    })),
  });
  const {
    rows: [row],
  } = await asUser(adm, "select * from public.cotizaciones where id=$1", [id]);
  assert.equal(row.estado, "borrador");
  assert.equal(row.importe, "2563.63");
  assert.ok(
    (
      await asUser(
        adm,
        "select unidad from public.partidas where cotizacion_id=$1",
        [id],
      )
    ).rows.every((r) => r.unidad !== "FALSA"),
  );
});
test("rechaza una tarifa que dejó de ser la vigente después de abrir el formulario", async () => {
  await db.query(
    "insert into public.tarifas(id,concepto_id,precio,vigente_desde) values('50000000-0000-4000-8000-000000000009',$1,1300,current_date)",
    [input.partidas[0].concepto_id],
  );
  await assert.rejects(save(adm), (e) => e.code === "22023");
  await db.exec(
    "delete from public.tarifas where id='50000000-0000-4000-8000-000000000009'",
  );
});
test("folios y códigos únicos después de errores y peticiones en lote", async () => {
  // PGlite serializa su única conexión: NO demuestra concurrencia multi-sesión.
  const ids = await Promise.all(Array.from({ length: 10 }, () => save(adm)));
  const { rows } = await asUser(
    adm,
    "select folio,codigo from public.cotizaciones where id=any($1::uuid[])",
    [ids],
  );
  assert.equal(new Set(rows.map((r) => r.folio)).size, 10);
  assert.equal(new Set(rows.map((r) => r.codigo)).size, 10);
});
test("todas las tablas comerciales tienen RLS y no permiten DML directo", async () => {
  const { rows } = await db.query(
    "select tablename,rowsecurity from pg_tables where schemaname='public'",
  );
  assert.ok(rows.every((r) => r.rowsecurity));
  const {
    rows: [priv],
  } = await db.query(
    "select has_table_privilege('authenticated','public.cotizaciones','INSERT') can_insert, has_function_privilege('anon','public.guardar_cotizacion(jsonb,uuid,integer)','EXECUTE') can_exec",
  );
  assert.equal(priv.can_insert, false);
  assert.equal(priv.can_exec, false);
});
