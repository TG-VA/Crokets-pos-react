import React, { useEffect, useMemo, useState } from "react";
import styles from "./PointsHistory.module.css";
import { supabase } from "../../../../lib/supabaseClient";

const PointsHistory = () => {
  const [movements, setMovements] = useState([]);
  const [branches, setBranches] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [movementFilter, setMovementFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");

  const [loadingMovements, setLoadingMovements] = useState(false);
  const [error, setError] = useState("");

  const loadBranches = async () => {
    try {
      const { data, error: branchesError } = await supabase
        .from("branches")
        .select("id, name, code, state")
        .order("name", { ascending: true });

      if (branchesError) throw branchesError;

      setBranches(data || []);
    } catch (err) {
      console.error("Error cargando sucursales:", err);
      setBranches([]);
    }
  };

  const loadMovements = async () => {
    try {
      setLoadingMovements(true);
      setError("");

      const { data, error: movementsError } = await supabase
        .from("customer_points")
        .select(`
          *,
          customers:customer_id (
            id,
            name,
            phone,
            email
          ),
          rewards:reward_id (
            id,
            name
          ),
          users:user_id (
            id,
            username
          ),
          branches:branch_id (
            id,
            name,
            code
          )
        `)
        .order("created_at", { ascending: false });

      if (movementsError) throw movementsError;

      setMovements(data || []);
    } catch (err) {
      console.error("Error cargando historial de puntos:", err);
      setError("No se pudo cargar el historial de puntos.");
      setMovements([]);
    } finally {
      setLoadingMovements(false);
    }
  };

  useEffect(() => {
    loadBranches();
    loadMovements();
  }, []);

  useEffect(() => {
    const pointsChannel = supabase
      .channel("points-history-customer-points-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_points",
        },
        () => {
          loadMovements();
        }
      )
      .subscribe();

    const branchesChannel = supabase
      .channel("points-history-branches-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "branches",
        },
        () => {
          loadBranches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pointsChannel);
      supabase.removeChannel(branchesChannel);
    };
  }, []);

  const normalizeText = (value) => {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  };

  const formatDateTime = (dateValue) => {
    if (!dateValue) return "SIN FECHA";

    try {
      const rawDate = String(dateValue);

      const normalizedDate =
        rawDate.includes("T") && (rawDate.endsWith("Z") || rawDate.includes("+"))
          ? rawDate
          : `${rawDate.replace(" ", "T")}Z`;

      return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
        .format(new Date(normalizedDate))
        .toUpperCase();
    } catch {
      return "SIN FECHA";
    }
  };

  const formatSaleFolio = (saleId) => {
    if (!saleId) return "SIN FOLIO";

    return String(saleId).trim().slice(0, 8).toUpperCase();
  };

  const getMovementLabel = (movement) => {
    if (movement.source === "cancellation") return "CANCELACIÓN";
    if (movement.source === "partial_return") return "DEVOLUCIÓN";
    if (movement.source === "reward") return "CANJE";

    if (movement.source === "manual") {
      return Number(movement.points || 0) >= 0 ? "AJUSTE +" : "AJUSTE -";
    }

    if (movement.movement_type === "earn") return "GANADO";
    if (movement.movement_type === "redeem") return "DESCONTADO";

    return "OTRO";
  };

  const getSourceLabel = (source) => {
    if (source === "sale") return "VENTA";
    if (source === "manual") return "MANUAL";
    if (source === "reward") return "RECOMPENSA";
    if (source === "cancellation") return "CANCELACIÓN";
    if (source === "partial_return") return "DEVOLUCIÓN PARCIAL";

    return "SIN ORIGEN";
  };

  const getBranchName = (movement) => {
    return normalizeText(
      movement.branches?.name || movement.branches?.code || "SIN SUCURSAL"
    );
  };

  const getMovementNotes = (movement) => {
    return normalizeText(movement.notes);
  };

  const getReturnedAmountFromNotes = (notes) => {
    const match = String(notes || "").match(/\$[\d,]+(\.\d{2})?/);
    return match ? match[0] : "";
  };

  const getMotiveFromNotes = (notes) => {
    const cleanNotes = String(notes || "").trim();

    if (!cleanNotes) return "";

    const motiveMatch = cleanNotes.match(/MOTIVO:\s*(.*?)(\.|$)/i);

    if (motiveMatch?.[1]) {
      return normalizeText(motiveMatch[1]);
    }

    return normalizeText(cleanNotes);
  };

  const matchesCustomerSearch = (movement, search) => {
    if (!search) return true;

    const customerValues = [
      movement.customers?.name,
      movement.customers?.phone,
      movement.customers?.email,
    ];

    return customerValues.some((value) =>
      String(value || "").toLowerCase().includes(search)
    );
  };

  const matchesBranchFilter = (movement) => {
    return branchFilter === "all" || movement.branch_id === branchFilter;
  };

  const baseMovementsForSummary = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return movements.filter((movement) => {
      if (!matchesCustomerSearch(movement, search)) return false;

      return true;
    });
  }, [movements, searchTerm]);

  const filteredMovements = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return movements.filter((movement) => {
      if (!matchesCustomerSearch(movement, search)) return false;
      if (!matchesBranchFilter(movement)) return false;

      const matchesMovement =
        movementFilter === "all" || movement.movement_type === movementFilter;

      if (!matchesMovement) return false;

      return true;
    });
  }, [movements, searchTerm, movementFilter, branchFilter]);

  const summary = useMemo(() => {
    const earned = baseMovementsForSummary
      .filter((movement) => Number(movement.points || 0) > 0)
      .reduce((sum, movement) => sum + Number(movement.points || 0), 0);

    const redeemed = baseMovementsForSummary
      .filter((movement) => Number(movement.points || 0) < 0)
      .reduce((sum, movement) => {
        return sum + Math.abs(Number(movement.points || 0));
      }, 0);

    const balance = baseMovementsForSummary.reduce((sum, movement) => {
      return sum + Number(movement.points || 0);
    }, 0);

    return {
      total: baseMovementsForSummary.length,
      earned,
      redeemed,
      balance,
    };
  }, [baseMovementsForSummary]);

  const customerSearchLabel = useMemo(() => {
    const cleanSearch = searchTerm.trim().toLowerCase();

    if (!cleanSearch) return "";

    const firstMatch = movements.find((movement) =>
      matchesCustomerSearch(movement, cleanSearch)
    );

    return normalizeText(firstMatch?.customers?.name || searchTerm.trim());
  }, [movements, searchTerm]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setMovementFilter("all");
    setBranchFilter("all");
  };

  const hasActiveFilters =
    searchTerm.trim() || movementFilter !== "all" || branchFilter !== "all";

  const renderRelatedInfo = (movement) => {
    const notes = getMovementNotes(movement);
    const absolutePoints = Math.abs(Number(movement.points || 0));

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

      return (
        <div className={styles.relatedInfo}>
          <strong>CANCELACIÓN DE VENTA</strong>
          <span>{formatSaleFolio(movement.related_sale_id)}</span>

          <span>
            <strong>Puntos descontados:</strong> {absolutePoints}
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
          <span>{searchTerm.trim() ? "Saldo del cliente" : "Saldo global"}</span>
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

              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name || branch.code || "SIN NOMBRE"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && <div className={styles.errorMessage}>{error}</div>}

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
                        {formatDateTime(movement.created_at)}
                      </span>
                    </td>

                    <td>
                      <div className={styles.customerInfo}>
                        <strong>
                          {normalizeText(
                            movement.customers?.name || "SIN CLIENTE"
                          )}
                        </strong>
                        <span>
                          {normalizeText(
                            movement.customers?.phone || "SIN TELÉFONO"
                          )}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`${styles.movementBadge} ${
                          movement.movement_type === "earn"
                            ? styles.movementEarn
                            : styles.movementRedeem
                        }`}
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
                        {normalizeText(
                          movement.users?.username || "SIN USUARIO"
                        )}
                      </span>
                    </td>

                    <td>
                      <span className={styles.normalText}>
                        {getBranchName(movement)}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PointsHistory;