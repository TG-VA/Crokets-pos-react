import styles from "../SettingsPrinters.module.css";
import ScopeBadge from "../../components/ScopeBadge";
import { TICKET_TEMPLATE_LIMITS } from "../../../../../services/ticketCustomizationService";
import checkIcon from "../../../../../assets/icons/circle-check-solid-full.svg";
import warningIcon from "../../../../../assets/icons/triangle-exclamation-solid-full.svg";

const TEMPLATE_TEXT_FIELDS = [
  {
    id: "headerSlogan",
    label: "Eslogan de cabecera",
    limit: TICKET_TEMPLATE_LIMITS.headerSlogan,
  },
  {
    id: "fiscalInfo",
    label: "Información fiscal / RFC",
    limit: TICKET_TEMPLATE_LIMITS.fiscalInfo,
  },
  {
    id: "footerLine1",
    label: "Línea 1 de agradecimiento",
    limit: TICKET_TEMPLATE_LIMITS.footerLine1,
  },
  {
    id: "footerLine2",
    label: "Línea 2 de promoción / citas",
    limit: TICKET_TEMPLATE_LIMITS.footerLine2,
  },
  {
    id: "footerPhone",
    label: "Teléfono / WhatsApp de atención",
    limit: TICKET_TEMPLATE_LIMITS.footerPhone,
  },
];

const CharacterCounter = ({ length, limit }) => (
  <span className={styles.charCounter} aria-hidden="true">
    {`${length} / ${limit}`}
  </span>
);

const TicketContentCard = ({
  template = {},
  handleTemplateChange,
  handleToggleChange,
  handleResetTemplate,
  handleSaveTemplate,
  savingTemplate = false,
  templateFeedback,
}) => (
  <article className={styles.card}>
    <div className={styles.cardTitleRow}>
      <h2 className={styles.cardTitle}>Plantilla comercial del ticket</h2>
      <ScopeBadge scope="branch" />
    </div>
    <p className={styles.cardDescription}>
      Personaliza encabezado, pie de página y políticas. Se guarda por sucursal.
      Deja un campo vacío para quitar esa línea del ticket.
    </p>

    <div className={styles.formGrid}>
      {TEMPLATE_TEXT_FIELDS.map((field) => {
        const value = template[field.id] || "";
        return (
          <div key={field.id}>
            <label htmlFor={field.id} className={styles.label}>
              {field.label}
            </label>
            <div className={styles.fieldWithCounter}>
              <input
                id={field.id}
                type="text"
                className={styles.input}
                maxLength={field.limit}
                value={value}
                onChange={(e) => handleTemplateChange(field.id, e.target.value)}
              />
              <CharacterCounter length={value.length} limit={field.limit} />
            </div>
          </div>
        );
      })}
      <div className={styles.spanFull}>
        <label htmlFor="returnPolicy" className={styles.label}>
          Política de cambios y devoluciones
        </label>
        <div className={styles.fieldWithCounter}>
          <textarea
            id="returnPolicy"
            className={styles.textarea}
            rows={4}
            maxLength={TICKET_TEMPLATE_LIMITS.returnPolicy}
            value={template.returnPolicy || ""}
            onChange={(e) =>
              handleTemplateChange("returnPolicy", e.target.value)
            }
          />
          <CharacterCounter
            length={(template.returnPolicy || "").length}
            limit={TICKET_TEMPLATE_LIMITS.returnPolicy}
          />
        </div>
      </div>
    </div>

    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Elementos a mostrar</legend>
      <div className={styles.checkboxGrid}>
        <label className={styles.checkboxCard}>
          <input
            type="checkbox"
            className={styles.checkboxInput}
            checked={Boolean(template.showCustomerPoints)}
            onChange={(e) =>
              handleToggleChange("showCustomerPoints", e.target.checked)
            }
          />
          <span className={styles.checkboxLabel}>
            Mostrar puntos de cliente
          </span>
        </label>
        <label className={styles.checkboxCard}>
          <input
            type="checkbox"
            className={styles.checkboxInput}
            checked={Boolean(template.showCashierName)}
            onChange={(e) =>
              handleToggleChange("showCashierName", e.target.checked)
            }
          />
          <span className={styles.checkboxLabel}>Mostrar nombre de cajero</span>
        </label>
        <label className={styles.checkboxCard}>
          <input
            type="checkbox"
            className={styles.checkboxInput}
            checked={Boolean(template.showSaleNotes)}
            onChange={(e) =>
              handleToggleChange("showSaleNotes", e.target.checked)
            }
          />
          <span className={styles.checkboxLabel}>Mostrar notas de venta</span>
        </label>
        <label className={styles.checkboxCard}>
          <input
            type="checkbox"
            className={styles.checkboxInput}
            checked={Boolean(template.showBranchAddress)}
            onChange={(e) =>
              handleToggleChange("showBranchAddress", e.target.checked)
            }
          />
          <span className={styles.checkboxLabel}>
            Mostrar dirección de sucursal
          </span>
        </label>
        <label className={styles.checkboxCard}>
          <input
            type="checkbox"
            className={styles.checkboxInput}
            checked={Boolean(template.showBranchPhone)}
            onChange={(e) =>
              handleToggleChange("showBranchPhone", e.target.checked)
            }
          />
          <span className={styles.checkboxLabel}>
            Mostrar teléfono de sucursal
          </span>
        </label>
      </div>
    </fieldset>

    <div className={styles.buttonRow}>
      <button
        type="button"
        className={styles.buttonSecondary}
        onClick={handleResetTemplate}
      >
        Restablecer valores predeterminados
      </button>
      <button
        type="button"
        className={styles.buttonPrimary}
        onClick={handleSaveTemplate}
        disabled={savingTemplate}
      >
        {savingTemplate ? "Guardando..." : "Guardar plantilla de sucursal"}
      </button>
    </div>

    {templateFeedback?.type === "error" ? (
      <div
        role="alert"
        className={`${styles.feedbackBanner} ${styles.feedbackError}`}
      >
        <img
          src={warningIcon}
          alt=""
          className={styles.feedbackIcon}
          aria-hidden="true"
        />
        <span>{templateFeedback.message}</span>
      </div>
    ) : null}
    {templateFeedback?.type === "success" ? (
      <div
        role="status"
        className={`${styles.feedbackBanner} ${styles.feedbackSuccess}`}
      >
        <img
          src={checkIcon}
          alt=""
          className={styles.feedbackIcon}
          aria-hidden="true"
        />
        <span>{templateFeedback.message}</span>
      </div>
    ) : null}
  </article>
);

export default TicketContentCard;
