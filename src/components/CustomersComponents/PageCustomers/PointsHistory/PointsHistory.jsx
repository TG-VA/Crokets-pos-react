import React, { useEffect, useMemo, useState } from "react";
import styles from "./PointsHistory.module.css";
import { useBranch } from "../../../../contexts/BranchContext";
import { useAppModal } from "../../../../hooks/useAppModal";
import AppModal from "../../../AppModal/AppModal";
import { subscribeToTableChanges } from "../services/customersRealtimeService";
import { normalizeText } from "../utils/customerFormatters";
import {
  fetchBranches,
  fetchPointsMovements,
} from "./services/pointsHistoryService";
import {
  calculateMovementsSummary,
  filterMovements,
  filterMovementsByCustomerSearch,
  formatMovementDateTime,
  formatSaleFolio,
  getMovementBadgeClassName,
  getMovementBranchName,
  getMovementNotes,
  getMovementCustomerName,
  getMovementLabel,
  getMovementUserName,
  getMotiveFromNotes,
  getReturnedAmountFromNotes,
  getSourceLabel,
  resolveCustomerSearchLabel,
} from "./services/pointsHistoryCalculationService";

const PointsHistory = () => {
  const { branch } = useBranch();

  const [movements, setMovements] = useState([]);
  const [branches, setBranches] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [movementFilter, setMovementFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const [loadingMovements, setLoadingMovements] = useState(false);

  const { appModal, closeAppModal, showAppAlert } = useAppModal();

  const loadBranches = async () => {
    try {
      setBranches(await fetchBranches());
    } catch (err) {
      console.error("Error cargando sucursales:", err);
      setBranches([]);

      showAppAlert({
        type: "danger",
        title: "No se pudieron cargar sucursales",
        message:
          "No se pudieron cargar las sucursales para el filtro del historial.",
        confirmText: "Entendido",
      });
    }
  };

  const loadMovements = async () => {
    try {
      setLoadingMovements(true);

      setMovements(await fetchPointsMovements());
    } catch (err) {
      console.error("Error cargando historial de puntos:", err);
      setMovements([]);

      showAppAlert({
        type: "danger",
        title: "No se pudo cargar",
        message: "No se pudo cargar el historial de puntos.",
        confirmText: "Entendido",
      });
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    loadBranches();
    loadMovements();
  }, []);

  useEffect(() => {
    if (!branch?.id) return;

    setBranchFilter((currentFilter) => {
      if (!currentFilter || currentFilter === "all") {
        return branch.id;
      }

      return currentFilter;
    });
  }, [branch?.id]);

  useEffect(() => {
    const unsubscribePoints = subscribeToTableChanges({
      channelName: "points-history-customer-points-realtime",
      tables: ["customer_points"],
      onChange: loadMovements,
    });

    const unsubscribeBranches = subscribeToTableChanges({
      channelName: "points-history-branches-realtime",
      tables: ["branches"],
      onChange: loadBranches,
    });

    return () => {
      unsubscribePoints();
      unsubscribeBranches();
    };
  }, []);

  const baseMovementsForSummary = useMemo(() => {
    return filterMovementsByCustomerSearch({ movements, searchTerm });
  }, [movements, searchTerm]);

  const filteredMovements = useMemo(() => {
    return filterMovements({
      movements,
      searchTerm,
      movementFilter,
      branchFilter,
    });
  }, [movements, searchTerm, movementFilter, branchFilter]);

  const summary = useMemo(() => {
    return calculateMovementsSummary(baseMovementsForSummary);
  }, [baseMovementsForSummary]);

  const customerSearchLabel = useMemo(() => {
    return resolveCustomerSearchLabel({ movements, searchTerm });
  }, [movements, searchTerm]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setMovementFilter("all");
    setBranchFilter(branch?.id || "all");
  };

  const hasActiveFilters =
    searchTerm.trim() ||
    movementFilter !== "all" ||
    branchFilter !== (branch?.id || "all");

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

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>HISTORIAL DE PUNTOS</h1>
          <p>
            Consulta movimientos globales de puntos acumulados, canjeados,
            descontados o ajustados por cliente.
          </p>
        </div>

        <button
          type="button"
          className={styles.refreshButton}
          onClick={() => {
            loadBranches();
            loadMovements();
          }}
          disabled={loadingMovements}
        >
          {loadingMovements ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span>
            {searchTerm.trim() ? "Movimientos del cliente" : "Movimientos"}
          </span>
          <strong>{summary.total}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Puntos ganados</span>
          <strong>{summary.earned}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>Puntos descontados</span>
          <strong>{summary.redeemed}</strong>
        </div>

        <div className={styles.summaryCard}>
          <span>
            {searchTerm.trim() ? "Saldo del cliente" : "Saldo global"}
          </span>
          <strong>{summary.balance}</strong>
        </div>
      </div>

      <div className={styles.filtersPanel}>
        <div className={styles.filtersHeader}>
          <div>
            <h2>Filtros de búsqueda</h2>
            <p>
              Busca por cliente. El resumen muestra el saldo global del cliente.
              Los filtros de tipo y sucursal solo afectan la tabla.
            </p>

            {customerSearchLabel && (
              <p>
                Mostrando historial de: <strong>{customerSearchLabel}</strong>
              </p>
            )}
          </div>

          <button
            type="button"
            className={styles.clearFiltersButton}
            onClick={handleClearFilters}
            disabled={!hasActiveFilters}
          >
            Limpiar filtros
          </button>
        </div>

        <div className={styles.filters}>
          <div className={styles.searchContainer}>
            <label>Buscar cliente</label>

            <div className={styles.inputWrapper}>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Nombre, teléfono o correo del cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />

              {searchTerm && (
                <button
                  type="button"
                  className={styles.clearSearchButton}
                  onClick={() => setSearchTerm("")}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          <div className={styles.filterGroup}>
            <label>Tipo de movimiento</label>
            <select
              className={styles.filterSelect}
              value={movementFilter}
              onChange={(e) => setMovementFilter(e.target.value)}
            >
              <option value="all">Todos</option>
              <option value="earn">Puntos ganados</option>
              <option value="redeem">Puntos descontados</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Sucursal</label>
            <select
              className={styles.filterSelect}
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
            >
              <option value="all">Todas</option>

              {branches.map((branchItem) => (
                <option key={branchItem.id} value={branchItem.id}>
                  {branchItem.name || branchItem.code || "SIN NOMBRE"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.resultsInfo}>
        {loadingMovements
          ? "Cargando historial de puntos..."
          : `Mostrando ${filteredMovements.length} movimiento${
              filteredMovements.length !== 1 ? "s" : ""
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
            ) : filteredMovements.length === 0 ? (
              <tr>
                <td colSpan="8" className={styles.textCenter}>
                  No hay movimientos de puntos con los filtros seleccionados.
                  Intenta limpiar filtros o buscar otro cliente.
                </td>
              </tr>
            ) : (
              filteredMovements.map((movement) => {
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

      <AppModal
        isOpen={appModal.isOpen}
        type={appModal.type}
        title={appModal.title}
        message={appModal.message}
        confirmText={appModal.confirmText}
        cancelText={appModal.cancelText}
        showCancel={appModal.showCancel}
        loading={appModal.loading}
        onConfirm={appModal.onConfirm || closeAppModal}
        onCancel={appModal.onCancel || closeAppModal}
        onClose={closeAppModal}
      />
    </div>
  );
};

export default PointsHistory;
