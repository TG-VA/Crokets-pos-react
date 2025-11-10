import React, { useState } from "react";
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../../../../context/ProductsContext';
import styles from './ProductsNew.module.css';

const ProductsNew = () => {
  const navigate = useNavigate();
  const { addProduct } = useProducts();
  const [showSuccess, setShowSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    codigo: '',
    descripcion: '',
    departamento: '',
    costo: '',
    precio: '',
    existencia: '',
    minimo: '',
    maximo: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error del campo al escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.codigo.trim()) {
      newErrors.codigo = 'El código de barras es requerido';
    }

    if (!formData.descripcion.trim()) {
      newErrors.descripcion = 'El nombre del producto es requerido';
    }

    if (!formData.departamento.trim()) {
      newErrors.departamento = 'El departamento es requerido';
    }

    if (!formData.costo || parseFloat(formData.costo) <= 0) {
      newErrors.costo = 'El costo debe ser mayor a 0';
    }

    if (!formData.precio || parseFloat(formData.precio) <= 0) {
      newErrors.precio = 'El precio público debe ser mayor a 0';
    }

    if (parseFloat(formData.precio) < parseFloat(formData.costo)) {
      newErrors.precio = 'El precio no puede ser menor al costo';
    }

    if (formData.existencia === '' || parseInt(formData.existencia) < 0) {
      newErrors.existencia = 'Las piezas actuales deben ser 0 o mayor';
    }

    if (formData.minimo === '' || parseInt(formData.minimo) < 0) {
      newErrors.minimo = 'El mínimo debe ser 0 o mayor';
    }

    if (formData.maximo === '' || parseInt(formData.maximo) < 0) {
      newErrors.maximo = 'El máximo debe ser 0 o mayor';
    }

    if (parseInt(formData.maximo) < parseInt(formData.minimo)) {
      newErrors.maximo = 'El máximo no puede ser menor al mínimo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Crear el nuevo producto con los tipos de datos correctos
    const newProduct = {
      codigo: formData.codigo.trim(),
      descripcion: formData.descripcion.trim(),
      departamento: formData.departamento.trim().toLowerCase(),
      costo: parseFloat(formData.costo),
      precio: parseFloat(formData.precio),
      existencia: parseInt(formData.existencia),
      minimo: parseInt(formData.minimo),
      maximo: parseInt(formData.maximo),
    };

    addProduct(newProduct);

    // Mostrar mensaje de éxito
    setShowSuccess(true);

    // Limpiar el formulario
    setFormData({
      codigo: '',
      descripcion: '',
      departamento: '',
      costo: '',
      precio: '',
      existencia: '',
      minimo: '',
      maximo: '',
    });

    // Ocultar mensaje de éxito después de 3 segundos
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
  };

  const handleCancel = () => {
    navigate('/products');
  };

  const handleKeyPress = (e, nextFieldName) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextFieldName === 'submit') {
        handleSubmit(e);
      } else {
        const form = e.target.form;
        const index = Array.prototype.indexOf.call(form, e.target);
        const nextField = form.elements[index + 1];
        if (nextField && nextField.type !== 'submit') {
          nextField.focus();
        }
      }
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Nuevo Producto</h1>
        <p>Completa la información para agregar un nuevo producto al inventario</p>
      </div>

      {showSuccess && (
        <div className={styles.successMessage}>
          ✓ Producto creado exitosamente
        </div>
      )}

      <div className={styles.formContainer}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>
              Código de Barras <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="codigo"
              value={formData.codigo}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              className={`${styles.input} ${errors.codigo ? styles.inputError : ''}`}
              placeholder="Ej: 1234567890"
              autoFocus
            />
            {errors.codigo && <span className={styles.errorMessage}>{errors.codigo}</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Nombre del Producto <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              className={`${styles.input} ${errors.descripcion ? styles.inputError : ''}`}
              placeholder="Ej: Royal canin urinary so small dog 4kg"
            />
            {errors.descripcion && <span className={styles.errorMessage}>{errors.descripcion}</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Departamento <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="departamento"
              value={formData.departamento}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              className={`${styles.input} ${errors.departamento ? styles.inputError : ''}`}
              placeholder="Ej: royal canin"
            />
            {errors.departamento && <span className={styles.errorMessage}>{errors.departamento}</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Costo <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              name="costo"
              value={formData.costo}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              className={`${styles.input} ${errors.costo ? styles.inputError : ''}`}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            {errors.costo && <span className={styles.errorMessage}>{errors.costo}</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Precio Público <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              name="precio"
              value={formData.precio}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              className={`${styles.input} ${errors.precio ? styles.inputError : ''}`}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            {errors.precio && <span className={styles.errorMessage}>{errors.precio}</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Piezas Actuales <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              name="existencia"
              value={formData.existencia}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              className={`${styles.input} ${errors.existencia ? styles.inputError : ''}`}
              placeholder="0"
              min="0"
            />
            {errors.existencia && <span className={styles.errorMessage}>{errors.existencia}</span>}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Mínimo <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              name="minimo"
              value={formData.minimo}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              className={`${styles.input} ${errors.minimo ? styles.inputError : ''}`}
              placeholder="0"
              min="0"
            />
            {errors.minimo && <span className={styles.errorMessage}>{errors.minimo}</span>}
            <span className={styles.fieldHint}>Stock mínimo recomendado</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>
              Máximo <span className={styles.required}>*</span>
            </label>
            <input
              type="number"
              name="maximo"
              value={formData.maximo}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              className={`${styles.input} ${errors.maximo ? styles.inputError : ''}`}
              placeholder="0"
              min="0"
            />
            {errors.maximo && <span className={styles.errorMessage}>{errors.maximo}</span>}
            <span className={styles.fieldHint}>Stock máximo en inventario</span>
          </div>

        <div className={styles.buttonContainer}>
          <button
            type="submit"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onKeyPress={(e) => handleKeyPress(e, 'submit')}
          >
            Crear Producto
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={handleCancel}
          >
            Cancelar
          </button>
        </div>
        </form>
      </div>
    </div>
  );
};

export default ProductsNew;
