-- Migración: Límite de venta para kits
-- Agregar columna max_kits_per_sale a la tabla products en Supabase

ALTER TABLE public.products 
ADD COLUMN max_kits_per_sale INTEGER DEFAULT 1 CHECK (max_kits_per_sale >= 1);
