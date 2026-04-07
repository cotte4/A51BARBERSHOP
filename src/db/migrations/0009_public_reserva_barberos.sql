alter table "barberos" add column "public_slug" text;
alter table "barberos" add column "public_reserva_activa" boolean default false not null;
alter table "barberos" add column "public_reserva_password_hash" text;

update "barberos"
set
  "public_slug" = nullif(trim(both '-' from regexp_replace(lower("nombre"), '[^a-z0-9]+', '-', 'g')), ''),
  "public_reserva_activa" = coalesce("activo", false);

create unique index "barberos_public_slug_idx" on "barberos" using btree ("public_slug");
