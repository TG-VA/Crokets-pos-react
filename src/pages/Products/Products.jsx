import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarProducts from "../../components/ProductsComponents/NavbarProducts/NavbarProducts";

import ProductsList from "../../components/ProductsComponents/PageProducts/ProductsList/ProductsList";
import ProductsNew from "../../components/ProductsComponents/PageProducts/ProductsNew/ProductsNew";
import ProductsModify from "../../components/ProductsComponents/PageProducts/ProductsModify/ProductsModify";
import ProductsDelete from "../../components/ProductsComponents/PageProducts/ProductsDelete/ProductsDelete";
import ProductsPromotions from "../../components/ProductsComponents/PageProducts/ProductsPromotions/ProductsPromotions";
import ProductsImports from "../../components/ProductsComponents/PageProducts/ProductsImport/ProductsImports";
import Departments from "../../components/ProductsComponents/PageProducts/Departments/Departments";

// Importamos el componente HOC recién extraído
import ProtectedProductRoute from "../../components/ProductsComponents/ProtectedProductRoute/ProtectedProductRoute";

import styles from "./Products.module.css";

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

          <Route
            path="/nuevo"
            element={
              <ProtectedProductRoute
                routePath="/products/nuevo"
                routeLabel="Nuevo"
                action="products_new_access"
                authorizedRoutes={authorizedRoutes}
                onAuthorizedRoute={handleAuthorizedRoute}
              >
                <ProductsNew />
              </ProtectedProductRoute>
            }
          />

          <Route path="/modificar" element={<ProductsModify />} />

          <Route
            path="/eliminar"
            element={
              <ProtectedProductRoute
                routePath="/products/eliminar"
                routeLabel="Eliminar"
                action="products_delete_access"
                authorizedRoutes={authorizedRoutes}
                onAuthorizedRoute={handleAuthorizedRoute}
              >
                <ProductsDelete />
              </ProtectedProductRoute>
            }
          />

          <Route
            path="/promociones"
            element={
              <ProtectedProductRoute
                routePath="/products/promociones"
                routeLabel="Promociones y Kits"
                action="products_promotions_access"
                authorizedRoutes={authorizedRoutes}
                onAuthorizedRoute={handleAuthorizedRoute}
              >
                <ProductsPromotions />
              </ProtectedProductRoute>
            }
          />

          <Route
            path="/importar"
            element={
              <ProtectedProductRoute
                routePath="/products/importar"
                routeLabel="Importar"
                action="products_import_access"
                authorizedRoutes={authorizedRoutes}
                onAuthorizedRoute={handleAuthorizedRoute}
              >
                <ProductsImports />
              </ProtectedProductRoute>
            }
          />

          <Route
            path="/departamentos"
            element={
              <ProtectedProductRoute
                routePath="/products/departamentos"
                routeLabel="Departamentos"
                action="products_departments_access"
                authorizedRoutes={authorizedRoutes}
                onAuthorizedRoute={handleAuthorizedRoute}
              >
                <Departments />
              </ProtectedProductRoute>
            }
          />

          <Route path="*" element={<Navigate to="/products" replace />} />
        </Routes>
      </div>

      <Footer />
    </div>
  );
};

export default Products;