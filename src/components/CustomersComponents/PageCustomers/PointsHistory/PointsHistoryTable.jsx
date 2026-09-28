import styles from "./PointsHistory.module.css";
import { normalizeText } from "../utils/customerFormatters";
import {
  formatMovementDateTime,
  formatSaleFolio,
  getMovementBadgeClassName,
  getMovementBranchName,
  getMovementCustomerName,
  getMovementLabel,
  getMovementNotes,
  getMovementUserName,
  getMotiveFromNotes,
  getReturnedAmountFromNotes,
  getSourceLabel,
} from "./services/pointsHistoryCalculationService";

/**
 * Detalle contextual del movimiento: ajuste manual, cancelacion, devolucion,
 * recompensa canjeada o venta relacionada.
 */
const renderRelatedInfo = (movement) => {
  const notes = getMovementNotes(movement);
  const points = Number(movement.points || 0);
  const absolutePoints = Math.abs(points);

  if (movement.source === "manual") {
    return (
      <div className={styles.relatedInfo}>
        <strong>AJUSTE MANUAL</strong>
        <span>{notes || "SIN MOTIVO REGISTRADO"}</span>
      </div>
    );
  }

  if (movement.source === "cancellation") {
    const motive = getMotiveFromNotes(notes);
    const isReturnedPoints = points > 0;

    return (
      <div className={styles.relatedInfo}>
        <strong>CANCELACIÓN DE VENTA</strong>
        <span>{formatSaleFolio(movement.related_sale_id)}</span>

        <span>
          <strong>
            {isReturnedPoints ? "Puntos devueltos:" : "Puntos descontados:"}
          </strong>{" "}
          {absolutePoints}
        </span>

        {motive && (
          <span>
            <strong>Motivo:</strong> {motive}
          </span>
        )}
      </div>
    );
  }

  if (movement.source === "partial_return") {
    const returnedAmount = getReturnedAmountFromNotes(notes);
    const motive = getMotiveFromNotes(notes);

    return (
      <div className={styles.relatedInfo}>
        <strong>DEVOLUCIÓN PARCIAL</strong>
        <span>{formatSaleFolio(movement.related_sale_id)}</span>

        <span>
          <strong>Puntos descontados:</strong> {absolutePoints}
        </span>

        {returnedAmount && (
          <span>
            <strong>Monto devuelto:</strong> {returnedAmount}
          </span>
        )}

        {motive && (
          <span>
            <strong>Motivo:</strong> {motive}
          </span>
        )}
      </div>
    );
  }

  if (movement.rewards?.name) {
    return (
      <div className={styles.relatedInfo}>
        <strong>{normalizeText(movement.rewards.name)}</strong>
        <span>RECOMPENSA CANJEADA</span>
      </div>
    );
  }

  if (movement.related_sale_id) {
    return (
      <div className={styles.relatedInfo}>
        <strong>VENTA RELACIONADA</strong>
        <span>{formatSaleFolio(movement.related_sale_id)}</span>
      </div>
    );
  }

  return <span className={styles.mutedText}>SIN RELACIÓN</span>;
};

/**
 * Tabla del historial global de movimientos de puntos.
 */
const PointsHistoryTable = ({ movements, loadingMovements }) => {
  return (
    <>
      <div className={styles.resultsInfo}>
        {loadingMovements
          ? "Cargando historial de puntos..."
          : `Mostrando ${movements.length} movimiento${
              movements.length !== 1 ? "s" : ""
            }`}
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.pointsTable}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Movimiento</th>
              <th>Puntos</th>
              <th>Origen</th>
              <th>Recompensa / Venta</th>
              <th>Usuario</th>
              <th>Sucursal</th>
            </tr>
          </thead>

          <tbody>
            {loadingMovements ? (
              <tr>
                <td colSpan="8" className={styles.textCenter}>
                  Cargando historial de puntos...
                </td>
              </tr>
            ) : movements.length === 0 ? (
              <tr>
                <td colSpan="8" className={styles.textCenter}>
                  No hay movimientos de puntos con los filtros seleccionados.
                  Intenta limpiar filtros o buscar otro cliente.
                </td>
              </tr>
            ) : (
              movements.map((movement) => {
                const points = Number(movement.points || 0);
                const isPositive = points > 0;

                return (
                  <tr key={movement.id}>
                    <td>
                      <span className={styles.dateText}>
                        {formatMovementDateTime(movement.created_at)}
                      </span>
                    </td>

                    <td>
                      <div className={styles.customerInfo}>
                        <strong>{getMovementCustomerName(movement)}</strong>
                        <span>
                          {normalizeText(
                            movement.customers?.phone || "SIN TELÉFONO"
                          )}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`${styles.movementBadge} ${getMovementBadgeClassName(
                          {
                            movement,
                            movementReturn: styles.movementReturn,
                            movementEarn: styles.movementEarn,
                            movementRedeem: styles.movementRedeem,
                          }
                        )}`}
                      >
                        {getMovementLabel(movement)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`${styles.pointsBadge} ${
                          isPositive
                            ? styles.pointsPositive
                            : styles.pointsNegative
                        }`}
                      >
                        {isPositive ? `+${points}` : points}
                      </span>
                    </td>

                    <td>
                      <span className={styles.sourceBadge}>
                        {getSourceLabel(movement.source)}
                      </span>
                    </td>

                    <td>{renderRelatedInfo(movement)}</td>

                    <td>
                      <span className={styles.normalText}>
                        {getMovementUserName(movement)}
                      </span>
                    </td>

                    <td>
                      <span className={styles.normalText}>
                        {getMovementBranchName(movement)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default PointsHistoryTable;
