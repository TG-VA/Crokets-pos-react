import { supabase } from "../../../lib/supabaseClient";
import { buildTicketText } from "../../../utils/ticketBuilder";
import { printTicket } from "../../../utils/ticketPrinter";

import {
  getRewardCartItems,
  getRewardItemPointsPerUnit,
  getRewardItemTotalPoints,
} from "./salesRewardsService";

const buildRewardRowsFromCartItems = ({
  rewardItems = [],
  customerId = null,
}) => {
  return (rewardItems || [])
    .filter((item) => {
      return (
        (item?.is_reward_item ||
          item?.is_reward_discount_item) &&
        item?.reward_id &&
        Number(item?.cantidad || 0) > 0
      );
    })
    .map((item) => {
      const quantity = Number(
        item.cantidad || 0,
      );

      const totalPoints =
        getRewardItemTotalPoints(item);

      const pointsPerUnit =
        getRewardItemPointsPerUnit(item);

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

      return {
        id:
          item.sale_reward_redemption_id ||
          `local_${item.reward_id}_${item.id}`,
        sale_id: null,
        sale_detail_id:
          item.sale_detail_id || null,
        customer_id:
          customerId || null,
        reward_id: item.reward_id,
        product_id: item.id,
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
        reward_type:
          item.is_reward_discount_item
            ? "product_discount"
            : "free_product",
        created_at:
          new Date().toISOString(),
      };
    });
};

const loadRewardRedemptionsForPrintedSale =
  async ({
    saleId,
    fallbackRewardItems = [],
    customerId = null,
  }) => {
    const fallbackRows =
      buildRewardRowsFromCartItems({
        rewardItems:
          fallbackRewardItems,
        customerId,
      });

    if (!saleId) {
      return fallbackRows;
    }

    try {
      const { data, error } =
        await supabase
          .from(
            "sale_reward_redemptions",
          )
          .select(
            `
            id,
            sale_id,
            sale_detail_id,
            customer_id,
            reward_id,
            product_id,
            quantity,
            points_per_unit,
            total_points,
            unit_price,
            discount_amount,
            reward_name,
            product_name,
            created_at
          `,
          )
          .eq("sale_id", saleId)
          .order("created_at", {
            ascending: true,
          });

      if (error) {
        throw error;
      }

      if ((data || []).length > 0) {
        return data || [];
      }

      return fallbackRows;
    } catch (error) {
      console.error(
        "Error cargando canjes para ticket:",
        error,
      );

      return fallbackRows;
    }
  };

