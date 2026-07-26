import { supabase } from "../../../lib/supabaseClient";

import {
  getCustomerCurrentPointsBalance,
} from "./salesCustomerPointsService";

const getValidRewardItems = (
  rewardItems = [],
) => {
  return (rewardItems || []).filter(
    (item) => {
      return (
        (item?.is_reward_item ||
          item?.is_reward_discount_item) &&
        item?.reward_id &&
        Number(item?.cantidad || 0) > 0
      );
    },
  );
};

export const getRewardCartItems = (
  cartItems = [],
) => {
  return getValidRewardItems(cartItems);
};

export const getRewardItemTotalPoints = (
  item,
) => {
  const linePoints = Number(
    item?.reward_line_points_required ||
      0,
  );

  if (linePoints > 0) {
    return Math.round(linePoints);
  }

  const rewardPoints = Number(
    item?.reward_points_required || 0,
  );

  if (rewardPoints > 0) {
    return Math.round(rewardPoints);
  }

  const pointsPerReward = Number(
    item?.points_required || 0,
  );

  const rewardQuantity = Math.max(
    Number(item?.reward_quantity || 1),
    1,
  );

  const itemQuantity = Math.max(
    Number(item?.cantidad || 0),
    0,
  );

  if (
    pointsPerReward > 0 &&
    itemQuantity > 0
  ) {
    return Math.round(
      pointsPerReward *
        (itemQuantity /
          rewardQuantity),
    );
  }

  return 0;
};

export const getRewardItemPointsPerUnit = (
  item,
) => {
  const quantity = Math.max(
    Number(item?.cantidad || 0),
    1,
  );

  const totalPoints =
    getRewardItemTotalPoints(item);

  if (totalPoints <= 0) {
    return 1;
  }

  return Math.max(
    Math.round(
      totalPoints / quantity,
    ),
    1,
  );
};

export const getRewardItemsSummary = (
  rewardItems = [],
) => {
  return (rewardItems || []).reduce(
    (summary, item) => {
      const totalPoints =
        getRewardItemTotalPoints(item);

      const quantity = Number(
        item?.cantidad || 0,
      );

      const discountAmount = Number(
        item?.reward_discount_amount ??
          item?.descuentoMonto ??
          0,
      );

      summary.totalPoints += totalPoints;
      summary.totalQuantity += quantity;
      summary.totalDiscountAmount +=
        discountAmount;

      return summary;
    },
    {
      totalPoints: 0,
      totalQuantity: 0,
      totalDiscountAmount: 0,
    },
  );
};

const findSaleDetailForRewardItem = (
  rewardItem,
  saleDetails = [],
  usedDetailIds = new Set(),
) => {
  if (!rewardItem?.id) {
    return null;
  }

  const itemQuantity = Number(
    rewardItem.cantidad || 0,
  );

  const itemDiscount = Number(
    rewardItem.descuentoMonto || 0,
  );

  const candidates = (
    saleDetails || []
  ).filter((detail) => {
    if (usedDetailIds.has(detail.id)) {
      return false;
    }

    if (
      detail.product_id !==
      rewardItem.id
    ) {
      return false;
    }

    if (
      rewardItem
        ?.is_reward_discount_item
    ) {
      return (
        Number(
          detail.quantity || 0,
        ) === itemQuantity
      );
    }

    const finalUnitPrice = Number(
      detail.final_unit_price ??
        detail.unit_price ??
        0,
    );

    return finalUnitPrice === 0;
  });

  if (candidates.length === 0) {
    return null;
  }

  const exactMatch =
    candidates.find((detail) => {
      return (
        Number(
          detail.quantity || 0,
        ) === itemQuantity &&
        Number(
          detail.discount_amount ||
            0,
        ) === itemDiscount
      );
    });

  if (exactMatch) {
    return exactMatch;
  }

  const quantityMatch =
    candidates.find((detail) => {
      return (
        Number(
          detail.quantity || 0,
        ) === itemQuantity
      );
    });

  return (
    quantityMatch ||
    candidates[0] ||
    null
  );
};

