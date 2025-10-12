import React, { useState, useRef, useEffect } from "react";
import styles from "../../pages/Sales/Sales.module.css";

// Importar iconos
import searchIcon from "../../assets/icons/searchIcon.svg";
import entryIcon from "../../assets/icons/entryIcon.svg";
import exitIcon from "../../assets/icons/exitIcon.svg";
import deleteIcon from "../../assets/icons/deleteIcon.svg";
import verifyIcon from "../../assets/icons/verifyIcon.svg";
import changeIcon from "../../assets/icons/changeIcon.svg";
import assignClientIcon from "../../assets/icons/assignClientIcon.svg";
import payIcon from "../../assets/icons/payIcon.svg";
import DiscountIcon from "../../assets/icons/percent-solid-full.svg";

// Importar componentes de modales
import ExitModal from "../../components/SalesComponents/Modals/ExitModal/ExitModal";
import EntryModal from "../../components/SalesComponents/Modals/EntryModal/EntryModal";
import PaymentModal from "../../components/SalesComponents/Modals/PaymentModal/PaymentModal";
import ClientModal from "../../components/SalesComponents/Modals/ClientModal/ClientModal";
import VerifierModal from "../../components/SalesComponents/Modals/VerifierModal/VerifierModal";
import SearchModal from "../../components/SalesComponents/Modals/SearchModal/SearchModal";
import DiscountModal from "../../components/SalesComponents/Modals/DiscountModal/DiscountModal";

