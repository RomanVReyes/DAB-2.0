begin;
create table public.departamentos_operativos(id uuid primary key default gen_random_uuid(), nombre text unique not null);
insert into public.departamentos_operativos(nombre) values ('Film'),('TINT'),('Social Media'),('Design');
create table public.proyectos(id uuid primary key references public.cotizaciones(id), codigo text unique not null,cliente text not null,nombre text not null,version_aprobada integer not null, aprobado_en timestamptz not null, tipo text not null check(tipo in ('proyecto','iguala','patrocinio','interno')),estado text not null default 'activo' check(estado in ('activo','en pausa','cerrado')), creado_en timestamptz not null default now());
create table public.proyecto_departamentos(proyecto_id uuid references public.proyectos not null,departamento_id uuid references public.departamentos_operativos not null,primary key(proyecto_id,departamento_id));
create table public.usuario_departamentos(usuario_id uuid references public.usuarios not null,departamento_id uuid references public.departamentos_operativos not null,primary key(usuario_id,departamento_id));
create table public.proyecto_partidas(id uuid primary key,proyecto_id uuid not null references public.proyectos,orden int not null,area text not null,concepto text not null,horas numeric(10,2) not null check(horas>=0),departamento_id uuid,rubro text,unique(proyecto_id,orden),foreign key(proyecto_id,departamento_id) references public.proyecto_departamentos);
create table public.proyecto_auditoria(id uuid primary key default gen_random_uuid(),proyecto_id uuid not null references public.proyectos,usuario_id uuid not null references public.usuarios,evento text not null,creado_en timestamptz not null default now());
create index on public.proyecto_auditoria(proyecto_id);
create index on public.proyecto_departamentos(departamento_id);
create function private.pm_rol(codigos text[]) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and private.tiene_permiso('proyectos.ver') and exists(select from public.usuario_roles u join public.roles r on r.id=u.rol_id where u.usuario_id=auth.uid() and r.codigo=any(codigos))
$$;
create function private.pm_visible(proyecto uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.pm_rol(array['ADM','AG','GL']) or (private.pm_rol(array['TL']) and exists(select from public.usuario_departamentos u join public.proyecto_departamentos p using(departamento_id) where u.usuario_id=auth.uid() and p.proyecto_id=proyecto))
$$;
do $$ declare t text;begin foreach t in array array['proyectos','proyecto_partidas','proyecto_departamentos','usuario_departamentos','departamentos_operativos','proyecto_auditoria'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from public,anon,authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;end $$;
create policy consultar on public.proyectos for select to authenticated using(private.pm_visible(id));
create policy consultar on public.proyecto_partidas for select to authenticated using(private.pm_visible(proyecto_id));
create policy consultar on public.proyecto_departamentos for select to authenticated using(private.pm_visible(proyecto_id));
create policy consultar on public.proyecto_auditoria for select to authenticated using(private.pm_visible(proyecto_id));
create policy consultar on public.departamentos_operativos for select to authenticated using(private.pm_rol(array['ADM','AG','GL','TL']));
create policy consultar on public.usuario_departamentos for select to authenticated using(private.pm_rol(array['ADM']) or (usuario_id=auth.uid() and private.pm_rol(array['TL'])));
create function private.pm_pendientes() returns table(id uuid,codigo text,nombre text) language sql stable security definer set search_path='' as $$
 select q.cotizacion_id,q.carga->>'codigo',q.carga#>>'{presupuesto,proyecto}' from private.project_monitor_pendientes q where private.pm_rol(array['ADM']) and private.tiene_permiso('proyectos.crear') and q.procesado_en is null order by q.creado_en
$$;
create function private.pm_incorporar(origen uuid,tipo_proyecto text) returns uuid language plpgsql security definer set search_path='' as $$
declare q private.project_monitor_pendientes%rowtype;begin
 if not(private.pm_rol(array['ADM']) and private.tiene_permiso('proyectos.crear')) then raise insufficient_privilege;end if;
 select * into strict q from private.project_monitor_pendientes where cotizacion_id=origen for update;
 if exists(select from public.proyectos where id=origen) then return origen;end if;
 insert into public.proyectos(id,codigo,cliente,nombre,version_aprobada,aprobado_en,tipo) values(origen,q.carga->>'codigo',q.carga#>>'{presupuesto,cliente}',q.carga#>>'{presupuesto,proyecto}',(q.carga->>'version_aprobada')::int,(q.carga->>'aprobado_en')::timestamptz,tipo_proyecto);
 insert into public.proyecto_partidas(id,proyecto_id,orden,area,concepto,horas) select (p->>'id')::uuid,origen,i,p->>'area',p->>'concepto',(p->>'horas')::numeric from jsonb_array_elements(q.carga#>'{presupuesto,partidas}') with ordinality as x(p,i);
 insert into public.proyecto_auditoria(proyecto_id,usuario_id,evento) values(origen,auth.uid(),'Incorporación del presupuesto aprobado');
 update private.project_monitor_pendientes set procesado_en=now() where cotizacion_id=origen;return origen;
end $$;
create function private.pm_clasificar(partida uuid,departamento uuid,rubro_operativo text) returns void language plpgsql security definer set search_path='' as $$
declare proyecto uuid;begin
 if not(private.pm_rol(array['ADM']) and private.tiene_permiso('proyectos.presupuesto_editar')) then raise insufficient_privilege;end if;
 if length(trim(rubro_operativo)) not between 1 and 100 or rubro_operativo is null then raise exception 'Rubro inválido';end if;
 select proyecto_id into strict proyecto from public.proyecto_partidas where id=partida for update;
 insert into public.proyecto_departamentos values(proyecto,departamento) on conflict do nothing;
 update public.proyecto_partidas set departamento_id=departamento,rubro=trim(rubro_operativo) where id=partida;
 delete from public.proyecto_departamentos d where d.proyecto_id=proyecto and not exists(select from public.proyecto_partidas p where p.proyecto_id=proyecto and p.departamento_id=d.departamento_id);
 insert into public.proyecto_auditoria(proyecto_id,usuario_id,evento) values(proyecto,auth.uid(),'Clasificación de partida: '||trim(rubro_operativo));
end $$;
create function public.pm_incorporar(origen uuid,tipo_proyecto text) returns uuid language sql set search_path='' as $$select private.pm_incorporar(origen,tipo_proyecto)$$;
create function public.pm_clasificar(partida uuid,departamento uuid,rubro_operativo text) returns void language sql set search_path='' as $$select private.pm_clasificar(partida,departamento,rubro_operativo)$$;
create function public.pm_pendientes() returns table(id uuid,codigo text,nombre text) language sql stable set search_path='' as $$select * from private.pm_pendientes()$$;
do $$ declare f regprocedure;begin foreach f in array array['private.pm_rol(text[])'::regprocedure,'private.pm_visible(uuid)','private.pm_incorporar(uuid,text)','public.pm_incorporar(uuid,text)','private.pm_clasificar(uuid,uuid,text)','public.pm_clasificar(uuid,uuid,text)','private.pm_pendientes()','public.pm_pendientes()'] loop execute format('revoke all on function %s from public,anon,authenticated',f);execute format('grant execute on function %s to authenticated',f);end loop;end $$;
create function private.pm_actualizar(proyecto uuid,nuevo_estado text,nuevo_tipo text) returns void language plpgsql security definer set search_path='' as $$
begin
 if not(private.pm_rol(array['ADM']) and private.tiene_permiso('proyectos.editar')) then raise insufficient_privilege;end if;
 update public.proyectos set estado=nuevo_estado,tipo=nuevo_tipo where id=proyecto and (estado,tipo) is distinct from (nuevo_estado,nuevo_tipo);
 if found then insert into public.proyecto_auditoria(proyecto_id,usuario_id,evento) values(proyecto,auth.uid(),'Estado: '||nuevo_estado||' · Tipo: '||nuevo_tipo);end if;
end $$;
create function public.pm_actualizar(proyecto uuid,nuevo_estado text,nuevo_tipo text) returns void language sql set search_path='' as $$select private.pm_actualizar(proyecto,nuevo_estado,nuevo_tipo)$$;
revoke all on function private.pm_actualizar(uuid,text,text),public.pm_actualizar(uuid,text,text) from public,anon,authenticated;
grant execute on function private.pm_actualizar(uuid,text,text),public.pm_actualizar(uuid,text,text) to authenticated;
commit;