const loadSaleDetailsForRewardRedemptions =
  async (saleId) => {
    if (!saleId) {
      return [];
    }

    const { data, error } =
      await supabase
        .from("sale_details")
        .select(
          `
          id,
          sale_id,
          product_id,
          quantity,
          unit_price,
          total_price,
          original_unit_price,
          final_unit_price,
          discount_amount
        `,
        )
        .eq("sale_id", saleId);

    if (error) {
      throw error;
    }

    return data || [];
  };

export const registerSaleRewardRedemptions =
  async ({
    saleId,
    customerId,
    saleDate,
    rewardItems = [],
    branchId,
    userId,
  }) => {
    if (
      !saleId ||
      !customerId ||
      !branchId ||
      !userId
    ) {
      return {
        registered: false,
        rows: [],
        totalPoints: 0,
        totalQuantity: 0,
        totalDiscountAmount: 0,
      };
    }

    const validRewardItems =
      getValidRewardItems(
        rewardItems,
      );

    if (
      validRewardItems.length === 0
    ) {
      return {
        registered: false,
        rows: [],
        totalPoints: 0,
        totalQuantity: 0,
        totalDiscountAmount: 0,
      };
    }

    const {
      data: existingRows,
      error: existingRowsError,
    } = await supabase
      .from(
        "sale_reward_redemptions",
      )
      .select("id")
      .eq("sale_id", saleId)
      .limit(1);

    if (existingRowsError) {
      throw existingRowsError;
    }

    const summary =
      getRewardItemsSummary(
        validRewardItems,
      );

    if (
      (existingRows || []).length > 0
    ) {
      return {
        registered: false,
        rows: [],
        ...summary,
      };
    }

    const saleDetails =
      await loadSaleDetailsForRewardRedemptions(
        saleId,
      );

    const usedDetailIds = new Set();

    const redemptionRows =
      validRewardItems.map((item) => {
        const quantity = Number(
          item.cantidad || 0,
        );

        const totalPoints =
          getRewardItemTotalPoints(
            item,
          );

        const pointsPerUnit =
          getRewardItemPointsPerUnit(
            item,
          );

        const unitPrice = Number(
          item.precioOriginal ??
            item.precio ??
            0,
        );

        const discountAmount = Number(
          item.reward_discount_amount ??
            item.descuentoMonto ??
            unitPrice * quantity ??
            0,
        );

        const detailRow =
          findSaleDetailForRewardItem(
            item,
            saleDetails,
            usedDetailIds,
          );

        if (detailRow?.id) {
          usedDetailIds.add(
            detailRow.id,
          );
        }

        return {
          id: crypto.randomUUID(),
          sale_id: saleId,
          sale_detail_id:
            detailRow?.id || null,
          customer_id: customerId,
          reward_id: item.reward_id,
          product_id: item.id,
          branch_id: branchId,
          user_id: userId,
          quantity,
          points_per_unit:
            pointsPerUnit,
          total_points: Math.max(
            totalPoints,
            pointsPerUnit,
          ),
          unit_price: unitPrice,
          discount_amount:
            discountAmount,
          reward_name:
            item.reward_name ||
            item.discountConcept ||
            "RECOMPENSA",
          product_name:
            item.nombre ||
            item.codigo ||
            "PRODUCTO",
          status: "applied",
          created_at:
            saleDate ||
            new Date().toISOString(),
        };
      });

    const { error: insertError } =
      await supabase
        .from(
          "sale_reward_redemptions",
        )
        .insert(redemptionRows);

    if (insertError) {
      throw insertError;
    }

    const returnedRows =
      redemptionRows.map((row) => {
        const sourceItem =
          validRewardItems.find(
            (item) => {
              return (
                item.reward_id ===
                  row.reward_id &&
                item.id ===
                  row.product_id
              );
            },
          );

        return {
          ...row,
          reward_type:
            sourceItem
              ?.is_reward_discount_item
              ? "product_discount"
              : "free_product",
        };
      });

    return {
      registered: true,
      rows: returnedRows,
      ...summary,
    };
  };

