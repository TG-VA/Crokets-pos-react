import styles from "../PageOrders.module.css";
import { formatOrderName } from "../utils/ordersFormatters";

/**
 * Nombre del pedido como pastilla. Una sola fuente del estilo; el texto pasa
 * por formatOrderName para que llegue en mayusculas aunque el dato no lo este.
 */
const OrderNameBadge = ({ name }) => (
  <span className={styles.orderNameBadge}>{formatOrderName(name)}</span>
);

export default OrderNameBadge;
