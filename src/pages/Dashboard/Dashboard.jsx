import React from 'react';
import Navbar from '../../components/Navbar/Navbar';
import styles from './Dashboard.module.css';
import Footer from '../../components/Footer/Footer';
import Ventas from '../Ventas/Ventas';


const Dashboard = () => {
  return (
    <div className={styles.navbar}>
      <Navbar />
      <main className={styles.mainContent}>
        <Ventas /> 
      </main>
      <Footer/> 
    </div>
  );
};
export default Dashboard;
