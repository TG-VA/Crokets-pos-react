import styles from "../PageOrders.module.css";

/**
 * Clase visual de cada estado de partida (`getOrderItemStatus`). Es la unica
 * relacion entre el estado de una diferencia y su color en tablas y badges.
 */
export const ITEM_STATUS_DIFFERENCE_CLASS = {
  pending: styles.differencePending,
  accepted: styles.differenceOk,
  shortage: styles.differenceShort,
  overage: styles.differenceOver,
};
