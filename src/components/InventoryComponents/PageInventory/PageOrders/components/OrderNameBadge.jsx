import badgeStyles from "../BranchBadge.module.css";
import { toUpperLabel } from "../utils/ordersFormatters";

/**
 * Nombre del pedido como pastilla. Una sola fuente del estilo; el texto pasa
 * por toUpperLabel para que llegue en mayusculas aunque el dato no lo este.
 */
const OrderNameBadge = ({ name }) => (
  <span className={badgeStyles.orderNameBadge}>{toUpperLabel(name)}</span>
);

export default OrderNameBadge;
