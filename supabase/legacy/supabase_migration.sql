-- Migración de Base de Datos para Comisión por Departamento

-- 1. Agregar columnas de comisión a la tabla de departamentos (departments)
ALTER TABLE departments ADD COLUMN IF NOT EXISTS commission_enabled BOOLEAN DEFAULT false;
ALTER TABLE departments ADD COLUMN IF NOT EXISTS commission_type VARCHAR DEFAULT 'percent';
ALTER TABLE departments ADD COLUMN IF NOT EXISTS commission_value NUMERIC DEFAULT 0.00;

-- 2. Agregar columnas de comisión a la tabla de productos (products)
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_type VARCHAR DEFAULT 'percent';
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_value NUMERIC DEFAULT 0.00;

-- 3. Sincronizar datos históricos: migrar porcentajes anteriores al nuevo esquema
UPDATE products 
SET commission_type = 'percent', 
    commission_value = commission_percent
WHERE commission_enabled = true;
