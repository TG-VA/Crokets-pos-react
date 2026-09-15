import { IconImg } from "./primitives";
import { fmt, fmtDate, fmtTime } from "../utils/cashCutFormatters";

import styles from "../CashCut.module.css";

import MoneyBillWaveIcon from "../../../assets/icons/money-bill-wave-solid-full.svg";
import CreditCardIcon from "../../../assets/icons/credit-card-solid-full.svg";
import BuildingColumnsIcon from "../../../assets/icons/building-columns-solid-full.svg";
import CoinsIcon from "../../../assets/icons/coins-solid-full.svg";

const HeroStatLabel = ({ icon, label }) => (
  <span className={styles.heroStatLabel}>
    <IconImg src={icon} />
    <span>{label}</span>
  </span>
);

const CutHero = ({
  isHistoricalView,
  ventasNetas,
  now,
  cutCreatedAt,
  session,
  branchName,
  username,
  ventasEfectivoNeto,
  ventasTerminalNeto,
  ventasTransferenciaNeto,
  expectedDisplay,
}) => (
  <div className={styles.heroCard}>
    <div className={styles.heroLeft}>
      <span className={styles.heroLabel}>
        {isHistoricalView ? "VENTAS NETAS DEL CORTE" : "VENTAS NETAS DEL TURNO"}
      </span>

      <span className={styles.heroAmount}>{fmt(ventasNetas)}</span>

      <span className={styles.heroDate}>
        {isHistoricalView
          ? `${fmtDate(cutCreatedAt || now)} · ${fmtTime(cutCreatedAt || now)}`
          : `${fmtDate(now)} · ${
              session?.opened_at ? fmtTime(session.opened_at) : "--:--"
            } - ${fmtTime(now)}`}
      </span>

      <div className={styles.sessionInfoHero}>
        <div className={styles.sessionRow}>
          <span className={styles.sessionLabel}>Sucursal:</span>
          <span className={styles.sessionValue}>
            {branchName ? branchName.toUpperCase() : "—"}
          </span>
        </div>

        <div className={styles.sessionRow}>
          <span className={styles.sessionLabel}>Cajero:</span>
          <span className={styles.sessionValue}>{username || "—"}</span>
        </div>

        <div className={styles.sessionRow}>
          <span className={styles.sessionLabel}>Turno:</span>
          <span className={styles.sessionValue}>
            {session?.id ? `#${session.id.slice(0, 8).toUpperCase()}` : "—"}
          </span>
        </div>
      </div>
    </div>

    <div className={styles.heroStats}>
      <div className={styles.heroStat}>
        <HeroStatLabel icon={MoneyBillWaveIcon} label="Efectivo neto" />
        <span className={styles.heroStatValue}>{fmt(ventasEfectivoNeto)}</span>
      </div>

      <div className={styles.heroStat}>
        <HeroStatLabel icon={CreditCardIcon} label="Terminal neta" />
        <span className={styles.heroStatValue}>{fmt(ventasTerminalNeto)}</span>
      </div>

      <div className={styles.heroStat}>
        <HeroStatLabel icon={BuildingColumnsIcon} label="Transferencia neta" />
        <span className={styles.heroStatValue}>
          {fmt(ventasTransferenciaNeto)}
        </span>
      </div>

      <div className={styles.heroStat}>
        <HeroStatLabel icon={CoinsIcon} label="Total en caja" />
        <span className={styles.heroStatValue}>{fmt(expectedDisplay)}</span>
      </div>
    </div>
  </div>
);

export default CutHero;
