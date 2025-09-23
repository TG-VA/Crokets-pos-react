import React, { useState, useRef, useEffect } from "react";
import styles from "./Sales.module.css";

// Importar iconos
import searchIcon from "../../assets/icons/searchIcon.svg";
import entryIcon from "../../assets/icons/entryIcon.svg";
import exitIcon from "../../assets/icons/exitIcon.svg";
import deleteIcon from "../../assets/icons/deleteIcon.svg";
import verifyIcon from "../../assets/icons/verifyIcon.svg";
import changeIcon from "../../assets/icons/changeIcon.svg";
import assignClientIcon from "../../assets/icons/assignClientIcon.svg";
import payIcon from "../../assets/icons/payIcon.svg";

const Ventas = () => {
  // Número de ticket de ejemplo
  const ticketNumber = 1;

  // Estados para el redimensionamiento de columnas usando fracciones
  const [columnFractions, setColumnFractions] = useState([
    "2fr",
    "1fr",
    "0.5fr",
    "1fr",
    "1fr",
  ]);
  const [isResizing, setIsResizing] = useState(false);
  const [resizingIndex, setResizingIndex] = useState(-1);
  const [startX, setStartX] = useState(0);
  const [tableWidth, setTableWidth] = useState(0);

  const tableRef = useRef(null);

  // Modal de Cobro
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState("Terminal");
  const [paidAmount, setPaidAmount] = useState(0);

  const total = 207.0; // aquí puedes ligar con el total real de la venta
  const change = Math.max(0, paidAmount - total);

  const paymentMethods = [
    { id: "Efectivo", name: "Efectivo", icon: "💰" },
    { id: "Dolares", name: "Dólares", icon: "💵" },
    { id: "Mixto", name: "Mixto", icon: "🪙" },
    { id: "Terminal", name: "Terminal", icon: "🖥️" },
    { id: "Transferencia", name: "Transferencia", icon: "🏦" },
  ];

  const closePaymentModal = () => setShowPaymentModal(false);
  const processPayment = () => {
    alert(
      `Procesando pago de $${total.toFixed(2)} con ${selectedPaymentMethod}`
    );
    setShowPaymentModal(false);
  };

  // Datos de ejemplo para la tabla
  const productos = [
    {
      codigo: "1 AC bb 8520 MOBO",
      precio: 69.0,
      cantidad: 1,
      importe: 69.0,
      existencia: 10,
    },
    {
      codigo: "1 AC bb 8520 MOBO",
      precio: 69.0,
      cantidad: 1,
      importe: 69.0,
      existencia: 10,
    },
    {
      codigo: "1 AC bb 8520 MOBO",
      precio: 69.0,
      cantidad: 1,
      importe: 69.0,
      existencia: 10,
    },
  ];

  // Funciones para el redimensionamiento
  const handleMouseDown = (e, index) => {
    if (tableRef.current) {
      setTableWidth(tableRef.current.offsetWidth);
    }
    setIsResizing(true);
    setResizingIndex(index);
    setStartX(e.clientX);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isResizing || resizingIndex === -1 || !tableRef.current) return;

    const currentX = e.clientX;
    const diffX = currentX - startX;
    const diffPercent = (diffX / tableWidth) * 100;

    const currentFractions = columnFractions.map((fr) =>
      parseFloat(fr.replace("fr", ""))
    );
    const newValue = Math.max(
      0.2,
      currentFractions[resizingIndex] + diffPercent / 100
    );

    const newFractions = [...currentFractions];
    newFractions[resizingIndex] = newValue;

    const newFractionsStr = newFractions.map((val) => `${val}fr`);
    setColumnFractions(newFractionsStr);

    setStartX(currentX);
  };

  const handleMouseUp = () => {
    setIsResizing(false);
    setResizingIndex(-1);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, resizingIndex, startX, tableWidth, columnFractions]);

  return (
    <div className={styles.ventasContainer}>
      {/* Título de venta y número de ticket */}
      <div className={styles.saleHeader}>
        <h2>VENTA - Ticket {ticketNumber}</h2>
      </div>

      {/* Barra superior de acciones*/}
      <div className={styles.topActionBar}>
        <div className={styles.horizontalActionButton}>
          <span className={styles.actionKey}>F10</span>
          <img src={searchIcon} alt="Buscar" className={styles.buttonIcon} />
          <span className={styles.actionText}>Buscar</span>
        </div>
        <div className={styles.horizontalActionButton}>
          <span className={styles.actionKey}>F7</span>
          <img src={entryIcon} alt="Entradas" className={styles.buttonIcon} />
          <span className={styles.actionText}>Entradas</span>
        </div>
        <div className={styles.horizontalActionButton}>
          <span className={styles.actionKey}>F8</span>
          <img src={exitIcon} alt="Salidas" className={styles.buttonIcon} />
          <span className={styles.actionText}>Salidas</span>
        </div>
        <div className={styles.horizontalActionButton}>
          <span className={styles.actionKey}>DEL</span>
          <img src={deleteIcon} alt="Borrar" className={styles.buttonIcon} />
          <span className={styles.actionText}>Borrar Art.</span>
        </div>
        <div className={styles.horizontalActionButton}>
          <span className={styles.actionKey}>F9</span>
          <img
            src={verifyIcon}
            alt="Verificador"
            className={styles.buttonIcon}
          />
          <span className={styles.actionText}>Verificador</span>
        </div>
      </div>

      {/* Barra de entrada de productos */}
      <div className={styles.productInputBar}>
        <div className={styles.inputSection}>
          <label>Código de Barras:</label>
          <input type="text" className={styles.barcodeInput} />
        </div>
        <div className={styles.addProductBtn}>
          <span className={styles.actionKey2}>ENTER</span>
          <span className={styles.actionText2}>Agregar Producto</span>
        </div>
      </div>

      {/* Tabla de productos redimensionable */}
      <div className={styles.productsTable} ref={tableRef}>
        <div
          className={styles.tableHeader}
          style={{ gridTemplateColumns: columnFractions.join(" ") }}
        >
          <span>
            Código de Barras
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => handleMouseDown(e, 0)}
            />
          </span>
          <span>
            Precio Venta
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => handleMouseDown(e, 1)}
            />
          </span>
          <span>
            Cant.
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => handleMouseDown(e, 2)}
            />
          </span>
          <span>
            Importe
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => handleMouseDown(e, 3)}
            />
          </span>
          <span>Existencia</span>
        </div>
        <div className={styles.tableBody}>
          {productos.map((producto, index) => (
            <div
              key={index}
              className={styles.tableRow}
              style={{ gridTemplateColumns: columnFractions.join(" ") }}
            >
              <span className={styles.tableCell}>{producto.codigo}</span>
              <span className={styles.tableCell}>
                ${producto.precio.toFixed(2)}
              </span>
              <span className={styles.tableCell}>{producto.cantidad}</span>
              <span className={styles.tableCell}>
                ${producto.importe.toFixed(2)}
              </span>
              <span className={styles.tableCell}>{producto.existencia}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pie de página con acciones y total */}
      <div className={styles.footerBar}>
        <div className={styles.leftActions}>
          <div className={styles.squareButton}>
            <img src={changeIcon} alt="Cambiar" className={styles.squareIcon} />
            <span className={styles.squareKey}>F5</span>
            <span className={styles.squareText}>Cambiar</span>
          </div>
          <div className={styles.squareButton}>
            <span className={styles.squareKey}>F6</span>
            <span className={styles.squareText}>Pendiente</span>
          </div>
          <div className={styles.squareButton}>
            <img
              src={deleteIcon}
              alt="Eliminar"
              className={styles.squareIcon}
            />
            <span className={styles.squareText}>Eliminar</span>
          </div>
          <div className={styles.squareButton}>
            <img
              src={assignClientIcon}
              alt="Asignar cliente"
              className={styles.squareIcon}
            />
            <span className={styles.squareText}>Asignar cliente</span>
          </div>
        </div>
        <div className={styles.rightActions}>
          <div className={styles.totalSection}>
            <span className={styles.totalLabel}>Subtotal:</span>
            <span className={styles.totalAmount}>$0.00</span>
          </div>
          <div className={styles.totalSection}>
            <span className={styles.totalLabel}>Total:</span>
            <span className={styles.totalAmount}>$0.00</span>
          </div>
          <div
            className={styles.payButton}
            onClick={() => setShowPaymentModal(true)}
          >
            <img src={payIcon} alt="Cobrar" className={styles.payIcon} />
            <span className={styles.payKey}>F12</span>
            <span className={styles.payText}>Cobrar</span>
          </div>
        </div>
      </div>

      {/* Modal de Cobro */}
      {showPaymentModal && (
        <div className={styles.modalOverlay} onClick={closePaymentModal}>
          <div
            className={styles.paymentModal}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2>COBRAR</h2>
              <button
                className={styles.closeButton}
                onClick={closePaymentModal}
              >
                ✕
              </button>
            </div>

            <div className={styles.totalDisplay}>${total.toFixed(2)}</div>

            <div className={styles.paymentMethods}>
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className={`${styles.paymentMethod} ${
                    selectedPaymentMethod === method.id
                      ? styles.paymentMethodSelected
                      : ""
                  }`}
                  onClick={() => setSelectedPaymentMethod(method.id)}
                >
                  <div className={styles.methodIcon}>{method.icon}</div>
                  <div className={styles.methodName}>{method.name}</div>
                </div>
              ))}
            </div>

            <div className={styles.paymentInfo}>
              <div className={styles.paymentRow}>
                <span>Pagó Con:</span>
                <input
                  type="number"
                  className={styles.paymentInput}
                  value={paidAmount}
                  onChange={(e) =>
                    setPaidAmount(parseFloat(e.target.value) || 0)
                  }
                  step="0.01"
                />
              </div>
              <div className={styles.paymentRow}>
                <span>Su Cambio:</span>
                <span className={styles.changeAmount}>
                  ${change.toFixed(2)}
                </span>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={`${styles.modalActionBtn} `}>
                F1 - Cobrar e Imprimir
              </button>
              <button className={`${styles.modalActionBtn}`}>
                F2 - Cobrar sin imprimir
              </button>
              <button
                className={`${styles.modalActionBtn}`}
                onClick={closePaymentModal}
              >
                ESC - Cancelar
              </button>
              <button className={`${styles.modalActionBtn}`}>
                F4 - Ingresar notas
              </button>
              <button
                className={`${styles.modalActionBtn}`}
                onClick={processPayment}
              >
                Facturar venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Ventas;
