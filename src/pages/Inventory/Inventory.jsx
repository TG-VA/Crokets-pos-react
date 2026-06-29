import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarInventory from "../../components/InventoryComponents/NavbarInventory/NavbarInventory";

import PageAdd from "../../components/InventoryComponents/PageInventory/PageAdd/PageAdd";
import PageAdjustments from "../../components/InventoryComponents/PageInventory/PageAdjustments/PageAdjustments";
import PageReport from "../../components/InventoryComponents/PageInventory/PageReport/PageReport";
import PageMovementsReport from "../../components/InventoryComponents/PageInventory/PageMovementsReport/PageMovementsReport";
import PageKardex from "../../components/InventoryComponents/PageInventory/PageKardex/Pagekardex";
import PageTransfers from "../../components/InventoryComponents/PageInventory/PageTransfers/PageTransfers";

import styles from "./Inventory.module.css";

const Inventory = () => {
  return (
    <div className={styles.container}>
      <Navbar />
      <NavbarInventory />
      <main className={styles.pageContent}>
        <Routes>
          <Route path="/" element={<Navigate to="/inventory/agregar" replace />} />
          <Route path="/agregar" element={<PageAdd />} />
          <Route path="/ajustes" element={<PageAdjustments />} />
          <Route path="/reporte-inventario" element={<PageReport />} />
          <Route path="/reporte-movimientos" element={<PageMovementsReport />} />
          <Route path="/kardex" element={<PageKardex />} />
          <Route path="/traspasos" element={<PageTransfers />} />
          <Route path="*" element={<Navigate to="/inventory/agregar" replace />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
};

export default Inventory;
