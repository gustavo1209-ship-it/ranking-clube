-- Limite de reservas ativas (futuras) por jogador, configurável pelo
-- admin. NULL = sem limite. Rode no SQL Editor do Supabase depois das
-- migrações anteriores. Idempotente.

alter table public.court_booking_settings
  add column if not exists max_bookings_per_player int;
