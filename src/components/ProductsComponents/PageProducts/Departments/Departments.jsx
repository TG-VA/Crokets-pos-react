import React, { useState, useEffect } from "react";
import { useProducts } from "../../../../context/ProductsContext";
import styles from "./Departments.module.css";

const Departments = () => {
  const { departments, addDepartment, updateDepartment, deleteDepartment } = useProducts();
  const [selectedId, setSelectedId] = useState("new");
  // Eliminar isEditing ya que siempre será editable
  const [formData, setFormData] = useState({
    name: "",
    status: true,
  });

  useEffect(() => {
    if (selectedId === "new") {
      setFormData({ name: "", status: true });
    } else {
      const dept = departments.find((d) => d.id === selectedId);
      if (dept) {
        setFormData({ name: dept.name, status: dept.status });
      } else {
        setSelectedId("new");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  const handleCreate = () => {
    setSelectedId("new");
  };

  const handleSelect = (id) => {
    setSelectedId(id);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("El nombre es requerido");
      return;
    }

    if (selectedId === "new") {
      if (departments.some(d => d.name.toLowerCase() === formData.name.trim().toLowerCase())) {
        alert("Ya existe un departamento con este nombre");
        return;
      }
      addDepartment(formData.name.trim());
      alert("Departamento creado");
      setFormData({ name: "", status: true });
    } else {
      if (departments.some(d => d.id !== selectedId && d.name.toLowerCase() === formData.name.trim().toLowerCase())) {
        alert("Ya existe un departamento con este nombre");
        return;
      }
      updateDepartment(selectedId, {
        name: formData.name.trim(),
        status: formData.status
      });
      alert("Departamento actualizado");
    }
  };

  const handleDelete = () => {
    if (window.confirm("¿Estás seguro de eliminar este departamento?")) {
      deleteDepartment(selectedId);
      setSelectedId("new");
    }
  };

  const selectedDept = departments.find(d => d.id === selectedId);

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div 
          className={`${styles.sidebarHeader} ${selectedId === "new" ? styles.activeItem : ""}`}
          onClick={handleCreate}
        >
          + Crear nuevo departamento
        </div>
        <ul className={styles.departmentList}>
          {departments.map((dept) => (
            <li
              key={dept.id}
              className={`${styles.departmentItem} ${selectedId === dept.id ? styles.activeItem : ""}`}
              onClick={() => handleSelect(dept.id)}
            >
              {dept.name}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.content}>
        <h2 className={styles.formTitle}>
          {selectedId === "new" ? "Nuevo Departamento" : "Detalles del Departamento"}
        </h2>
        
        <form onSubmit={handleSave}>
          {selectedId !== "new" && selectedDept && (
             <div className={styles.formGroup}>
                <label className={styles.label}>ID</label>
                <input 
                  className={styles.input} 
                  value={selectedDept.id} 
                  disabled 
                />
             </div>
          )}

          <div className={styles.formGroup}>
            <label className={styles.label}>Nombre</label>
            <input
              className={styles.input}
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nombre del departamento"
            />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Estatus</label>
            <select
              className={styles.input}
              value={formData.status ? "active" : "inactive"}
              onChange={(e) => setFormData({ ...formData, status: e.target.value === "active" })}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>

          {selectedId !== "new" && selectedDept && (
            <>
               <div className={styles.formGroup}>
                  <label className={styles.label}>Fecha de creación</label>
                  <input 
                    className={styles.input} 
                    value={new Date(selectedDept.created_at).toLocaleString()} 
                    disabled 
                  />
               </div>
               <div className={styles.formGroup}>
                  <label className={styles.label}>Última actualización</label>
                  <input 
                    className={styles.input} 
                    value={new Date(selectedDept.updated_at).toLocaleString()} 
                    disabled 
                  />
               </div>
            </>
          )}

          <div className={styles.actions}>
            {selectedId === "new" ? (
              <button type="submit" className={`${styles.button} ${styles.primaryButton}`}>
                Guardar
              </button>
            ) : (
              <>
                <button 
                  type="submit" 
                  className={`${styles.button} ${styles.primaryButton}`}
                >
                  Actualizar información
                </button>
                <button 
                  type="button" 
                  className={`${styles.button} ${styles.dangerButton}`}
                  onClick={handleDelete}
                >
                  Eliminar
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Departments;