-- TicoMarket seed data
-- This seed only links to existing public.profiles rows.
-- It does not create auth users.

begin;

insert into public.sinpe_config (label, phone_number, account_holder, instructions, is_enabled)
select
  'SINPE Móvil TicoMarket',
  '8888-7777',
  'TicoMarket Logistics',
  'Transfer exact amount and include your reference at checkout for manual confirmation.',
  true
where not exists (
  select 1 from public.sinpe_config where is_enabled = true
);

-- Seed 6 driver profiles (or fewer if there are fewer existing profiles).
with source_profiles as (
  select
    p.id,
    row_number() over (order by p.created_at asc, p.id asc) as rn
  from public.profiles p
  limit 6
),
driver_templates as (
  select *
  from (
    values
      (1, 'motorcycle'::text, 'Moto con cajon termico, hasta 20 kg', array['express', 'food', 'documents']::text[], 9, 9.934500::double precision, -84.090300::double precision, true, 184, 4.90::double precision),
      (2, 'car'::text, 'Sedan compacto para paquetes medianos', array['grocery', 'fragile', 'bulk']::text[], 18, 9.918200::double precision, -84.078900::double precision, true, 142, 4.83::double precision),
      (3, 'bike'::text, 'Bicimensajeria para zonas urbanas', array['small-items', 'eco', 'documents']::text[], 7, 9.925100::double precision, -84.103200::double precision, false, 88, 4.72::double precision),
      (4, 'walker'::text, 'Entregas de barrio en distancias cortas', array['last-block', 'hand-off', 'pet-supplies']::text[], 3, 9.931300::double precision, -84.082100::double precision, true, 61, 4.66::double precision),
      (5, 'motorcycle'::text, 'Moto rapida para urgencias', array['pharmacy', 'urgent', 'night']::text[], 11, 9.910700::double precision, -84.066200::double precision, false, 233, 4.95::double precision),
      (6, 'car'::text, 'SUV pequena para carga liviana', array['furniture-small', 'electronics', 'fragile']::text[], 22, 9.947800::double precision, -84.120400::double precision, true, 109, 4.79::double precision)
  ) as t(rn, vehicle_type, capacity_description, specialties, service_radius_km, base_lat, base_lng, is_online, total_deliveries, rating)
)
insert into public.driver_profiles (
  user_id,
  vehicle_type,
  capacity_description,
  specialties,
  service_radius_km,
  base_location_lat,
  base_location_lng,
  current_lat,
  current_lng,
  is_online,
  total_deliveries,
  rating
)
select
  sp.id,
  dt.vehicle_type,
  dt.capacity_description,
  dt.specialties,
  dt.service_radius_km,
  dt.base_lat,
  dt.base_lng,
  dt.base_lat + ((sp.rn - 1) * 0.0023),
  dt.base_lng + ((sp.rn - 1) * 0.0021),
  dt.is_online,
  dt.total_deliveries,
  dt.rating
from source_profiles sp
join driver_templates dt on dt.rn = sp.rn
on conflict (user_id) do update
set
  vehicle_type = excluded.vehicle_type,
  capacity_description = excluded.capacity_description,
  specialties = excluded.specialties,
  service_radius_km = excluded.service_radius_km,
  base_location_lat = excluded.base_location_lat,
  base_location_lng = excluded.base_location_lng,
  current_lat = excluded.current_lat,
  current_lng = excluded.current_lng,
  is_online = excluded.is_online,
  total_deliveries = excluded.total_deliveries,
  rating = excluded.rating,
  updated_at = now();

