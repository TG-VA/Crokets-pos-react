import { supabase } from "../../../lib/supabaseClient";

const toNumber = (value) => {
  const parsedValue = Number(value);

  return Number.isFinite(parsedValue)
    ? parsedValue
    : 0;
};

const convertPaymentToMxn = (payment) => {
  const amount = toNumber(payment?.amount);

  const currency = String(
    payment?.currency || "MXN",
  )
    .trim()
    .toUpperCase();

  if (currency === "MXN") {
    return amount;
  }

  const exchangeRate = toNumber(
    payment?.exchange_rate,
  );

  if (
    currency === "USD" &&
    exchangeRate > 0
  ) {
    return amount * exchangeRate;
  }

  return 0;
};

const calculateCashMovements = (
  movements = [],
) => {
  return movements.reduce(
    (result, movement) => {
      const amount = toNumber(
        movement?.amount,
      );

      if (
        movement?.movement_type ===
        "entrada"
      ) {
        result.entries += amount;
      }

      if (
        movement?.movement_type ===
        "salida"
      ) {
        result.exits += amount;
      }

      return result;
    },
    {
      entries: 0,
      exits: 0,
    },
  );
};

const getSessionCashSales = async ({
  branchId,
  userId,
  openedAt,
}) => {
  if (
    !branchId ||
    !userId ||
    !openedAt
  ) {
    return 0;
  }

  const {
    data: sales,
    error: salesError,
  } = await supabase
    .from("sales")
    .select("id")
    .eq("branch_id", branchId)
    .eq("user_id", userId)
    .in("status", [
      "completed",
      "cancelled",
      "refunded",
    ])
    .gte("created_at", openedAt);

  if (salesError) {
    throw salesError;
  }

  const saleIds = (sales || [])
    .map((sale) => sale?.id)
    .filter(Boolean);

  if (!saleIds.length) {
    return 0;
  }

  const {
    data: payments,
    error: paymentsError,
  } = await supabase
    .from("sale_payments")
    .select(`
      amount,
      currency,
      exchange_rate,
      payment_methods (
        affects_cash
      )
    `)
    .in("sale_id", saleIds)
    .eq("branch_id", branchId);

  if (paymentsError) {
    throw paymentsError;
  }

  return (payments || []).reduce(
    (sum, payment) => {
      const affectsCash =
        payment?.payment_methods
          ?.affects_cash ?? false;

      if (!affectsCash) {
        return sum;
      }

      return (
        sum +
        convertPaymentToMxn(payment)
      );
    },
    0,
  );
};

const getSessionCashRefunds = async ({
  branchId,
  userId,
  openedAt,
}) => {
  if (
    !branchId ||
    !userId ||
    !openedAt
  ) {
    return 0;
  }

  const [
    {
      data: cancellations,
      error: cancellationsError,
    },
    {
      data: partialReturns,
      error: partialReturnsError,
    },
  ] = await Promise.all([
    supabase
      .from("canceled_sales")
      .select(`
        refund_amount,
        payment_methods (
          affects_cash
        )
      `)
      .eq("branch_id", branchId)
      .eq("user_id", userId)
      .gte("canceled_at", openedAt),

    supabase
      .from("sale_returns")
      .select(`
        total_refund,
        payment_methods (
          affects_cash
        )
      `)
      .eq("branch_id", branchId)
      .eq("user_id", userId)
      .gte("created_at", openedAt),
  ]);

  if (cancellationsError) {
    throw cancellationsError;
  }

  if (partialReturnsError) {
    throw partialReturnsError;
  }

  const cancellationCashImpact =
    (cancellations || []).reduce(
      (sum, cancellation) => {
        const affectsCash =
          cancellation?.payment_methods
            ?.affects_cash ?? false;

        if (!affectsCash) {
          return sum;
        }

        return (
          sum +
          toNumber(
            cancellation?.refund_amount,
          )
        );
      },
      0,
    );

  const partialReturnCashImpact =
    (partialReturns || []).reduce(
      (sum, partialReturn) => {
        const affectsCash =
          partialReturn?.payment_methods
            ?.affects_cash ?? false;

        if (!affectsCash) {
          return sum;
        }

        return (
          sum +
          toNumber(
            partialReturn?.total_refund,
          )
        );
      },
      0,
    );

  return (
    cancellationCashImpact +
    partialReturnCashImpact
  );
};

