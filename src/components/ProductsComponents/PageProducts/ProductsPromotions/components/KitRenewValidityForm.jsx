import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatDateOnly, parseDateOnly } from "../services/kitDateFormatters";
import {
  getMinKitEndDate,
  getTodayInTimezone,
} from "../services/kitValidityCalculationService";
import styles from "../ProductsPromotions.module.css";

/**
 * Formulario en linea para renovar solo las fechas de vigencia de un kit.
 * La validacion y la confirmacion viven en el handler recibido.
 */
const KitRenewValidityForm = ({ kit, onSubmit, onCancel }) => {
  const [startsOn, setStartsOn] = useState(kit.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(kit.ends_on ?? "");
  // La fecha de fin no puede quedar en el pasado: el kit seguiria vencido.
  const minEndDate = parseDateOnly(
    getMinKitEndDate(startsOn, getTodayInTimezone())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(kit, { starts_on: startsOn || null, ends_on: endsOn || null });
  };

  return (
    <form className={styles.renewForm} onSubmit={handleSubmit}>
      <label className={styles.renewField}>
        Nueva fecha de inicio
        <DatePicker
          selected={parseDateOnly(startsOn)}
          onChange={(date) => setStartsOn(formatDateOnly(date))}
          selectsStart
          startDate={parseDateOnly(startsOn)}
          endDate={parseDateOnly(endsOn)}
          maxDate={parseDateOnly(endsOn)}
          dateFormat="dd/MM/yyyy"
          placeholderText="Sin límite"
          isClearable
          className={styles.input}
          wrapperClassName={styles.datePickerWrapper}
          showPopperArrow={false}
        />
      </label>
      <label className={styles.renewField}>
        Nueva fecha de fin
        <DatePicker
          selected={parseDateOnly(endsOn)}
          onChange={(date) => setEndsOn(formatDateOnly(date))}
          selectsEnd
          startDate={parseDateOnly(startsOn)}
          endDate={parseDateOnly(endsOn)}
          minDate={minEndDate}
          dateFormat="dd/MM/yyyy"
          placeholderText="Sin límite"
          isClearable
          className={styles.input}
          wrapperClassName={styles.datePickerWrapper}
          showPopperArrow={false}
        />
      </label>
      <div className={styles.renewActions}>
        <button
          type="submit"
          className={[styles.btn, styles.btnSave].join(" ")}
        >
          Guardar vigencia
        </button>
        <button
          type="button"
          className={[styles.btn, styles.btnOutlineNeutral].join(" ")}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
};

export default KitRenewValidityForm;
