import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarProducts from "../../components/ProductsComponents/NavbarProducts/NavbarProducts";
import ProtectedRoute from "../../components/ProtectedRoute/ProtectedRoute";
import { PROTECTED_PRODUCT_SECTIONS } from "../../config/adminProtectedSections";

import ProductsList from "../../components/ProductsComponents/PageProducts/ProductsList/ProductsList";
import ProductsNew from "../../components/ProductsComponents/PageProducts/ProductsNew/ProductsNew";
import ProductsModify from "../../components/ProductsComponents/PageProducts/ProductsModify/ProductsModify";
import ProductsDelete from "../../components/ProductsComponents/PageProducts/ProductsDelete/ProductsDelete";
import ProductsPromotions from "../../components/ProductsComponents/PageProducts/ProductsPromotions/ProductsPromotions";
import ProductsImports from "../../components/ProductsComponents/PageProducts/ProductsImport/ProductsImports";
import Departments from "../../components/ProductsComponents/PageProducts/Departments/Departments";

import styles from "./Products.module.css";

const PROTECTED_PRODUCT_COMPONENTS = {
  "/products/nuevo": ProductsNew,
  "/products/eliminar": ProductsDelete,
  "/products/promociones": ProductsPromotions,
  "/products/importar": ProductsImports,
  "/products/departamentos": Departments,
};

const Products = () => {
  const [authorizedRoutes, setAuthorizedRoutes] = useState(() => new Set());

  const handleAuthorizedRoute = (routePath) => {
    setAuthorizedRoutes((prev) => {
      const next = new Set(prev);
      next.add(routePath);
      return next;
    });
  };

  return (
    <div className={styles.container}>
      <Navbar />

      <NavbarProducts onProtectedAccessAuthorized={handleAuthorizedRoute} />

      <div className={styles.pageContent}>
        <Routes>
          <Route path="/" element={<ProductsList />} />

          <Route path="/modificar" element={<ProductsModify />} />

          {PROTECTED_PRODUCT_SECTIONS.map(
            ({ routePath, routeLabel, action }) => {
              const Component = PROTECTED_PRODUCT_COMPONENTS[routePath];

              return (
                <Route
                  key={routePath}
                  path={routePath.replace("/products/", "")}
                  element={
                    <ProtectedRoute
                      routePath={routePath}
                      routeLabel={routeLabel}
                      action={action}
                      authorizedRoutes={authorizedRoutes}
                      onAuthorizedRoute={handleAuthorizedRoute}
                    >
                      <Component />
                    </ProtectedRoute>
                  }
                />
              );
            }
          )}

          <Route path="*" element={<Navigate to="/products" replace />} />
        </Routes>
      </div>

      <Footer />
    </div>
  );
};

export default Products;
