import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/Footer";
import NavbarProducts from "../../components/ProductsComponents/NavbarProducts/NavbarProducts";
import ProtectedRoute from "../../components/ProtectedRoute/ProtectedRoute";

import ProductsList from "../../components/ProductsComponents/PageProducts/ProductsList/ProductsList";
import ProductsNew from "../../components/ProductsComponents/PageProducts/ProductsNew/ProductsNew";
import ProductsModify from "../../components/ProductsComponents/PageProducts/ProductsModify/ProductsModify";
import ProductsDelete from "../../components/ProductsComponents/PageProducts/ProductsDelete/ProductsDelete";
import ProductsPromotions from "../../components/ProductsComponents/PageProducts/ProductsPromotions/ProductsPromotions";
import ProductsImports from "../../components/ProductsComponents/PageProducts/ProductsImport/ProductsImports";
import Departments from "../../components/ProductsComponents/PageProducts/Departments/Departments";

import styles from "./Products.module.css";

const Products = () => {
  return (
    <div className={styles.container}>
      <Navbar />

      <NavbarProducts />

      <div className={styles.pageContent}>
        <Routes>
          <Route path="/" element={<ProductsList />} />

          <Route
            path="/nuevo"
            element={
              <ProtectedRoute
                routePath="/products/nuevo"
                routeLabel="Nuevo"
                action="products_new_access"
              >
                <ProductsNew />
              </ProtectedRoute>
            }
          />

          <Route path="/modificar" element={<ProductsModify />} />

          <Route
            path="/eliminar"
            element={
              <ProtectedRoute
                routePath="/products/eliminar"
                routeLabel="Eliminar"
                action="products_delete_access"
              >
                <ProductsDelete />
              </ProtectedRoute>
            }
          />

          <Route
            path="/promociones"
            element={
              <ProtectedRoute
                routePath="/products/promociones"
                routeLabel="Promociones y Kits"
                action="products_promotions_access"
              >
                <ProductsPromotions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/importar"
            element={
              <ProtectedRoute
                routePath="/products/importar"
                routeLabel="Importar"
                action="products_import_access"
              >
                <ProductsImports />
              </ProtectedRoute>
            }
          />

          <Route
            path="/departamentos"
            element={
              <ProtectedRoute
                routePath="/products/departamentos"
                routeLabel="Departamentos"
                action="products_departments_access"
              >
                <Departments />
              </ProtectedRoute>
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
