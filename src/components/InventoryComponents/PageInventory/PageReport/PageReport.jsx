import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../../lib/supabaseClient";
import { useBranch } from "../../../../contexts/BranchContext";
import styles from "./PageReport.module.css";

const POLI_BRANCH_ID = "412f367f-7c86-45ca-9e91-b8fe6274b232";

const PageReport = () => {
  const { branch } = useBranch();
  const [branchOptions, setBranchOptions] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState(POLI_BRANCH_ID);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [otherStocksByProduct, setOtherStocksByProduct] = useState({});
  const [loadingDetailsByProduct, setLoadingDetailsByProduct] = useState({});
  const [detailsErrorByProduct, setDetailsErrorByProduct] = useState({});

  useEffect(() => {
    if (selectedBranchId) return;
    if (branch?.id) {
      setSelectedBranchId(branch.id);
    }
  }, [branch?.id, selectedBranchId]);

  useEffect(() => {
    const loadBranches = async () => {
      try {
        const { data, error: branchesError } = await supabase
          .from("branches")
          .select("id, name, code")
          .order("name", { ascending: true });

        if (branchesError) throw branchesError;
        const list = Array.isArray(data) ? data : [];
        const hasPoli = list.some((b) => b?.id === POLI_BRANCH_ID);
        setBranchOptions(
          hasPoli
            ? list
            : [
                ...list,
                { id: POLI_BRANCH_ID, name: "POLÍGONO", code: "" },
              ]
        );
      } catch (e) {
        const fallback = branch?.id
          ? [
              { id: POLI_BRANCH_ID, name: "POLÍGONO", code: "" },
              {
                id: branch.id,
                name: branch?.name || "Sucursal actual",
                code: branch?.code || "",
              },
            ]
          : [];
        setBranchOptions(fallback);
      }
    };

    loadBranches();
  }, [branch?.id, branch?.name, branch?.code]);

  useEffect(() => {
    const loadInventoryByBranch = async () => {
      if (!selectedBranchId) {
        setRows([]);
        setError("");
        return;
      }

      setLoading(true);
      setError("");

      try {
        const selectCandidates = [
          `
            id,
            branch_id,
            product_id,
            stock,
            min_stock,
            max_stock,
            is_active,
            products:product_id(
              id,
              barcode,
              name,
              department_id,
              departments(
                name
              )
            )
          `,
          `
            id,
            branch_id,
            product_id,
            stock,
            min_stock,
            max_stock,
            is_active,
            products(
              id,
              barcode,
              name,
              department_id,
              departments(
                name
              )
            )
          `,
        ];

        let dataRows = [];
        let lastErr = null;

        for (const selectClause of selectCandidates) {
          const activeRes = await supabase
            .from("branch_inventory")
            .select(selectClause)
            .eq("branch_id", selectedBranchId)
            .eq("is_active", true)
            .order("created_at", { ascending: false });

          if (activeRes.error) {
            lastErr = activeRes.error;
            continue;
          }

          dataRows = activeRes.data ?? [];

          if (dataRows.length === 0) {
            const allRes = await supabase
              .from("branch_inventory")
              .select(selectClause)
              .eq("branch_id", selectedBranchId)
              .order("created_at", { ascending: false });

            if (allRes.error) {
              lastErr = allRes.error;
              continue;
            }
            dataRows = allRes.data ?? [];
          }

          lastErr = null;
          break;
        }

        if (lastErr) throw lastErr;

        const mapped = dataRows.map((item) => {
          const p = item?.products ?? {};
          return {
            inventoryRowId: item?.id ?? null,
            productId: item?.product_id ?? null,
            codigo: (p?.barcode ?? "").toString(),
            nombre: (p?.name ?? "").toString(),
            depto: (p?.departments?.name ?? "").toString(),
            existencia: Number(item?.stock ?? 0) || 0,
            min: Number(item?.min_stock ?? 0) || 0,
            max: Number(item?.max_stock ?? 0) || 0,
          };
        });

        setRows(mapped);
      } catch (e) {
        setRows([]);
        setError("No se pudo cargar el reporte de inventario.");
      } finally {
        setLoading(false);
      }
    };

    loadInventoryByBranch();
  }, [selectedBranchId]);

  const selectedBranchLabel = useMemo(() => {
    const current = branchOptions.find((b) => b.id === selectedBranchId);
    if (!current) return selectedBranchId || "—";
    if (current.code) return `${current.name} (${current.code})`;
    return current.name;
  }, [branchOptions, selectedBranchId]);

  const handleToggleOtherStocks = async (productId) => {
    if (!productId) return;

    if (expandedProductId === productId) {
      setExpandedProductId(null);
      return;
    }

    setExpandedProductId(productId);
    if (otherStocksByProduct[productId] || loadingDetailsByProduct[productId]) return;

    setLoadingDetailsByProduct((prev) => ({ ...prev, [productId]: true }));
    setDetailsErrorByProduct((prev) => ({ ...prev, [productId]: "" }));

    try {
      const selectCandidates = [
        `
          id,
          branch_id,
          stock,
          min_stock,
          max_stock,
          is_active,
          branches:branch_id(
            id,
            name,
            code
          )
        `,
        `
          id,
          branch_id,
          stock,
          min_stock,
          max_stock,
          is_active,
          branches(
            id,
            name,
            code
          )
        `,
      ];

      let dataRows = [];
      let lastErr = null;

      for (const selectClause of selectCandidates) {
        const res = await supabase
          .from("branch_inventory")
          .select(selectClause)
          .eq("product_id", productId)
          .neq("branch_id", selectedBranchId)
          .order("created_at", { ascending: false });

        if (res.error) {
          lastErr = res.error;
          continue;
        }

        dataRows = res.data ?? [];
        lastErr = null;
        break;
      }

      if (lastErr) throw lastErr;

      setOtherStocksByProduct((prev) => ({ ...prev, [productId]: dataRows }));
    } catch (e) {
      setOtherStocksByProduct((prev) => ({ ...prev, [productId]: [] }));
      setDetailsErrorByProduct((prev) => ({
        ...prev,
        [productId]: "No se pudo cargar stock de otras sucursales.",
      }));
    } finally {
      setLoadingDetailsByProduct((prev) => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Reporte de inventario</h1>
          <div className={styles.controls}>
            <label className={styles.label}>Sucursal</label>
            <select
              className={styles.select}
              value={selectedBranchId}
              onChange={(e) => {
                setExpandedProductId(null);
                setSelectedBranchId(e.target.value);
              }}
            >
              {branchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code ? `${b.name} (${b.code})` : b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.meta}>
          Sucursal seleccionada: {selectedBranchLabel}
        </div>

        {loading && <div className={styles.info}>Cargando inventario...</div>}
        {!!error && <div className={styles.error}>{error}</div>}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Depto</th>
                <th>Existencia</th>
                <th>Mín</th>
                <th>Máx</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {!loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    No hay productos para esta sucursal.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isExpanded = expandedProductId === row.productId;
                  const detailRows = otherStocksByProduct[row.productId] || [];
                  const detailsLoading = !!loadingDetailsByProduct[row.productId];
                  const detailsError = detailsErrorByProduct[row.productId];

                  return (
                    <React.Fragment key={row.inventoryRowId ?? row.productId}>
                      <tr>
                        <td>{row.codigo}</td>
                        <td>{row.nombre}</td>
                        <td>{row.depto || "—"}</td>
                        <td>{row.existencia}</td>
                        <td>{row.min}</td>
                        <td>{row.max}</td>
                        <td>
                          <button
                            type="button"
                            className={styles.linkButton}
                            onClick={() => handleToggleOtherStocks(row.productId)}
                          >
                            {isExpanded ? "Ocultar otras sucursales" : "Ver otras sucursales"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className={styles.detailCell}>
                            {detailsLoading && (
                              <div className={styles.info}>Cargando otras sucursales...</div>
                            )}
                            {!detailsLoading && !!detailsError && (
                              <div className={styles.error}>{detailsError}</div>
                            )}
                            {!detailsLoading && !detailsError && detailRows.length === 0 && (
                              <div className={styles.info}>
                                No hay stock de este producto en otras sucursales.
                              </div>
                            )}
                            {!detailsLoading && !detailsError && detailRows.length > 0 && (
                              <table className={styles.nestedTable}>
                                <thead>
                                  <tr>
                                    <th>Sucursal</th>
                                    <th>Existencia</th>
                                    <th>Mín</th>
                                    <th>Máx</th>
                                    <th>Estatus</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detailRows.map((d) => (
                                    <tr key={d.id}>
                                      <td>
                                        {d?.branches?.code
                                          ? `${d.branches.name} (${d.branches.code})`
                                          : d?.branches?.name || d?.branch_id}
                                      </td>
                                      <td>{Number(d?.stock ?? 0) || 0}</td>
                                      <td>{Number(d?.min_stock ?? 0) || 0}</td>
                                      <td>{Number(d?.max_stock ?? 0) || 0}</td>
                                      <td>{d?.is_active ? "Activo" : "Inactivo"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PageReport;