export const printSaleTicket = async ({
  saleId,
  paymentData,
  paymentPayload,
  notes,
  saleDate,
  saleClient = null,
  pointsResult = null,
  cartItems = [],
  branch = null,
  user = null,
  subtotal = 0,
  discountTotal = 0,
  total = 0,
}) => {
  try {
    const rewardItemsForPrint =
      getRewardCartItems(cartItems);

    const rewardRedemptions =
      await loadRewardRedemptionsForPrintedSale({
        saleId,
        fallbackRewardItems:
          pointsResult?.rewardRedemptions
            ?.length
            ? []
            : rewardItemsForPrint,
        customerId:
          saleClient?.id || null,
      });

    const rewardRowsForPrint =
      pointsResult?.rewardRedemptions
        ?.length > 0
        ? pointsResult.rewardRedemptions
        : rewardRedemptions;

    const rewardBySaleDetailId = {};
    const rewardByProductId = {};

    for (
      const reward of
      rewardRowsForPrint || []
    ) {
      if (reward?.sale_detail_id) {
        rewardBySaleDetailId[
          reward.sale_detail_id
        ] = reward;
      }

      if (
        reward?.product_id &&
        !rewardByProductId[
          reward.product_id
        ]
      ) {
        rewardByProductId[
          reward.product_id
        ] = reward;
      }
    }

    const [
      detailsRes,
      kitItemsRes,
    ] = await Promise.all([
      supabase
        .from("sale_details")
        .select(
          `
          id,
          quantity,
          unit_price,
          total_price,
          product_id,
          original_unit_price,
          final_unit_price,
          discount_type,
          discount_value,
          discount_amount
        `,
        )
        .eq("sale_id", saleId),

      supabase
        .from("sale_kit_items")
        .select(
          `
          id,
          sale_id,
          sale_detail_id,
          kit_product_id,
          component_product_id,
          quantity
        `,
        )
        .eq("sale_id", saleId),
    ]);

    if (detailsRes.error) {
      throw detailsRes.error;
    }

    if (kitItemsRes.error) {
      throw kitItemsRes.error;
    }

    const detailsRows =
      detailsRes.data || [];

    const kitItemRows =
      kitItemsRes.data || [];

    const productIds = [
      ...new Set(
        [
          ...detailsRows.map(
            (detail) =>
              detail.product_id,
          ),
          ...kitItemRows.map(
            (kitItem) =>
              kitItem.component_product_id,
          ),
          ...(
            rewardRowsForPrint || []
          ).map(
            (reward) =>
              reward.product_id,
          ),
        ].filter(Boolean),
      ),
    ];

    const {
      data: productsRows,
      error: productsError,
    } = productIds.length
      ? await supabase
          .from("products")
          .select(
            "id, name, barcode, is_kit",
          )
          .in("id", productIds)
      : {
          data: [],
          error: null,
        };

    if (productsError) {
      throw productsError;
    }

    const productMap = {};
    const productIsKitMap = {};

    for (
      const product of
      productsRows || []
    ) {
      productMap[product.id] =
        product.name ||
        product.barcode ||
        "PRODUCTO";

      productIsKitMap[product.id] =
        Boolean(product.is_kit);
    }

    const kitItemsByDetail = {};

    for (
      const row of kitItemRows
    ) {
      if (
        !kitItemsByDetail[
          row.sale_detail_id
        ]
      ) {
        kitItemsByDetail[
          row.sale_detail_id
        ] = [];
      }

      kitItemsByDetail[
        row.sale_detail_id
      ].push({
        id: row.id,
        productId:
          row.component_product_id,
        quantity: Number(
          row.quantity || 0,
        ),
        description:
          productMap[
            row.component_product_id
          ] || "PRODUCTO",
      });
    }

    let itemsForPrint =
      detailsRows.map((item) => {
        const components =
          kitItemsByDetail[item.id] ||
          [];

        const rewardInfo =
          rewardBySaleDetailId[
            item.id
          ] ||
          (Number(
            item.total_price || 0,
          ) === 0
            ? rewardByProductId[
                item.product_id
              ]
            : null);

        const isRewardLine =
          Boolean(rewardInfo) &&
          Number(
            item.total_price || 0,
          ) === 0;

        const originalUnitPrice =
          Number(
            item.original_unit_price ||
              rewardInfo?.unit_price ||
              item.unit_price ||
              0,
          );

        return {
          quantity: Number(
            item.quantity || 0,
          ),
          description:
            productMap[
              item.product_id
            ] ||
            rewardInfo?.product_name ||
            "PRODUCTO",
          unit_price:
            isRewardLine
              ? 0
              : Number(
                  item.final_unit_price ||
                    item.unit_price ||
                    0,
                ),
          original_unit_price:
            originalUnitPrice,
          discount_amount:
            isRewardLine
              ? 0
              : Number(
                  item.discount_amount ||
                    0,
                ),
          line_total: Number(
            item.total_price || 0,
          ),
          is_kit:
            Boolean(
              productIsKitMap[
                item.product_id
              ],
            ) ||
            components.length > 0,
          components:
            components.map(
              (component) => ({
                quantity:
                  component.quantity,
                description:
                  component.description,
              }),
            ),
          is_reward_item:
            isRewardLine,
          isRewardItem:
            isRewardLine,
          reward_id:
            rewardInfo?.reward_id ||
            null,
          rewardId:
            rewardInfo?.reward_id ||
            null,
          reward_name:
            rewardInfo?.reward_name ||
            "",
          rewardName:
            rewardInfo?.reward_name ||
            "",
          reward_points: Number(
            rewardInfo
              ?.points_per_unit || 0,
          ),
          rewardPoints: Number(
            rewardInfo
              ?.points_per_unit || 0,
          ),
          total_points: Number(
            rewardInfo
              ?.total_points || 0,
          ),
          totalPoints: Number(
            rewardInfo
              ?.total_points || 0,
          ),
          sale_reward_redemption_id:
            rewardInfo?.id || null,
          saleRewardRedemptionId:
            rewardInfo?.id || null,
        };
      });

    if (
      itemsForPrint.length === 0 &&
      (rewardRowsForPrint || [])
        .length > 0
    ) {
      itemsForPrint = (
        rewardRowsForPrint || []
      ).map((reward) => ({
        quantity: Number(
          reward.quantity || 0,
        ),
        description:
          productMap[
            reward.product_id
          ] ||
          reward.product_name ||
          "PRODUCTO",
        unit_price: 0,
        original_unit_price:
          Number(
            reward.unit_price || 0,
          ),
        discount_amount: 0,
        line_total: 0,
        is_kit: false,
        components: [],
        is_reward_item: true,
        isRewardItem: true,
        reward_id:
          reward.reward_id || null,
        rewardId:
          reward.reward_id || null,
        reward_name:
          reward.reward_name ||
          "RECOMPENSA",
        rewardName:
          reward.reward_name ||
          "RECOMPENSA",
        reward_points: Number(
          reward.points_per_unit ||
            0,
        ),
        rewardPoints: Number(
          reward.points_per_unit ||
            0,
        ),
        total_points: Number(
          reward.total_points || 0,
        ),
        totalPoints: Number(
          reward.total_points || 0,
        ),
        sale_reward_redemption_id:
          reward.id || null,
        saleRewardRedemptionId:
          reward.id || null,
      }));
    }

    const rewardPointsUsed =
      Number(
        pointsResult?.pointsUsed ||
          0,
      ) ||
      (
        rewardRowsForPrint || []
      ).reduce((sum, reward) => {
        return (
          sum +
          Number(
            reward.total_points ||
              0,
          )
        );
      }, 0);

    const rewardsCount = (
      rewardRowsForPrint || []
    ).reduce((sum, reward) => {
      return (
        sum +
        Number(
          reward.quantity || 0,
        )
      );
    }, 0);

    const hasRewardRedemptions =
      rewardRowsForPrint.length > 0 ||
      rewardPointsUsed > 0 ||
      rewardsCount > 0;

    const isRewardOnlySale =
      hasRewardRedemptions &&
      Number(total || 0) <= 0;

    const paymentsForTicket =
      isRewardOnlySale
        ? []
        : (
            paymentPayload || []
          ).filter((payment) => {
            return (
              Number(
                payment.amount || 0,
              ) > 0
            );
          });

    const totalPaid =
      paymentsForTicket.reduce(
        (sum, payment) => {
          const amount = Number(
            payment.amount || 0,
          );

          const currency = String(
            payment.currency || "MXN",
          ).toUpperCase();

          const exchangeRate =
            Number(
              payment.exchange_rate ||
                0,
            );

          if (currency === "USD") {
            return (
              sum +
              (exchangeRate > 0
                ? amount *
                  exchangeRate
                : 0)
            );
          }

          return sum + amount;
        },
        0,
      );

    const cashierName = (
      user?.username ||
      user?.email ||
      "CAJERO"
    ).toUpperCase();

    const ticketText =
      buildTicketText({
        branch: {
          name:
            branch?.name ||
            "SUCURSAL",
          phone:
            branch?.phone || "",
          address:
            branch?.address || "",
          city: branch?.city || "",
          state:
            branch?.state || "",
          postal_code:
            branch?.postal_code ||
            branch?.zip_code ||
            "",
        },
        sale: {
          folio: String(
            saleId,
          )
            .slice(0, 8)
            .toUpperCase(),
          created_at: saleDate,
          subtotal: Number(
            subtotal || 0,
          ),
          tax: 0,
          discount_total: Number(
            discountTotal || 0,
          ),
          total: Number(
            total || 0,
          ),
          amount_received:
            isRewardOnlySale
              ? 0
              : totalPaid ||
                Number(total || 0),
          change_amount:
            isRewardOnlySale
              ? 0
              : Math.max(
                  Number(
                    paymentData
                      ?.change || 0,
                  ),
                  0,
                ),
          payment_method:
            isRewardOnlySale
              ? "SIN PAGO"
              : paymentData
                  ?.method || "",
          payments:
            paymentsForTicket,
          status: "completed",
          notes:
            notes ||
            paymentData?.notes ||
            "",
          cashier_name:
            cashierName,
          customer_name:
            saleClient?.name || "",
          customer_phone:
            saleClient?.phone ||
            saleClient?.id ||
            "",
          customer_email:
            saleClient?.email ||
            "",
          points_earned: Number(
            pointsResult?.points ||
              0,
          ),
          reward_points_used:
            rewardPointsUsed,
          rewards_count:
            rewardsCount,
          has_reward_redemptions:
            hasRewardRedemptions,
          reward_redemptions:
            rewardRowsForPrint,
          customer_points_balance:
            pointsResult?.newBalance !==
              undefined &&
            pointsResult?.newBalance !==
              null
              ? Number(
                  pointsResult.newBalance,
                )
              : null,
        },
        items: itemsForPrint,
        cashierName,
        footer: {
          line1:
            "Gracias por su compra",
          line2:
            "Agenda tu cita de baño",
          phone: "998 117 5387",
          returnPolicy:
            "Para cambios o devoluciones presentar ticket de compra",
        },
        isReprint: false,
      });

    const printResult =
      await printTicket(ticketText);

    if (!printResult?.success) {
      console.error(
        "No se pudo imprimir el ticket automáticamente.",
      );
    }

    return {
      success:
        Boolean(printResult?.success),
      ticketText,
    };
  } catch (error) {
    console.error(
      "Error al generar/imprimir ticket automático:",
      error,
    );

    return {
      success: false,
      error,
    };
  }
};