ALTER TABLE public.inventory_transfers
  DROP CONSTRAINT IF EXISTS inventory_transfers_status_ck;

ALTER TABLE public.inventory_transfers
  ADD CONSTRAINT inventory_transfers_status_ck
  CHECK (
    status IN (
      'pending_receipt',
      'processing_receipt',
      'received_complete',
      'received_with_difference',
      'cancelled'
    )
  );