const Sales = () => {
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

  // Estados para los modales
  const [isExitModalOpen, setExitModalOpen] = useState(false);
  const [isEntryModalOpen, setEntryModalOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [isVerifierModalOpen, setVerifierModalOpen] = useState(false);
  const [isSearchModalOpen, setSearchModalOpen] = useState(false);
  const [isDiscountModalOpen, setDiscountModalOpen] = useState(false);

  // Estados para movimientos de caja
  const [cashMovements, setCashMovements] = useState([]);
  const [currentSaleClient, setCurrentSaleClient] = useState(null);

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

  // Funciones para manejar movimientos de caja
  const handleSaveEntry = (newMovement) => {
    const updatedMovements = [...cashMovements, newMovement];
    setCashMovements(updatedMovements);
    console.log("Movimientos de caja actualizados:", updatedMovements);
  };

  const handleSaveExit = (newMovement) => {
    const updatedMovements = [...cashMovements, newMovement];
    setCashMovements(updatedMovements);
    console.log("Movimientos de caja actualizados:", updatedMovements);
  };

  // Funciones para asignar cliente
  const openClientModal = () => {
    setClientModalOpen(true);
  };

  const handleAssignClient = (client) => {
    setCurrentSaleClient(client);
    console.log("Cliente asignado a la venta:", client);
  };

  // Función para procesar pagos
  const handleProcessPayment = (paymentData) => {
    console.log("Procesando pago:", paymentData);
    // Aquí puedes manejar la lógica de procesamiento del pago
    alert(`Pago procesado: $${paymentData.total} con ${paymentData.method}`);
  };

  // Función para agregar producto desde el verificador
  const handleAddProductFromVerifier = (product) => {
    console.log("Producto agregado desde verificador:", product);
    // Aquí en el futuro se agregará la lógica para agregar a la venta
  };

  // Efectos para manejar teclas
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

  // Manejo de teclas para todos los modales
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "F12":
          e.preventDefault();
          setShowPaymentModal(true);
          break;
        case "F7":
          e.preventDefault();
          setEntryModalOpen(true);
          break;
        case "F8":
          e.preventDefault();
          setExitModalOpen(true);
          break;
        case "F9":
          e.preventDefault();
          setVerifierModalOpen(true);
          break;
        case "F10":
          e.preventDefault();
          setSearchModalOpen(true);
          break;
        case "Escape":
          if (showPaymentModal) {
            setShowPaymentModal(false);
          } else if (isEntryModalOpen) {
            setEntryModalOpen(false);
          } else if (isExitModalOpen) {
            setExitModalOpen(false);
          } else if (isClientModalOpen) {
            setClientModalOpen(false);
          } else if (isVerifierModalOpen) {
            setVerifierModalOpen(false);
          } else if (isSearchModalOpen) {
            setSearchModalOpen(false);
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    showPaymentModal,
    isEntryModalOpen,
    isExitModalOpen,
    isClientModalOpen,
    isVerifierModalOpen,
    isSearchModalOpen,
  ]);

  // Calcular totales
  const subtotal = productos.reduce(
    (sum, producto) => sum + producto.importe,
    0
  );
  const total = subtotal; // Aquí podrías agregar impuestos si los hay

  return (
    <div className={styles.ventasContainer}>
      {/* Título de venta y número de ticket */}
      <div className={styles.saleHeader}>
        <h2>VENTA - Ticket {ticketNumber}</h2>
        {currentSaleClient && (
          <div className={styles.clientInfo}>
            <span>Cliente: {currentSaleClient.name}</span>
          </div>
        )}
      </div>

      {/* Barra superior de acciones*/}
      <div className={styles.topActionBar}>
        <div
          className={styles.horizontalActionButton}
          onClick={() => setSearchModalOpen(true)}
        >
          <span className={styles.actionKey}>F10</span>
          <img src={searchIcon} alt="Buscar" className={styles.buttonIcon} />
          <span className={styles.actionText}>Buscar</span>
        </div>
        <div
          className={styles.horizontalActionButton}
          onClick={() => setEntryModalOpen(true)}
        >
          <span className={styles.actionKey}>F7</span>
          <img src={entryIcon} alt="Entradas" className={styles.buttonIcon} />
          <span className={styles.actionText}>Entradas</span>
        </div>
        <div
          className={styles.horizontalActionButton}
          onClick={() => setExitModalOpen(true)}
        >
          <span className={styles.actionKey}>F8</span>
          <img src={exitIcon} alt="Salidas" className={styles.buttonIcon} />
          <span className={styles.actionText}>Salidas</span>
        </div>
        <div className={styles.horizontalActionButton}>
          <span className={styles.actionKey}>DEL</span>
          <img src={deleteIcon} alt="Borrar" className={styles.buttonIcon} />
          <span className={styles.actionText}>Borrar Art.</span>
        </div>
        <div
          className={styles.horizontalActionButton}
          onClick={() => setVerifierModalOpen(true)}
        >
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
          {/*botón Cambiar*/}
          <div className={styles.squareButton}>
            <img src={changeIcon} alt="Cambiar" className={styles.squareIcon} />
            <span className={styles.squareKey}>F5</span>
            <span className={styles.squareText}>Cambiar</span>
          </div>
          {/*botón Pendiente*/}
          <div className={styles.squareButton}>
            <span className={styles.squareKey}>F6</span>
            <span className={styles.squareText}>Pendiente</span>
          </div>
          {/*botón Eliminar*/}
          <div className={styles.squareButton}>
            <img
              src={deleteIcon}
              alt="Eliminar"
              className={styles.squareIcon}
            />
            <span className={styles.squareText}>Eliminar</span>
          </div>
          {/*botón Descuento*/}
          <div className={styles.squareButton} onClick={() => setDiscountModalOpen(true)}>
            <img
              src={DiscountIcon}
              alt="Descuento Icono"
              className={styles.squareIcon}
            />
            <span className={styles.squareText}>Descuento</span>
          </div>
          {/*botón Asignar Cliente*/}
          <div className={styles.squareButton} onClick={openClientModal}>
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
            <span className={styles.totalAmount}>${subtotal.toFixed(2)}</span>
          </div>
          <div className={styles.totalSection}>
            <span className={styles.totalLabel}>Total:</span>
            <span className={styles.totalAmount}>${total.toFixed(2)}</span>
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

      {/* MODALES */}

      {/* Modal de Entradas */}
      <EntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        onSaveEntry={handleSaveEntry}
      />

      {/* Modal de Salidas */}
      <ExitModal
        isOpen={isExitModalOpen}
        onClose={() => setExitModalOpen(false)}
        onSaveExit={handleSaveExit}
      />

      {/* Modal de Cobro */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        total={total}
        onProcessPayment={handleProcessPayment}
      />

      {/* Modal de Cliente */}
      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onAssignClient={handleAssignClient}
        currentSaleClient={currentSaleClient}
      />

      {/* Modal de Verificador */}
      <VerifierModal
        isOpen={isVerifierModalOpen}
        onClose={() => setVerifierModalOpen(false)}
        onAddToSale={handleAddProductFromVerifier}
      />

      {/* Modal de Búsqueda */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onAddToSale={handleAddProductFromVerifier}
      />
      {/* Modal de Descuento */}
      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setDiscountModalOpen(false)}
      />  
    </div>
  );
};

export default Sales;
