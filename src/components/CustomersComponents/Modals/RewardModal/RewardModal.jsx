import React, { useEffect, useMemo, useState } from "react";
import styles from "./RewardModal.module.css";
import { supabase } from "../../../../lib/supabaseClient";

const emptyForm = {
  name: "",
  description: "",
  points_required: "",
  is_active: true,
};

const RewardModal = ({ isOpen, onClose, onSaved, rewardToEdit }) => {
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});

  const isEditing = useMemo(() => !!rewardToEdit?.id, [rewardToEdit]);

  useEffect(() => {
    if (!isOpen) return;

    if (rewardToEdit) {
      setFormData({
        name: rewardToEdit.name || "",
        description: rewardToEdit.description || "",
        points_required: String(rewardToEdit.points_required || ""),
        is_active: rewardToEdit.is_active !== false,
      });
    } else {
      setFormData(emptyForm);
    }

    setError("");
    setFieldErrors({});
    setTouchedFields({});
    setSaving(false);
  }, [isOpen, rewardToEdit]);

  const normalizeUpperText = (value) => {
    return String(value || "")
      .replace(/\s+/g, " ")
      .toUpperCase();
  };

  const normalizePoints = (value) => {
    return String(value || "").replace(/\D/g, "").slice(0, 6);
  };

  const validateValues = (values) => {
    const errors = {};

    const cleanName = String(values.name || "").trim();
    const points = Number(values.points_required || 0);

    if (!cleanName) {
      errors.name = "Ingresa el nombre de la recompensa.";
    } else if (cleanName.length < 3) {
      errors.name = "El nombre debe tener al menos 3 caracteres.";
    }

    if (!String(values.points_required || "").trim()) {
      errors.points_required = "Ingresa los puntos requeridos.";
    } else if (!Number.isInteger(points) || points <= 0) {
      errors.points_required = "Los puntos deben ser mayores a 0.";
    }

    return errors;
  };

  const handleChange = (field, value) => {
    let finalValue = value;

    if (field === "name" || field === "description") {
      finalValue = normalizeUpperText(value);
    }

    if (field === "points_required") {
      finalValue = normalizePoints(value);
    }

    const nextFormData = {
      ...formData,
      [field]: finalValue,
    };

    setFormData(nextFormData);
    setFieldErrors(validateValues(nextFormData));

    if (error) {
      setError("");
    }
  };

  const handleBlur = (field) => {
    setTouchedFields((prev) => ({
      ...prev,
      [field]: true,
    }));

    setFieldErrors(validateValues(formData));
  };

  const getFieldClassName = (field) => {
    const wasTouched = touchedFields[field];

    if (!wasTouched) return "";

    if (fieldErrors[field]) {
      return styles.inputInvalid;
    }

    const value = String(formData[field] ?? "").trim();

    if (value) {
      return styles.inputValid;
    }

    return "";
  };

  const checkDuplicateRewardName = async (name) => {
    let query = supabase
      .from("rewards")
      .select("id, name")
      .eq("name", name)
      .limit(1);

    if (isEditing && rewardToEdit?.id) {
      query = query.neq("id", rewardToEdit.id);
    }

    const { data, error: duplicateError } = await query;

    if (duplicateError) throw duplicateError;

    return data?.[0] || null;
  };

  const currentErrors = validateValues(formData);

  const canSave =
    String(formData.name || "").trim().length >= 3 &&
    Number(formData.points_required || 0) > 0 &&
    Object.keys(currentErrors).length === 0 &&
    !saving;

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedData = {
      name: normalizeUpperText(formData.name).trim(),
      description: normalizeUpperText(formData.description).trim(),
      points_required: Number(formData.points_required || 0),
      is_active: formData.is_active,
    };

    const errors = validateValues(normalizedData);

    setFieldErrors(errors);
    setTouchedFields({
      name: true,
      points_required: true,
    });

    if (Object.keys(errors).length > 0) {
      setError("Corrige los campos marcados antes de guardar.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const duplicateReward = await checkDuplicateRewardName(
        normalizedData.name
      );

      if (duplicateReward) {
        setError("Ya existe una recompensa con ese nombre.");
        setSaving(false);
        return;
      }

      const payload = {
        name: normalizedData.name,
        description: normalizedData.description || null,
        points_required: normalizedData.points_required,
        is_active: normalizedData.is_active,
        updated_at: new Date().toISOString(),
      };

      if (isEditing) {
        const { error: updateError } = await supabase
          .from("rewards")
          .update(payload)
          .eq("id", rewardToEdit.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("rewards").insert([
          {
            id: crypto.randomUUID(),
            ...payload,
            created_at: new Date().toISOString(),
          },
        ]);

        if (insertError) throw insertError;
      }

      await onSaved?.();
      onClose();
    } catch (err) {
      console.error("Error guardando recompensa:", err);

      const errorMessage = String(err?.message || "");

      if (errorMessage.includes("duplicate key")) {
        setError("Ya existe una recompensa con información duplicada.");
      } else {
        setError(err?.message || "No se pudo guardar la recompensa.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{isEditing ? "Editar recompensa" : "Nueva recompensa"}</h2>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={saving}
          >
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label>Nombre de la recompensa *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              disabled={saving}
              autoFocus
              className={getFieldClassName("name")}
            />

            {touchedFields.name && fieldErrors.name && (
              <span className={styles.fieldError}>{fieldErrors.name}</span>
            )}
          </div>

          <div className={styles.fieldGroup}>
            <label>Puntos requeridos *</label>
            <input
              type="text"
              inputMode="numeric"
              value={formData.points_required}
              onChange={(e) =>
                handleChange("points_required", e.target.value)
              }
              onBlur={() => handleBlur("points_required")}
              disabled={saving}
              className={getFieldClassName("points_required")}
            />

            {touchedFields.points_required &&
              fieldErrors.points_required && (
                <span className={styles.fieldError}>
                  {fieldErrors.points_required}
                </span>
              )}
          </div>

          <div className={styles.fieldGroup}>
            <label>Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              disabled={saving}
              rows={4}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label>Estado</label>
            <select
              value={formData.is_active ? "active" : "inactive"}
              onChange={(e) =>
                handleChange("is_active", e.target.value === "active")
              }
              disabled={saving}
            >
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
            </select>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className={styles.saveButton}
              disabled={!canSave}
              title={
                !canSave && !saving
                  ? "Completa nombre y puntos correctamente."
                  : ""
              }
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RewardModal;