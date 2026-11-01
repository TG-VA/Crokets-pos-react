import styles from "./ProductsList.module.css";

const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

const ProductScopeCell = ({ isGlobal, branchNames }) => {
  const names = Array.isArray(branchNames) ? branchNames : [];

  if (typeof isGlobal !== "boolean") {
    return <span className={styles.scopeUnknown}>-</span>;
  }

  return (
    <div className={styles.scopeCell}>
      <span
        className={joinClasses(
          styles.scopeBadge,
          isGlobal ? styles.scopeGlobal : styles.scopeLocal
        )}
      >
        {isGlobal ? "Global" : "Local"}
      </span>
      {!isGlobal &&
        names.map((name) => (
          <span key={name} className={styles.branchChip}>
            {name}
          </span>
        ))}
    </div>
  );
};

export default ProductScopeCell;
