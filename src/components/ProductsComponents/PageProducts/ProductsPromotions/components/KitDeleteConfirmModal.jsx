import { useState } from "react";
import AppModal from "../../../../AppModal/AppModal";
import {
  KIT_DELETE_CONFIRMATION_WORD,
  isDeleteConfirmationValid,
} from "../services/kitDeleteConfirmationCalculationService";
import styles from "../ProductsPromotions.module.css";

/**
 * Confirmacion de borrado de un kit que exige escribir la palabra de control.
 * Se monta con `key` por kit para reiniciar el texto capturado.
 */
const KitDeleteConfirmModal = ({ kit, onConfirm, onCancel }) => {
  const [confirmationText, setConfirmationText] = useState("");
  const isValid = isDeleteConfirmationValid(confirmationText);

  if (!kit) return null;

  return (
    <AppModal
      isOpen
      type="danger"
      title="Eliminar kit"
      message={`¿Deseas eliminar del POS el kit "${kit.products?.name || "KIT"}"?\n\nEl registro se conservará en la base de datos.`}
      confirmText="Sí, eliminar"
      cancelText="No, regresar"
      showCancel
      confirmDisabled={!isValid}
      onConfirm={() => {
        if (isValid) onConfirm(kit);
      }}
      onCancel={onCancel}
      onClose={onCancel}
    >
      <label className={styles.renewField}>
        Escribe {KIT_DELETE_CONFIRMATION_WORD} para confirmar
        <input
          type="text"
          className={styles.input}
          value={confirmationText}
          onChange={(e) => setConfirmationText(e.target.value)}
          autoComplete="off"
        />
      </label>
    </AppModal>
  );
};

export default KitDeleteConfirmModal;
