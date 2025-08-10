import React from 'react';
import Navbar from '../../components/Navbar/Navbar';
import styles from './Dashboard.module.css';
import Footer from '../../components/Footer/Footer';


const Dashboard = () => {
  return (
    <div className={styles.navbar}>
      <Navbar />
      <main className={styles.mainContent}>
        {/* Aquí iría el resto del contenido del dashboard */}
        <h2>Contenido Principal del Dashboard</h2>
      </main>
      <Footer/> 
    </div>
  );
};
export default Dashboard;