export const getOpenCashSession = async ({
  branchId,
  userId,
}) => {
  if (!branchId || !userId) {
    throw new Error(
      "No se detectó la sucursal o el usuario.",
    );
  }

  const { data, error } = await supabase
    .from("cash_register_sessions")
    .select(`
      id,
      branch_id,
      user_id,
      status,
      opened_at,
      opening_amount
    `)
    .eq("branch_id", branchId)
    .eq("user_id", userId)
    .eq("status", "open")
    .order("opened_at", {
      ascending: false,
    })
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(
      "No hay una sesión de caja abierta para este usuario.",
    );
  }

  return data;
};

export const getShiftCutStatus = async ({
  sessionId,
}) => {
  if (!sessionId) {
    throw new Error(
      "No se detectó la sesión de caja.",
    );
  }

  const { data, error } = await supabase
    .from("cash_cuts")
    .select("id")
    .eq(
      "cash_register_session_id",
      sessionId,
    )
    .eq("cut_type", "shift")
    .limit(1);

  if (error) {
    throw error;
  }

  return (data || []).length > 0;
};

export const getAvailableCash = async ({
  sessionId,
}) => {
  if (!sessionId) {
    throw new Error(
      "No se detectó la sesión de caja.",
    );
  }

  const {
    data: session,
    error: sessionError,
  } = await supabase
    .from("cash_register_sessions")
    .select(`
      id,
      branch_id,
      user_id,
      opening_amount,
      opened_at
    `)
    .eq("id", sessionId)
    .single();

  if (sessionError) {
    throw sessionError;
  }

  const [
    {
      data: movements,
      error: movementsError,
    },
    cashSales,
    cashRefunds,
  ] = await Promise.all([
    supabase
      .from("cash_movements")
      .select(`
        movement_type,
        amount
      `)
      .eq("session_id", sessionId),

    getSessionCashSales({
      branchId: session?.branch_id,
      userId: session?.user_id,
      openedAt: session?.opened_at,
    }),

    getSessionCashRefunds({
      branchId: session?.branch_id,
      userId: session?.user_id,
      openedAt: session?.opened_at,
    }),
  ]);

  if (movementsError) {
    throw movementsError;
  }

  const {
    entries,
    exits,
  } = calculateCashMovements(
    movements || [],
  );

  return (
    toNumber(
      session?.opening_amount,
    ) +
    entries +
    cashSales -
    exits -
    cashRefunds
  );
};

export const createCashMovement = async ({
  sessionId,
  userId,
  branchId,
  movementType,
  amount,
  description,
}) => {
  if (!sessionId) {
    throw new Error(
      "No se detectó la sesión de caja.",
    );
  }

  if (!userId) {
    throw new Error(
      "No se detectó el usuario.",
    );
  }

  if (!branchId) {
    throw new Error(
      "No se detectó la sucursal.",
    );
  }

  const normalizedAmount =
    toNumber(amount);

  if (normalizedAmount <= 0) {
    throw new Error(
      "El monto del movimiento debe ser mayor a cero.",
    );
  }

  if (
    movementType !== "entrada" &&
    movementType !== "salida"
  ) {
    throw new Error(
      "El tipo de movimiento no es válido.",
    );
  }

  const payload = {
    session_id: sessionId,
    user_id: userId,
    branch_id: branchId,
    movement_type: movementType,
    amount: normalizedAmount,
    description:
      String(description || "").trim() ||
      null,
  };

  const { data, error } = await supabase
    .from("cash_movements")
    .insert([payload])
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
};