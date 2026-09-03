import React from "react";
import styles from "../components/InventoryComponents.module.css";

export const ITEMS_PER_PAGE = 25;

export const getStatusBadge = (status, label) => {
  let badgeClass = styles.badgeNeutral;

  switch (status) {
    case "exhausted":
      badgeClass = styles.badgeExhausted;
      break;
    case "low":
      badgeClass = styles.badgeLow;
      break;
    case "optimal":
      badgeClass = styles.badgeOptimal;
      break;
    case "excess":
      badgeClass = styles.badgeExcess;
      break;
    case "not_stocked":
    case "no_control":
    default:
      badgeClass = styles.badgeNeutral;
      break;
  }

  return <span className={`${styles.kpiAlertBadge} ${badgeClass}`}>{label}</span>;
};
