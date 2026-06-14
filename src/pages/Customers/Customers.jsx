import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarCustomers from "../../components/CustomersComponents/NavbarCustomers/NavbarCustomers";

import CustomersList from "../../components/CustomersComponents/PageCustomers/CustomersList/CustomersList";
import RewardsRedeem from "../../components/CustomersComponents/PageCustomers/RewardsRedeem/RewardsRedeem";
import RewardsSettings from "../../components/CustomersComponents/PageCustomers/RewardsSettings/RewardsSettings";
import PointsHistory from "../../components/CustomersComponents/PageCustomers/PointsHistory/PointsHistory";
import PointsAdjustment from "../../components/CustomersComponents/PageCustomers/PointsAdjustment/PointsAdjustment";

import styles from "./Customers.module.css";

const Customers = () => {
  return (
    <div className={styles.container}>
      <Navbar />
      <NavbarCustomers />

      <div className={styles.pageContent}>
        <Routes>
          <Route index element={<CustomersList />} />
          <Route path="canje" element={<RewardsRedeem />} />
          <Route path="historial" element={<PointsHistory />} />
          <Route path="ajuste-puntos" element={<PointsAdjustment />} />
          <Route path="recompensas" element={<RewardsSettings />} />

          <Route path="*" element={<Navigate to="/customers" replace />} />
        </Routes>
      </div>

      <Footer />
    </div>
  );
};

export default Customers;