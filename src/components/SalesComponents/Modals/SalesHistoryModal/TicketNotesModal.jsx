import { useEscapeKey } from "../../../../hooks/useEscapeKey";
import styles from "./TicketNotesModal.module.css";
import { formatDateTime } from "../../services/salesHistoryService";
import ReceiptIcon from "../../../../assets/icons/receipt-solid-full.svg";
import XmarkIcon from "../../../../assets/icons/xmark-solid-full.svg";
import UserIcon from "../../../../assets/icons/user-solid.svg";
import ClockIcon from "../../../../assets/icons/clock-solid-full.svg";

const PUBLIC_CLIENT = "PÚBLICO EN GENERAL";

const buildMetaChips = (ticket) =>
  [
    { key: "cashier", icon: UserIcon, value: ticket.cashier },
    {
      key: "client",
      icon: UserIcon,
      value: ticket.client !== PUBLIC_CLIENT ? ticket.client : "",
    },
    {
      key: "date",
      icon: ClockIcon,
      value: ticket.date ? formatDateTime(ticket.date) : "",
    },
  ].filter((chip) => chip.value);

const TicketNotesModal = ({ ticket, onClose }) => {
  const note = ticket.notes?.trim();

  useEscapeKey(onClose);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <img
              src={ReceiptIcon}
              alt=""
              className={styles.titleIcon}
              aria-hidden="true"
            />
            Notas del ticket {ticket.folio}
          </h3>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar notas"
          >
            <img
              src={XmarkIcon}
              alt=""
              className={styles.closeIcon}
              aria-hidden="true"
            />
          </button>
        </div>

        <ul className={styles.meta}>
          {buildMetaChips(ticket).map((chip) => (
            <li key={chip.key} className={styles.chip}>
              <img
                src={chip.icon}
                alt=""
                className={styles.chipIcon}
                aria-hidden="true"
              />
              {chip.value}
            </li>
          ))}
        </ul>

        <div className={styles.body}>
          {note ? (
            <p className={styles.note}>{ticket.notes}</p>
          ) : (
            <p className={styles.empty}>
              Esta venta no tiene notas registradas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketNotesModal;
