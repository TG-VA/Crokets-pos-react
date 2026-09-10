import {
  buildRedemptionReason,
  buildSaleProductKey,
  getRowMovementTypeKey,
} from "../utils/movementFormatters";

const getRewardLabel = (reward) => {
  return String(
    reward?.name ??
      reward?.title ??
      reward?.reward_name ??
      reward?.description ??
      ""
  ).trim();
};

const getRedemptionPoints = (
  redemption
) => {
  return (
    redemption?.points_used ??
    redemption?.redeemed_points ??
    redemption?.points_redeemed ??
    redemption?.points ??
    null
  );
};

const getRedemptionQuantity = (
  redemption
) => {
  const rawQuantity = Number(
    redemption?.quantity ??
      redemption?.qty ??
      redemption?.pieces ??
      redemption
        ?.pieces_delivered ??
      1
  );

  if (
    Number.isFinite(rawQuantity) &&
    rawQuantity !== 0
  ) {
    return -Math.abs(rawQuantity);
  }

  return -1;
};

const createRewardRowsBySaleProduct =
  (rewardRows) => {
    const rewardRowsMap =
      new Map();

    rewardRows.forEach((row) => {
      const key = buildSaleProductKey(
        row?.sale_id,
        row?.product_id
      );

      if (
        !key ||
        rewardRowsMap.has(key)
      ) {
        return;
      }

      rewardRowsMap.set(
        key,
        row
      );
    });

    return rewardRowsMap;
  };

const createRedemptionSaleIds = (
  rewardRows
) => {
  return new Set(
    rewardRows
      .map((row) => row?.sale_id)
      .filter(Boolean)
  );
};

const reorderTransferReason = (value) => {
  const text = String(value ?? "").trim();

  if (!/^TRASPASO\s/i.test(text)) {
    return value;
  }

  const match = text.match(
    /^TRASPASO\s+(.*?)\s+(TR-\d{6}-\d{6})\s+(.+)$/i
  );

  if (!match) {
    return value;
  }

  const [, actionPhrase, folio, rest] = match;

  const restMatch =
    rest.match(
      /^([A-Za-zÁÉÍÓÚáéíóúÑñ0-9_\- ]+?)(?:\s*-\s*(.+))?$/
    );

  let branchName;
  let notes;

  if (restMatch) {
    branchName = String(restMatch[1] ?? "").trim();
    notes = restMatch[2] ? String(restMatch[2]).trim() : "";
  } else {
    branchName = rest.trim();
    notes = "";
  }

  let result = `TRASPASO ${actionPhrase} ${branchName} ${folio}`;

  if (notes) {
    result += ` - ${notes}`;
  }

  return result;
};

export const hydrateBaseMovements = ({
  baseRows,
  rewardRows,
  productsById,
  usersById,
  salesById,
  rewardsById,
}) => {
  const redemptionSaleIds =
    createRedemptionSaleIds(
      rewardRows
    );

  const rewardRowsBySaleProduct =
    createRewardRowsBySaleProduct(
      rewardRows
    );

  return baseRows.map((row) => {
    const sale =
      salesById.get(
        row?.sale_id
      ) ?? null;

    const saleProductKey =
      buildSaleProductKey(
        row?.sale_id,
        row?.product_id
      );

    const rewardRow =
      rewardRowsBySaleProduct.get(
        saleProductKey
      ) ?? null;

    const reward = rewardRow
      ? rewardsById.get(
          rewardRow?.reward_id
        ) ?? null
      : null;

    const rewardLabel =
      getRewardLabel(reward);

    const pointsValue = rewardRow
      ? getRedemptionPoints(
          rewardRow
        )
      : null;

    const isSaleMovement =
      getRowMovementTypeKey(row) ===
      "sale";

    return {
      ...row,

      row_key: `movement-${
        row?.id ??
        `${row?.product_id}-${row?.created_at}`
      }`,

      has_sale_redemption:
        redemptionSaleIds.has(
          row?.sale_id
        ),

      report_sort_at:
        sale?.sale_date ??
        row?.created_at ??
        sale?.created_at ??
        null,

      reason:
        rewardRow &&
        isSaleMovement
          ? buildRedemptionReason(
              rewardLabel,
              pointsValue
            )
          : reorderTransferReason(row?.reason),

      products:
        productsById.get(
          row?.product_id
        ) ?? null,

      users:
        usersById.get(
          row?.user_id
        ) ?? null,

      sales: sale,
    };
  });
};

export const hydrateMissingRedemptions =
  ({
    baseRows,
    rewardRows,
    productsById,
    usersById,
    salesById,
    rewardsById,
  }) => {
    const baseSaleProductKeys =
      new Set(
        baseRows
          .filter(
            (row) =>
              getRowMovementTypeKey(
                row
              ) === "sale"
          )
          .map((row) =>
            buildSaleProductKey(
              row?.sale_id,
              row?.product_id
            )
          )
          .filter(Boolean)
      );

    const redemptionSaleIds =
      createRedemptionSaleIds(
        rewardRows
      );

    return rewardRows
      .filter((row) => {
        const key =
          buildSaleProductKey(
            row?.sale_id,
            row?.product_id
          );

        if (!key) {
          return true;
        }

        return (
          !baseSaleProductKeys.has(
            key
          )
        );
      })
      .map((row) => {
        const sale =
          salesById.get(
            row?.sale_id
          ) ?? null;

        const product =
          productsById.get(
            row?.product_id
          ) ?? null;

        const reward =
          rewardsById.get(
            row?.reward_id
          ) ?? null;

        const rewardLabel =
          getRewardLabel(reward);

        const pointsValue =
          getRedemptionPoints(row);

        return {
          ...row,

          row_key: `redemption-${
            row?.id ??
            `${row?.sale_id}-${row?.product_id}-${row?.created_at}`
          }`,

          has_sale_redemption:
            redemptionSaleIds.has(
              row?.sale_id
            ),

          report_sort_at:
            sale?.sale_date ??
            row?.created_at ??
            sale?.created_at ??
            null,

          movement_type:
            "redemption",

          quantity:
            getRedemptionQuantity(
              row
            ),

          previous_stock: null,
          new_stock: null,

          reason:
            buildRedemptionReason(
              rewardLabel,
              pointsValue
            ),

          products: product,

          display_product_name:
            product?.name
              ? null
              : rewardLabel || null,

          users:
            usersById.get(
              row?.user_id
            ) ?? null,

          sales: sale,
        };
      });
  };