export const registerCustomerRewardPointsRedemption =
  async ({
    saleId,
    customerId,
    saleDate,
    rewardItems = [],
    branchId,
    userId,
  }) => {
    if (
      !saleId ||
      !customerId ||
      !branchId ||
      !userId
    ) {
      const currentBalance =
        customerId
          ? await getCustomerCurrentPointsBalance(
              customerId,
            )
          : null;

      return {
        pointsUsed: 0,
        registered: false,
        newBalance: currentBalance,
      };
    }

    const validRewardItems =
      getValidRewardItems(
        rewardItems,
      );

    if (
      validRewardItems.length === 0
    ) {
      const currentBalance =
        await getCustomerCurrentPointsBalance(
          customerId,
        );

      return {
        pointsUsed: 0,
        registered: false,
        newBalance: currentBalance,
      };
    }

    const {
      data: existingMovement,
      error: existingError,
    } = await supabase
      .from("customer_points")
      .select("id")
      .eq(
        "customer_id",
        customerId,
      )
      .eq(
        "related_sale_id",
        saleId,
      )
      .eq("source", "reward")
      .limit(1)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    const pointsByReward = {};
    const quantityByReward = {};
    const nameByReward = {};

    validRewardItems.forEach(
      (item) => {
        const rewardId =
          item.reward_id;

        pointsByReward[rewardId] =
          Number(
            pointsByReward[
              rewardId
            ] || 0,
          ) +
          getRewardItemTotalPoints(
            item,
          );

        quantityByReward[rewardId] =
          Number(
            quantityByReward[
              rewardId
            ] || 0,
          ) +
          Number(
            item.cantidad || 0,
          );

        nameByReward[rewardId] =
          item.reward_name ||
          item.discountConcept ||
          "RECOMPENSA";
      },
    );

    const totalPointsUsed =
      Object.values(
        pointsByReward,
      ).reduce((sum, value) => {
        return (
          sum +
          Number(value || 0)
        );
      }, 0);

    if (totalPointsUsed <= 0) {
      const currentBalance =
        await getCustomerCurrentPointsBalance(
          customerId,
        );

      return {
        pointsUsed: 0,
        registered: false,
        newBalance: currentBalance,
      };
    }

    if (existingMovement?.id) {
      const currentBalance =
        await getCustomerCurrentPointsBalance(
          customerId,
        );

      return {
        pointsUsed:
          totalPointsUsed,
        registered: false,
        newBalance: currentBalance,
      };
    }

    const movementRows =
      Object.entries(pointsByReward)
        .filter(([, points]) => {
          return (
            Number(points || 0) > 0
          );
        })
        .map(
          ([rewardId, points]) => {
            const quantity = Number(
              quantityByReward[
                rewardId
              ] || 0,
            );

            const rewardName =
              nameByReward[
                rewardId
              ] || "RECOMPENSA";

            return {
              id: crypto.randomUUID(),
              customer_id:
                customerId,
              points:
                Math.abs(
                  Math.round(
                    Number(
                      points || 0,
                    ),
                  ),
                ) * -1,
              movement_type:
                "redeem",
              source: "reward",
              related_sale_id:
                saleId,
              reward_id: rewardId,
              user_id: userId,
              branch_id: branchId,
              notes:
                `CANJE DE RECOMPENSA EN VENTA. RECOMPENSA: ${rewardName}. CANTIDAD ENTREGADA: ${quantity}.`,
              created_at:
                saleDate ||
                new Date().toISOString(),
            };
          },
        );

    if (movementRows.length > 0) {
      const { error: insertError } =
        await supabase
          .from("customer_points")
          .insert(movementRows);

      if (insertError) {
        throw insertError;
      }
    }

    const newBalance =
      await getCustomerCurrentPointsBalance(
        customerId,
      );

    return {
      pointsUsed:
        totalPointsUsed,
      registered:
        movementRows.length > 0,
      newBalance,
    };
  };