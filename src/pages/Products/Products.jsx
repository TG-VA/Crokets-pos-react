import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import NavbarProducts from '../../components/ProductsComponents/NavbarProducts/NavbarProducts';

import ProductsList from '../../components/ProductsComponents/PageProducts/ProductsList/ProductsList';
import ProductsNew from '../../components/ProductsComponents/PageProducts/ProductsNew/ProductsNew';
import ProductsModify from '../../components/ProductsComponents/PageProducts/ProductsModify/ProductsModify';
import ProductsDelete from '../../components/ProductsComponents/PageProducts/ProductsDelete/ProductsDelete';
import ProductsPromotions from '../../components/ProductsComponents/PageProducts/ProductsPromotions/ProductsPromotions';
import ProductsImports from '../../components/ProductsComponents/PageProducts/ProductsImport/ProductsImports';
import Departments from '../../components/ProductsComponents/PageProducts/Departments/Departments';

import styles from './Products.module.css';

const Products = () => {
  return (
    <div className={styles.container}>
      <Navbar />
      <NavbarProducts />
      
      <div className={styles.pageContent}>
        <Routes>
          <Route path="/" element={<ProductsList />} />
          <Route path="/nuevo" element={<ProductsNew />} />
          <Route path="/modificar" element={<ProductsModify />} />
          <Route path="/eliminar" element={<ProductsDelete />} />
          <Route path="/promociones" element={<ProductsPromotions />} />
          <Route path="/importar" element={<ProductsImports />} />|
          <Route path="/departamentos" element={<Departments />} /> 
          {/* Redirección si no se encuentra la ruta */}
          <Route path="*" element={<Navigate to="/products" replace />} />
        </Routes>
      </div>
      
      <Footer />
    </div>
  );
};

export default Products;
