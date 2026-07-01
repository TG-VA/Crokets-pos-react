import React, { useEffect, useMemo, useState } from "react";
import styles from "./PointsAdjustment.module.css";
import { supabase } from "../../../../lib/supabaseClient";
import { useBranch } from "../../../../contexts/BranchContext";
import PointsAdjustmentConfirmModal from "../../Modals/PointsAdjustmentConfirmModal/PointsAdjustmentConfirmModal";
import AppModal from "../../../AppModal/AppModal";

const ADMIN_AUTH_STORAGE_KEY = "customers_points_adjustment_admin_authorized";

const ADJUSTMENT_REASON_OPTIONS = [
  {
    value: "migration",
    label: "MIGRACIÓN DE PUNTOS DESDE SISTEMA ANTERIOR",
  },
  {
    value: "administrative_correction",
    label: "CORRECCIÓN ADMINISTRATIVA",
  },
  {
    value: "authorized_compensation",
    label: "COMPENSACIÓN AUTORIZADA",
  },
  {
    value: "operational_error",
    label: "CORRECCIÓN POR ERROR OPERATIVO",
  },
  {
    value: "customer_clarification",
    label: "ACLARACIÓN DE PUNTOS DEL CLIENTE",
  },
  {
    value: "other",
    label: "OTRO",
  },
];

const BLOCKED_GENERIC_NOTES = [
  "PRUEBA",
  "TEST",
  "OK",
  "AJUSTE",
  "PUNTOS",
  "MANUAL",
  "OTRO",
  "N/A",
  "NA",
  ".",
  "-",
];

