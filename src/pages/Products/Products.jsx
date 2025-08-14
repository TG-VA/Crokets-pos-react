import React from 'react';
import Navbar from '../../components/Navbar/Navbar';
import Footer from '../../components/Footer/Footer';
import styles from './Products.module.css';

const Products = () => {
  return (
    <div className={styles.container}>
      <Navbar />
      <main className={styles.mainContent}>
        <div className={styles.header}>
          <h1>Gestión de Productos</h1>
          <p>Administra tu catálogo de productos</p>
        </div>
        
        <div className={styles.content}>
          <div className={styles.toolbar}>
            <button className={styles.addButton}>
              Agregar Producto
            </button>
            <input 
              type="text" 
              placeholder="Buscar producto..."
              className={styles.searchInput}
            />
          </div>
          
          <div className={styles.productsList}>
            {/* Aquí iría la lista de productos */}
            <p>Lista de productos aparecerá aquí</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Products;
