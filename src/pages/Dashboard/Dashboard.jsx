import React from 'react';
import Navbar from '../../components/Navbar/Navbar';
import styles from './Dashboard.module.css';
import Footer from '../../components/Footer/Footer';
import Sales from '../Sales/Sales';


const Dashboard = () => {
  return (
    <div className={styles.navbar}>
      <Navbar />
      <main className={styles.mainContent}>
        <Sales /> 
      </main>
      <Footer/> 
    </div>
  );
};
export default Dashboard;