const PointsAdjustment = () => {
  const { branch } = useBranch();

  const [adminAccessStatus, setAdminAccessStatus] = useState("checking");
  const [adminAccessMessage, setAdminAccessMessage] = useState("");

  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchingCustomers, setSearchingCustomers] = useState(false);

  const [currentPoints, setCurrentPoints] = useState(0);
  const [loadingPoints, setLoadingPoints] = useState(false);

  const [adjustmentType, setAdjustmentType] = useState("add");
  const [pointsAmount, setPointsAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [appModal, setAppModal] = useState({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
    confirmText: "Entendido",
    cancelText: "Cancelar",
    showCancel: false,
    loading: false,
    onConfirm: null,
    onCancel: null,
  });

  const numericPoints = Number(pointsAmount || 0);

  const closeAppModal = () => {
    setAppModal((prev) => ({
      ...prev,
      isOpen: false,
      loading: false,
      onConfirm: null,
      onCancel: null,
    }));
  };

  const showAppAlert = ({
    type = "info",
    title = "Aviso",
    message = "",
    confirmText = "Entendido",
  }) => {
    setAppModal({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText: "Cancelar",
      showCancel: false,
      loading: false,
      onConfirm: closeAppModal,
      onCancel: closeAppModal,
    });
  };

  const selectedReason = useMemo(() => {
    return ADJUSTMENT_REASON_OPTIONS.find(
      (reason) => reason.value === adjustmentReason
    );
  }, [adjustmentReason]);

  const isOtherReason = adjustmentReason === "other";

  const finalNotes = useMemo(() => {
    if (!adjustmentReason) return "";

    if (isOtherReason) {
      return String(notes || "").trim();
    }

    return selectedReason?.label || "";
  }, [adjustmentReason, isOtherReason, notes, selectedReason]);

  const normalizedFinalNotes = useMemo(() => {
    return String(finalNotes || "")
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
  }, [finalNotes]);

  const isGenericNote = useMemo(() => {
    if (!isOtherReason) return false;

    return BLOCKED_GENERIC_NOTES.includes(normalizedFinalNotes);
  }, [isOtherReason, normalizedFinalNotes]);

  const signedPoints = useMemo(() => {
    if (!numericPoints) return 0;
    return adjustmentType === "add" ? numericPoints : numericPoints * -1;
  }, [numericPoints, adjustmentType]);

  const newBalance = useMemo(() => {
    return Number(currentPoints || 0) + signedPoints;
  }, [currentPoints, signedPoints]);

  const canSubmit =
    adminAccessStatus === "allowed" &&
    !!selectedCustomer?.id &&
    selectedCustomer.status !== false &&
    numericPoints > 0 &&
    !!adjustmentReason &&
    normalizedFinalNotes.length >= 5 &&
    !isGenericNote &&
    !saving &&
    !(adjustmentType === "subtract" && newBalance < 0);

  const normalizeSearch = (value) => {
    return String(value || "").trim();
  };

  const getCustomerSortName = (customer) => {
    return String(
      customer.name || customer.phone || customer.email || "SIN NOMBRE"
    ).trim();
  };

  const sortCustomersByName = (customersList = []) => {
    return [...customersList].sort((a, b) => {
      return getCustomerSortName(a).localeCompare(getCustomerSortName(b), "es", {
        sensitivity: "base",
        numeric: true,
      });
    });
  };

  const getRoleName = (profile) => {
    if (Array.isArray(profile?.roles)) {
      return profile.roles[0]?.name || "";
    }

    return profile?.roles?.name || "";
  };

  const checkAdminAccess = async () => {
    try {
      setAdminAccessStatus("checking");
      setAdminAccessMessage("");

      const wasAuthorizedFromModal =
        sessionStorage.getItem(ADMIN_AUTH_STORAGE_KEY) === "true";

      if (wasAuthorizedFromModal) {
        setAdminAccessStatus("allowed");
        return;
      }

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser?.id) {
        setAdminAccessStatus("denied");
        setAdminAccessMessage("No se pudo validar la sesión del usuario.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select(`
          id,
          status,
          roles (
            name
          )
        `)
        .eq("id", authUser.id)
        .maybeSingle();

      if (profileError || !profile) {
        setAdminAccessStatus("denied");
        setAdminAccessMessage("No se encontró el perfil del usuario actual.");
        return;
      }

      const roleName = String(getRoleName(profile) || "").toLowerCase();
      const isAdmin = profile.status !== false && roleName === "admin";

      if (!isAdmin) {
        setAdminAccessStatus("denied");
        setAdminAccessMessage(
          "Solo un administrador puede realizar ajustes manuales de puntos."
        );
        return;
      }

      sessionStorage.setItem(ADMIN_AUTH_STORAGE_KEY, "true");
      setAdminAccessStatus("allowed");
    } catch (err) {
      console.error("Error validando acceso administrativo:", err);
      setAdminAccessStatus("denied");
      setAdminAccessMessage("No se pudo validar el acceso administrativo.");
    }
  };

  const handlePointsChange = (value) => {
    const onlyNumbers = String(value || "").replace(/\D/g, "").slice(0, 6);
    setPointsAmount(onlyNumbers);
  };

  const searchCustomers = async (term = searchTerm) => {
    const cleanSearch = normalizeSearch(term);

    try {
      setSearchingCustomers(true);

      if (cleanSearch.length < 2) {
        setCustomers([]);
        return;
      }

      const { data, error: customersError } = await supabase
        .from("customers")
        .select("id, name, phone, email, status, is_points_customer")
        .eq("status", true)
        .eq("is_points_customer", true)
        .or(
          `name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%`
        )
        .order("name", { ascending: true, nullsFirst: false })
        .limit(10);

      if (customersError) throw customersError;

      const results = sortCustomersByName(data || []);
      setCustomers(results);
    } catch (err) {
      console.error("Error buscando clientes:", err);

      showAppAlert({
        type: "danger",
        title: "No se pudieron buscar clientes",
        message: "Ocurrió un error al buscar los clientes.",
        confirmText: "Entendido",
      });

      setCustomers([]);
    } finally {
      setSearchingCustomers(false);
    }
  };

  const loadCustomerPoints = async (customerId) => {
    if (!customerId) {
      setCurrentPoints(0);
      return;
    }

    try {
      setLoadingPoints(true);

      const { data, error: pointsError } = await supabase
        .from("customer_points")
        .select("points")
        .eq("customer_id", customerId);

      if (pointsError) throw pointsError;

      const totalPoints = (data || []).reduce((sum, movement) => {
        return sum + Number(movement.points || 0);
      }, 0);

      setCurrentPoints(totalPoints);
    } catch (err) {
      console.error("Error cargando puntos del cliente:", err);

      showAppAlert({
        type: "danger",
        title: "No se pudieron cargar los puntos",
        message: "No se pudieron cargar los puntos actuales del cliente.",
        confirmText: "Entendido",
      });

      setCurrentPoints(0);
    } finally {
      setLoadingPoints(false);
    }
  };

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (adminAccessStatus !== "allowed") return;

    const delaySearch = setTimeout(() => {
      searchCustomers(searchTerm);
    }, 300);

    return () => clearTimeout(delaySearch);
  }, [searchTerm, adminAccessStatus]);

  useEffect(() => {
    if (adminAccessStatus !== "allowed") return;
    if (!selectedCustomer?.id) return;

    const pointsChannel = supabase
      .channel(`points-adjustment-${selectedCustomer.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customer_points",
          filter: `customer_id=eq.${selectedCustomer.id}`,
        },
        () => {
          loadCustomerPoints(selectedCustomer.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(pointsChannel);
    };
  }, [selectedCustomer?.id, adminAccessStatus]);

  const handleSelectCustomer = async (customer) => {
    if (customer.status === false) {
      showAppAlert({
        type: "warning",
        title: "Cliente inactivo",
        message:
          "No se pueden realizar ajustes de puntos a clientes inactivos. Activa el cliente antes de continuar.",
        confirmText: "Entendido",
      });
      return;
    }

    setSelectedCustomer(customer);
    setSearchTerm("");
    setCustomers([]);
    setPointsAmount("");
    setAdjustmentReason("");
    setNotes("");
    setAdjustmentType("add");

    await loadCustomerPoints(customer.id);
  };

  const handleClearCustomer = () => {
    setSelectedCustomer(null);
    setSearchTerm("");
    setCustomers([]);
    setCurrentPoints(0);
    setPointsAmount("");
    setAdjustmentReason("");
    setNotes("");
    setAdjustmentType("add");
  };

  const handleReasonChange = (value) => {
    setAdjustmentReason(value);
    setNotes("");
  };

  const handleOpenConfirmModal = (event) => {
    event.preventDefault();

    if (adminAccessStatus !== "allowed") {
      showAppAlert({
        type: "warning",
        title: "Acceso restringido",
        message: "Solo un administrador puede realizar ajustes manuales.",
        confirmText: "Entendido",
      });
      return;
    }

    if (!selectedCustomer?.id) {
      showAppAlert({
        type: "warning",
        title: "Selecciona un cliente",
        message: "Selecciona un cliente antes de continuar.",
        confirmText: "Entendido",
      });
      return;
    }

    if (selectedCustomer.status === false) {
      showAppAlert({
        type: "warning",
        title: "Cliente inactivo",
        message:
          "No se pueden realizar ajustes de puntos a clientes inactivos. Activa el cliente antes de continuar.",
        confirmText: "Entendido",
      });
      return;
    }

    if (numericPoints <= 0) {
      showAppAlert({
        type: "warning",
        title: "Puntos inválidos",
        message: "Ingresa una cantidad de puntos mayor a 0.",
        confirmText: "Entendido",
      });
      return;
    }

    if (adjustmentType === "subtract" && newBalance < 0) {
      showAppAlert({
        type: "warning",
        title: "Saldo insuficiente",
        message: "No puedes descontar más puntos de los que tiene el cliente.",
        confirmText: "Entendido",
      });
      return;
    }

    if (!adjustmentReason) {
      showAppAlert({
        type: "warning",
        title: "Motivo requerido",
        message: "Selecciona el motivo del ajuste.",
        confirmText: "Entendido",
      });
      return;
    }

    if (normalizedFinalNotes.length < 5) {
      showAppAlert({
        type: "warning",
        title: "Motivo incompleto",
        message: "Ingresa un motivo del ajuste de al menos 5 caracteres.",
        confirmText: "Entendido",
      });
      return;
    }

    if (isGenericNote) {
      showAppAlert({
        type: "warning",
        title: "Motivo demasiado genérico",
        message:
          "El motivo es demasiado genérico. Escribe un motivo más específico para auditoría.",
        confirmText: "Entendido",
      });
      return;
    }

    setIsConfirmModalOpen(true);
  };

  const handleConfirmAdjustment = async () => {
    try {
      if (adminAccessStatus !== "allowed") {
        setIsConfirmModalOpen(false);

        showAppAlert({
          type: "warning",
          title: "Acceso restringido",
          message: "Solo un administrador puede realizar ajustes manuales.",
          confirmText: "Entendido",
        });
        return;
      }

      if (!selectedCustomer?.id) {
        setIsConfirmModalOpen(false);

        showAppAlert({
          type: "warning",
          title: "Selecciona un cliente",
          message: "Selecciona un cliente antes de guardar el ajuste.",
          confirmText: "Entendido",
        });
        return;
      }

      if (selectedCustomer.status === false) {
        setIsConfirmModalOpen(false);

        showAppAlert({
          type: "warning",
          title: "Cliente inactivo",
          message:
            "No se pueden guardar ajustes de puntos para clientes inactivos.",
          confirmText: "Entendido",
        });
        return;
      }

      setSaving(true);

      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      const payload = {
        id: crypto.randomUUID(),
        customer_id: selectedCustomer.id,
        points: signedPoints,
        movement_type: adjustmentType === "add" ? "earn" : "redeem",
        source: "manual",
        related_sale_id: null,
        reward_id: null,
        user_id: authUser?.id || null,
        branch_id: branch?.id || null,
        notes: normalizedFinalNotes,
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from("customer_points")
        .insert([payload]);

      if (insertError) throw insertError;

      await loadCustomerPoints(selectedCustomer.id);

      const message = `Ajuste realizado correctamente. ${
        selectedCustomer.name || "EL CLIENTE"
      } ${signedPoints > 0 ? "recibió" : "usó"} ${Math.abs(
        signedPoints
      )} punto${Math.abs(signedPoints) !== 1 ? "s" : ""}.`;

      setPointsAmount("");
      setAdjustmentReason("");
      setNotes("");
      setAdjustmentType("add");
      setIsConfirmModalOpen(false);
      setCustomers([]);

      showAppAlert({
        type: "success",
        title: "Ajuste registrado",
        message,
        confirmText: "Aceptar",
      });
    } catch (err) {
      console.error("Error guardando ajuste de puntos:", err);

      showAppAlert({
        type: "danger",
        title: "No se pudo registrar",
        message: err?.message || "No se pudo registrar el ajuste de puntos.",
        confirmText: "Entendido",
      });
    } finally {
      setSaving(false);
    }
  };

  if (adminAccessStatus === "checking") {
    return (
      <div className={styles.content}>
        <div className={styles.header}>
          <div>
            <h1>AJUSTE DE PUNTOS</h1>
            <p>Validando acceso administrativo...</p>
          </div>
        </div>

        <div className={styles.accessCard}>
          <h2>Validando acceso</h2>
          <p>Espera un momento mientras se verifica tu rol de usuario.</p>
        </div>
      </div>
    );
  }

  if (adminAccessStatus === "denied") {
    return (
      <div className={styles.content}>
        <div className={styles.header}>
          <div>
            <h1>AJUSTE DE PUNTOS</h1>
            <p>
              Agrega o descuenta puntos manualmente por migración, correcciones o
              ajustes autorizados.
            </p>
          </div>
        </div>

        <div className={styles.accessDeniedCard}>
          <h2>Acceso restringido</h2>
          <p>{adminAccessMessage}</p>
          <p>
            Esta página permite modificar puntos manualmente y solo debe ser
            utilizada por administradores.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.content}>
      <div className={styles.header}>
        <div>
          <h1>AJUSTE DE PUNTOS</h1>
          <p>
            Agrega o descuenta puntos manualmente por migración, correcciones o
            ajustes autorizados.
          </p>
        </div>
      </div>

      <div className={styles.adminNotice}>
        <div>
          <strong>Uso administrativo</strong>
          <p>
            Solo para migración, correcciones autorizadas o aclaraciones. Todo
            movimiento quedará registrado con usuario, sucursal y motivo.
          </p>
        </div>

        <div className={styles.branchNotice}>
          <span>Sucursal actual</span>
          <strong>{branch?.name || branch?.code || "SIN SUCURSAL"}</strong>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <section className={styles.card}>
          <h2>Buscar cliente</h2>
          <p>
            Busca por nombre, teléfono o correo. Solo se muestran clientes
            activos.
          </p>

          <div className={styles.searchRow}>
            <div className={styles.searchContainer}>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedCustomer(null);
                  setCurrentPoints(0);
                  setPointsAmount("");
                  setAdjustmentReason("");
                  setNotes("");
                  setAdjustmentType("add");
                }}
                placeholder="Buscar cliente activo..."
                className={styles.searchInput}
              />

              {searchTerm && (
                <button
                  type="button"
                  className={styles.clearSearchButton}
                  onClick={handleClearCustomer}
                >
                  ×
                </button>
              )}
            </div>

            <button
              type="button"
              className={styles.searchButton}
              onClick={() => searchCustomers(searchTerm)}
              disabled={searchingCustomers}
            >
              {searchingCustomers ? "Buscando..." : "Buscar"}
            </button>
          </div>

          {(searchingCustomers || searchTerm.trim().length >= 2) && (
            <div className={styles.resultsBox}>
              {searchingCustomers ? (
                <div className={styles.emptyState}>Buscando clientes...</div>
              ) : customers.length === 0 ? (
                <div className={styles.emptyState}>
                  No hay clientes activos para mostrar.
                </div>
              ) : (
                customers.map((customer) => (
                  <button
                    key={customer.id}
                    type="button"
                    className={`${styles.customerResult} ${
                      selectedCustomer?.id === customer.id
                        ? styles.customerSelected
                        : ""
                    }`}
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <strong>{customer.name || "SIN NOMBRE"}</strong>
                    <span>Tel: {customer.phone || "SIN TELÉFONO"}</span>
                    <span>{customer.email || "SIN CORREO"}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </section>

        <section className={styles.card}>
          <h2>Cliente seleccionado</h2>
          <p>Saldo actual de puntos.</p>

          {!selectedCustomer ? (
            <div className={styles.selectedEmpty}>
              Selecciona un cliente activo para realizar un ajuste.
            </div>
          ) : (
            <div className={styles.selectedCustomer}>
              <div>
                <h3>{selectedCustomer.name || "SIN NOMBRE"}</h3>
                <p>Teléfono: {selectedCustomer.phone || "SIN TELÉFONO"}</p>
                <p>Correo: {selectedCustomer.email || "SIN CORREO"}</p>
              </div>

              <div className={styles.pointsBox}>
                <span>PUNTOS ACTUALES</span>
                <strong>{loadingPoints ? "..." : currentPoints}</strong>
              </div>
            </div>
          )}
        </section>
      </div>

      <form className={styles.adjustmentCard} onSubmit={handleOpenConfirmModal}>
        <div className={styles.adjustmentHeader}>
          <div>
            <h2>Datos del ajuste</h2>
            <p>
              El ajuste quedará registrado en el historial de puntos con usuario,
              sucursal y motivo.
            </p>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.fieldGroup}>
            <label>Tipo de ajuste *</label>
            <select
              value={adjustmentType}
              onChange={(e) => {
                setAdjustmentType(e.target.value);
              }}
              disabled={saving}
            >
              <option value="add">Agregar puntos</option>
              <option value="subtract">Descontar puntos</option>
            </select>
          </div>

          <div className={styles.fieldGroup}>
            <label>Puntos *</label>
            <input
              type="text"
              inputMode="numeric"
              value={pointsAmount}
              onChange={(e) => handlePointsChange(e.target.value)}
              placeholder="Ej. 500"
              disabled={saving}
            />
          </div>

          <div className={styles.balancePreview}>
            <span>Nuevo saldo</span>
            <strong
              className={
                newBalance < 0 ? styles.balanceNegative : styles.balanceNormal
              }
            >
              {selectedCustomer ? newBalance : "-"}
            </strong>
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label>Motivo del ajuste *</label>
          <select
            value={adjustmentReason}
            onChange={(e) => handleReasonChange(e.target.value)}
            disabled={saving}
          >
            <option value="">Selecciona un motivo</option>
            {ADJUSTMENT_REASON_OPTIONS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </div>

        {isOtherReason && (
          <div className={styles.fieldGroup}>
            <label>Describe el motivo *</label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value.toUpperCase());
              }}
              placeholder="Ej. ACLARACIÓN AUTORIZADA POR DIFERENCIA EN PUNTOS DEL CLIENTE"
              rows={4}
              disabled={saving}
            />

            <span className={styles.helpText}>
              Evita motivos genéricos como PRUEBA, TEST, OK o AJUSTE. Este
              detalle aparecerá en el historial.
            </span>
          </div>
        )}

        {!isOtherReason && adjustmentReason && (
          <div className={styles.helpText}>
            Motivo seleccionado: {normalizedFinalNotes}
          </div>
        )}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.clearButton}
            onClick={() => {
              setPointsAmount("");
              setAdjustmentReason("");
              setNotes("");
              setAdjustmentType("add");
            }}
            disabled={saving}
          >
            Limpiar ajuste
          </button>

          <button
            type="submit"
            className={styles.saveButton}
            disabled={!canSubmit}
          >
            Revisar ajuste
          </button>
        </div>
      </form>

      <PointsAdjustmentConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmAdjustment}
        saving={saving}
        customer={selectedCustomer}
        adjustmentType={adjustmentType}
        currentPoints={currentPoints}
        pointsAmount={numericPoints}
        signedPoints={signedPoints}
        newBalance={newBalance}
        notes={normalizedFinalNotes}
        branch={branch}
      />

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

export default PointsAdjustment;