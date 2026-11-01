import styles from "../ProductsPromotions.module.css";

const BranchBadgeList = ({ branches }) => {
  return (
    <div className={styles.branchBadgeList}>
      {(branches || []).map((branch) => (
        <span key={branch.id} className={styles.branchBadge}>
          {branch.name}
        </span>
      ))}
    </div>
  );
};

export default BranchBadgeList;