-- Seed 5 delivery requests from existing profiles.
with all_profiles as (
  select
    p.id,
    row_number() over (order by p.created_at asc, p.id asc) as rn
  from public.profiles p
),
driver_pool as (
  select
    dp.user_id,
    row_number() over (order by dp.updated_at desc, dp.user_id asc) as rn
  from public.driver_profiles dp
),
request_templates as (
  select *
  from (
    values
      (1, 'open'::text, 'Curridabat, Freses 200m norte de Plaza del Sol', 9.9341::double precision, -84.0375::double precision, 'Porton azul, llamar al llegar', 'Escazu, Guachipelin torre C piso 4', 9.9459::double precision, -84.1522::double precision, 'Recepcion lobby principal', 'Caja de repuestos pequenos', false, 4200, null::integer, null::integer),
      (2, 'assigned'::text, 'San Pedro, Barrio Dent 50m este del AMPM', 9.9368::double precision, -84.0519::double precision, 'Subir al segundo piso', 'Heredia centro, costado norte del parque', 9.9984::double precision, -84.1165::double precision, 'Local 7, puerta de vidrio', 'Pedido de supermercado mediano', true, 5600, 5900, 1),
      (3, 'in_transit'::text, 'Pavas, Rohrmoser diagonal al parque', 9.9424::double precision, -84.1308::double precision, 'Entrega contra firma', 'Santa Ana, Lindora frente a Forum 1', 9.9298::double precision, -84.1850::double precision, 'Dejar en recepcion', 'Laptop + accesorios en sobre acolchado', true, 7500, 7800, 2),
      (4, 'completed'::text, 'Desamparados, San Rafael Abajo, supermercado Chino', 9.8937::double precision, -84.0611::double precision, 'Cliente espera en acera', 'Zapote, del Registro 300m este', 9.9173::double precision, -84.0472::double precision, 'Casa color beige', 'Medicamentos de farmacia', false, 3300, 3300, 3),
      (5, 'open'::text, 'Alajuela centro, 100m oeste de catedral', 10.0162::double precision, -84.2116::double precision, 'Recoger en mostrador principal', 'Belen, La Ribera por Intel', 9.9783::double precision, -84.1982::double precision, 'Entregar en recepcion edificio B', 'Documentos notariales urgentes', false, 4800, null::integer, null::integer)
  ) as t(rn, status, pickup_address, pickup_lat, pickup_lng, pickup_instructions, dropoff_address, dropoff_lat, dropoff_lng, dropoff_instructions, item_description, is_fragile, budget_amount, final_amount, assigned_driver_rn)
),
requesters as (
  select
    ap.id,
    row_number() over (order by ap.rn asc) as rn
  from all_profiles ap
)
insert into public.delivery_requests (
  requester_id,
  status,
  pickup_address,
  pickup_lat,
  pickup_lng,
  pickup_instructions,
  pickup_window_start,
  pickup_window_end,
  dropoff_address,
  dropoff_lat,
  dropoff_lng,
  dropoff_instructions,
  dropoff_window_start,
  dropoff_window_end,
  item_description,
  item_photos,
  estimated_weight_kg,
  is_fragile,
  budget_amount,
  final_amount,
  assigned_driver_id,
  assigned_at,
  picked_up_at,
  delivered_at
)
select
  r.id,
  rt.status,
  rt.pickup_address,
  rt.pickup_lat,
  rt.pickup_lng,
  rt.pickup_instructions,
  now() - (rt.rn || ' hours')::interval,
  now() + ((rt.rn + 2) || ' hours')::interval,
  rt.dropoff_address,
  rt.dropoff_lat,
  rt.dropoff_lng,
  rt.dropoff_instructions,
  now() + ((rt.rn + 1) || ' hours')::interval,
  now() + ((rt.rn + 4) || ' hours')::interval,
  rt.item_description,
  array[]::text[],
  2.5 + (rt.rn * 0.6),
  rt.is_fragile,
  rt.budget_amount,
  rt.final_amount,
  dp.user_id,
  case when rt.status in ('assigned', 'in_transit', 'completed') then now() - ((rt.rn + 1) || ' hours')::interval else null end,
  case when rt.status in ('in_transit', 'completed') then now() - (rt.rn || ' hours')::interval else null end,
  case when rt.status = 'completed' then now() - ((rt.rn - 1) || ' hours')::interval else null end
from request_templates rt
join requesters r on r.rn = rt.rn
left join driver_pool dp on dp.rn = rt.assigned_driver_rn
where not exists (
  select 1
  from public.delivery_requests dr
  where dr.requester_id = r.id
    and dr.pickup_address = rt.pickup_address
    and dr.dropoff_address = rt.dropoff_address
    and dr.item_description = rt.item_description
);

commit;
