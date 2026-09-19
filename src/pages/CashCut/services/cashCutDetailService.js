/**
 * cashCutDetailService.js
 * Consultas a profundidad bajo demanda del modulo de Corte de cajero.
 */

import { supabase } from "../../../lib/supabaseClient";
import { CUT_SELECT_FIELDS } from "./cashCutConstants";

/**
 * Consulta un corte historico por id con su usuario y su sesion de caja.
 * Se usa cuando el corte no esta presente en el historial ya cargado.
 */
export const fetchHistoricalCutDetail = async ({ cutId }) =>
  supabase
    .from("cash_cuts")
    .select(CUT_SELECT_FIELDS)
    .eq("id", cutId)
    .maybeSingle();
