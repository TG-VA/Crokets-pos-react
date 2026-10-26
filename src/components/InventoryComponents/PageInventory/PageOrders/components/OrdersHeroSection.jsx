import styles from "../PageOrders.module.css";
import ReceiptIcon from "../../../../../assets/icons/receipt-solid-full.svg";
import ClockIcon from "../../../../../assets/icons/clock-solid-full.svg";
import BoxesIcon from "../../../../../assets/icons/boxes-stacked-solid-full.svg";
import WarningIcon from "../../../../../assets/icons/triangle-exclamation-solid-full.svg";

const OrdersHeroSection = ({ summary }) => {
  const metrics = [
    {
      id: "pending",
      label: "Pedidos pendientes",
      value: summary.pendingOrders,
      icon: ClockIcon,
    },
    {
      id: "units",
      label: "Unidades por recibir",
      value: summary.pendingUnits,
      icon: BoxesIcon,
    },
    {
      id: "differences",
      label: "Con diferencia",
      value: summary.withDifference,
      icon: WarningIcon,
    },
    {
      id: "total",
      label: "Pedidos históricos",
      value: summary.totalOrders,
      icon: ReceiptIcon,
    },
  ];

  return (
    <section className={styles.hero}>
      <div className={styles.heroHeading}>
        <p className={styles.eyebrow}>Inventario</p>
        <h1 className={styles.title}>Pedidos de abastecimiento</h1>
        <p className={styles.description}>
          Control de pedidos de abastecimiento entre sucursales y recepción de
          mercancía.
        </p>
      </div>

      <div className={styles.heroStats}>
        {metrics.map((metric) => (
          <article key={metric.id} className={styles.metricCard}>
            <img
              src={metric.icon}
              alt=""
              aria-hidden="true"
              className={styles.metricIcon}
            />
            <span className={styles.metricLabel}>{metric.label}</span>
            <strong className={styles.metricValue}>{metric.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
};

export default OrdersHeroSection;
