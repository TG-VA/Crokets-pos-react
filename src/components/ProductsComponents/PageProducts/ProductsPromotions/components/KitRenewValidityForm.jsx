import { useState } from "react";
import styles from "../ProductsPromotions.module.css";

/**
 * Formulario en linea para renovar solo las fechas de vigencia de un kit.
 * La validacion y la confirmacion viven en el handler recibido.
 */
const KitRenewValidityForm = ({ kit, onSubmit, onCancel }) => {
  const [startsOn, setStartsOn] = useState(kit.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(kit.ends_on ?? "");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(kit, { starts_on: startsOn || null, ends_on: endsOn || null });
  };

  return (
    <form className={styles.renewForm} onSubmit={handleSubmit}>
      <label className={styles.renewField}>
        Nueva fecha de inicio
        <input
          type="date"
          className={styles.input}
          value={startsOn}
          onChange={(e) => setStartsOn(e.target.value)}
        />
      </label>
      <label className={styles.renewField}>
        Nueva fecha de fin
        <input
          type="date"
          className={styles.input}
          value={endsOn}
          onChange={(e) => setEndsOn(e.target.value)}
        />
      </label>
      <div className={styles.kitActions}>
        <button
          type="submit"
          className={[styles.btn, styles.btnSave].join(" ")}
        >
          Guardar vigencia
        </button>
        <button
          type="button"
          className={[styles.btn, styles.btnRemove].join(" ")}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default KitRenewValidityForm;
