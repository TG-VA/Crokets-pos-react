import React from 'react';
import Navbar from '../../components/Navbar/Navbar';
import styles from './Dashboard.module.css';


const Dashboard = () => {
  return (
    <div className={styles.navbar}>
      <Navbar />
      <div className={styles.dasboardContent}></div>
    </div>
  );
};

export default Dashboard;
