import styles from "./ImportInstructions.module.css";

const ColumnChips = ({ label, columns, variant }) => (
  <div className={styles.columnGroup}>
    <span className={styles.groupLabel}>{label}</span>
    <ul className={styles.chipList}>
      {columns.map((column) => (
        <li key={column} className={`${styles.chip} ${styles[variant]}`}>
          {column}
        </li>
      ))}
    </ul>
  </div>
);

const ImportInstructions = ({
  requiredColumns,
  optionalColumns,
  departmentRules,
  allowedValues,
  footNote,
}) => (
  <section className={styles.instructions}>
    <h3 className={styles.title}>Instrucciones importantes</h3>
    <div className={styles.grid}>
      <div className={styles.block}>
        <h4 className={styles.subtitle}>Columnas del archivo</h4>
        <ColumnChips
          label="Obligatorias"
          columns={requiredColumns}
          variant="chipRequired"
        />
        <ColumnChips
          label="Opcionales"
          columns={optionalColumns}
          variant="chipOptional"
        />
        <ul className={styles.rules}>
          {departmentRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
      <div className={styles.block}>
        <h4 className={styles.subtitle}>Valores permitidos</h4>
        <table className={styles.valuesTable}>
          <thead>
            <tr>
              <th scope="col">Campo</th>
              <th scope="col">Valores</th>
            </tr>
          </thead>
          <tbody>
            {allowedValues.map(({ field, values }) => (
              <tr key={field}>
                <th scope="row">{field}</th>
                <td>{values}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className={styles.footNote}>{footNote}</p>
      </div>
    </div>
  </section>
);

export default ImportInstructions;
