-- Desactiva la cuenta de prueba alexander@example.com (KNOWN_ISSUES #14).
-- No sigue la convención de dominio @internal.crokets del resto de usuarios reales.
-- Idempotente: solo cambia la fila si existe y sigue activa.
update public.users
set status = false
where email = 'alexander@example.com'
  and status = true;
