/**
 * cashCutConstants.js
 * Campos compartidos de la fila de corte (`cash_cuts`) con sus embeds.
 */

export const CUT_SELECT_FIELDS = `
  id,
  branch_id,
  user_id,
  cash_register_session_id,
  cut_type,
  expected_amount,
  counted_amount,
  difference,
  notes,
  cut_date,
  created_at,
  users (
    username
  ),
  cash_register_sessions (
    id,
    branch_id,
    user_id,
    opened_at,
    closed_at,
    opening_amount,
    closing_amount,
    difference,
    status
  )
`;
