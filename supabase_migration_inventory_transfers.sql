-- =============================================================================
-- MIGRACION: Tablas de Traspasos entre Sucursales (Inventory Transfers)
-- Target: PostgreSQL 15+ / Supabase
-- Repositorio PUBLICO -- Por seguridad SOLO se incluye el DDL de tablas.
--
-- ⚠️  EXCLUSIONES POR SEGURIDAD (repo publico) ⚠️
--   * Las RPCs create_transfer_order / receive_transfer_order / cancel_transfer_order
--     NO se incluyen aqui por contener logica sensible de manejo de inventario,
--     stock atomico, descuentos y formulas de negocio.
--   * Esas funciones viven UNICAMENTE en la instancia privada de Supabase del
--     proyecto. El frontend (transfersService.js) las invoca via supabase.rpc().
--   * Para ambientes nuevos/staging: importar el backup privado de RPCs desde
--     el almacenamiento seguro o exportarlas directamente desde production
--     mediante Supabase CLI (supabase db dump --schema public).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1) TABLAS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.inventory_transfers (
    id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    folio                VARCHAR(64) NOT NULL,
    from_branch_id       UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    to_branch_id         UUID NOT NULL REFERENCES public.branches(id) ON DELETE RESTRICT,
    user_id              UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    status               VARCHAR(32) NOT NULL DEFAULT 'pending_receipt',
    notes                TEXT,
    received_by_user_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
    cancelled_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at          TIMESTAMPTZ,
    completed_at         TIMESTAMPTZ,
    received_at          TIMESTAMPTZ,
    cancelled_at         TIMESTAMPTZ,

    CONSTRAINT inventory_transfers_status_ck
        CHECK (status IN (
            'pending_receipt',
            'received_complete',
            'received_with_difference',
            'cancelled'
        )),
    CONSTRAINT inventory_transfers_branches_diff_ck
        CHECK (from_branch_id <> to_branch_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_from_branch
    ON public.inventory_transfers(from_branch_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_to_branch
    ON public.inventory_transfers(to_branch_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_status
    ON public.inventory_transfers(status);

CREATE INDEX IF NOT EXISTS idx_inventory_transfers_created_at
    ON public.inventory_transfers(created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_transfers_folio
    ON public.inventory_transfers(folio);

COMMENT ON TABLE public.inventory_transfers IS
    'Ordenes de traspaso de inventario entre sucursales (header).';
COMMENT ON COLUMN public.inventory_transfers.status IS
    'pending_receipt | received_complete | received_with_difference | cancelled';
COMMENT ON COLUMN public.inventory_transfers.notes IS
    'Nota libre del usuario + ##TRANSFER_META## + JSON de metadatos (folio, itemOutcomes, usuarios, timestamps).';

-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_transfer_items (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id  UUID NOT NULL
        REFERENCES public.inventory_transfers(id) ON DELETE CASCADE,
    product_id   UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity     NUMERIC(18,4) NOT NULL,
    cost_price   NUMERIC(18,4) NOT NULL DEFAULT 0,
    sale_price   NUMERIC(18,4) NOT NULL DEFAULT 0,
    barcode      VARCHAR(128),
    product_name VARCHAR(256),
    received_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
    returned_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
    -- Snapshots historicos INAMOVIBLES tomados dentro de la TX del RPC.
    -- Columnas NULLABLE intencionalmente: NULL significa "traspaso creado ANTES
    -- de esta migracion, no existe foto historica" (distinto de stock 0 real).
    -- Momento 1 - Envio/despacho (escrito por RPC create_transfer_order):
    origin_stock_before      NUMERIC(18,4),  -- Stock origen ANTES de restar lo enviado
    origin_stock_after       NUMERIC(18,4),  -- Stock origen DESPUES de restar lo enviado
    -- Momento 2 - Recepcion/confirmacion (escrito por RPC receive_transfer_order):
    destination_stock_before NUMERIC(18,4),  -- Stock destino ANTES de sumar lo recibido
    destination_stock_after  NUMERIC(18,4),  -- Stock destino DESPUES de sumar lo recibido
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT inventory_transfer_items_qty_positive_ck CHECK (quantity >= 0),
    CONSTRAINT inventory_transfer_items_received_positive_ck CHECK (received_qty >= 0),
    CONSTRAINT inventory_transfer_items_returned_positive_ck CHECK (returned_qty >= 0)
);

-- -----------------------------------------------------------------------------
-- Idempotencia: agregado de columnas de snapshot para instalaciones EXISTENTES
-- (instancias que ya tenian inventory_transfer_items creada antes de esta migracion)
-- -----------------------------------------------------------------------------
ALTER TABLE public.inventory_transfer_items
    ADD COLUMN IF NOT EXISTS origin_stock_before      NUMERIC(18,4);
ALTER TABLE public.inventory_transfer_items
    ADD COLUMN IF NOT EXISTS origin_stock_after       NUMERIC(18,4);
ALTER TABLE public.inventory_transfer_items
    ADD COLUMN IF NOT EXISTS destination_stock_before NUMERIC(18,4);
ALTER TABLE public.inventory_transfer_items
    ADD COLUMN IF NOT EXISTS destination_stock_after  NUMERIC(18,4);

CREATE INDEX IF NOT EXISTS idx_inventory_transfer_items_transfer
    ON public.inventory_transfer_items(transfer_id);

CREATE INDEX IF NOT EXISTS idx_inventory_transfer_items_product
    ON public.inventory_transfer_items(product_id);

COMMENT ON TABLE public.inventory_transfer_items IS
    'Lineas por producto dentro de una orden de traspaso (detail).';
COMMENT ON COLUMN public.inventory_transfer_items.quantity IS
    'Cantidad solicitada / enviada al origen.';
COMMENT ON COLUMN public.inventory_transfer_items.received_qty IS
    'Cantidad recibida realmente en la sucursal destino.';
COMMENT ON COLUMN public.inventory_transfer_items.returned_qty IS
    'Diferencia devuelta automaticamente al origen cuando hay faltante.';
COMMENT ON COLUMN public.inventory_transfer_items.origin_stock_before IS
    '[SNAPSHOT INAMOVIBLE] Stock en sucursal ORIGEN milisegundos ANTES del UPDATE que resta la mercancia enviada. Escrito por RPC create_transfer_order. NULL en traspasos creados antes de esta migracion. NUNCA se modifica despues de insertar.';
COMMENT ON COLUMN public.inventory_transfer_items.origin_stock_after IS
    '[SNAPSHOT INAMOVIBLE] Stock en sucursal ORIGEN milisegundos DESPUES del UPDATE que resta la mercancia enviada. Escrito por RPC create_transfer_order. NULL en traspasos creados antes de esta migracion. NUNCA se modifica despues de insertar.';
COMMENT ON COLUMN public.inventory_transfer_items.destination_stock_before IS
    '[SNAPSHOT INAMOVIBLE] Stock en sucursal DESTINO milisegundos ANTES del UPDATE que suma la mercancia recibida. Escrito por RPC receive_transfer_order. NULL hasta que se confirma la recepcion, y NULL en traspasos creados antes de esta migracion. NUNCA se modifica despues de recibir.';
COMMENT ON COLUMN public.inventory_transfer_items.destination_stock_after IS
    '[SNAPSHOT INAMOVIBLE] Stock en sucursal DESTINO milisegundos DESPUES del UPDATE que suma la mercancia recibida. Escrito por RPC receive_transfer_order. NULL hasta que se confirma la recepcion, y NULL en traspasos creados antes de esta migracion. NUNCA se modifica despues de recibir.';

-- =============================================================================
-- 2) ROW LEVEL SECURITY (RLS)
-- =============================================================================

ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transfer_items ENABLE ROW LEVEL SECURITY;

-- SELECT abierto para usuarios autenticados (consulta de historial).
DROP POLICY IF EXISTS inventory_transfers_select_policy ON public.inventory_transfers;
CREATE POLICY inventory_transfers_select_policy ON public.inventory_transfers
    FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS inventory_transfer_items_select_policy ON public.inventory_transfer_items;
CREATE POLICY inventory_transfer_items_select_policy ON public.inventory_transfer_items
    FOR SELECT
    TO authenticated
    USING (true);

-- Mutaciones DIRECTAS a las tablas BLOQUEADAS (Solo a traves de RPCs con SECURITY DEFINER).
DROP POLICY IF EXISTS inventory_transfers_all_via_rpc_policy ON public.inventory_transfers;
CREATE POLICY inventory_transfers_all_via_rpc_policy ON public.inventory_transfers
    FOR ALL
    TO authenticated
    USING (false)
    WITH CHECK (false);

DROP POLICY IF EXISTS inventory_transfer_items_all_via_rpc_policy ON public.inventory_transfer_items;
CREATE POLICY inventory_transfer_items_all_via_rpc_policy ON public.inventory_transfer_items
    FOR ALL
    TO authenticated
    USING (false)
    WITH CHECK (false);

COMMENT ON POLICY inventory_transfers_all_via_rpc_policy ON public.inventory_transfers IS
    'Todas las mutaciones a inventory_transfers pasan unicamente por RPCs con SECURITY DEFINER (definidas en Supabase, no en el repo).';
    