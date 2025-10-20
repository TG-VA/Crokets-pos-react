import React, { useState, useRef, useCallback, useEffect, use } from "react";
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
import PendingTicketModal from "../../components/SalesComponents/Modals/PendingTicketModal/PendingTicketModal";
import ChangeTicketModal from "../../components/SalesComponents/Modals/ChangeTicketModal/ChangeTicketModal";
import DeleteTicketModal from "../../components/SalesComponents/Modals/DeleteTicketModal/DeleteTicketModal";
import DeleteItemModal from "../../components/SalesComponents/Modals/DeleteItemModal/DeleteItemModal";

const Sales = () => {
  // Estados para tickets
  const [ticketNumber, setTicketNumber] = useState(1);
  const [pendingTickets, setPendingTickets] = useState([]);

  // Configuración de anchos de columna en píxeles
  const MIN_COLUMN_WIDTH = 80;
  const [columnWidths, setColumnWidths] = useState([400, 150, 80, 150, 150]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Referencia optimizada para redimensionamiento
  const resizeRef = useRef({
    isResizing: false,
    columnIndex: -1,
    startX: 0,
    startWidth: 0,
    nextStartWidth: 0,
  });

  const tableRef = useRef(null);

  // Estados para los modales
  const [isExitModalOpen, setExitModalOpen] = useState(false);
  const [isEntryModalOpen, setEntryModalOpen] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [isVerifierModalOpen, setVerifierModalOpen] = useState(false);
  const [isSearchModalOpen, setSearchModalOpen] = useState(false);
  const [isDiscountModalOpen, setDiscountModalOpen] = useState(false);
  const [isPendingModalOpen, setPendingModalOpen] = useState(false);
  const [isChangeModalOpen, setChangeModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDeleteItemModalOpen, setDeleteItemModalOpen] = useState(false);

  // Estados para movimientos de caja
  const [cashMovements, setCashMovements] = useState([]);
  const [currentSaleClient, setCurrentSaleClient] = useState(null);

  // Datos de ejemplo para la tabla
  const [productos, setProductos] = useState([
    {
      id: 1,
      codigo: "NUPEC ADULTO RAZA PEQUEÑA 2KG",
      precio: 332.0,
      costo: 250.0,
      cantidad: 1,
      importe: 332.0,
      existencia: 10,
    },
    {
      id: 2,
      codigo: "NUPEC ADULTO 20KG",
      precio: 2089.0,
      costo: 1200.0,
      cantidad: 1,
      importe: 69.0,
      existencia: 6,
    },
    {
      id: 3,
      codigo: "NEXGARD SPECTRA 15-30 KG",
      precio: 890,
      costo: 600,
      cantidad: 1,
      importe: 890,
      existencia: 5,
    },
  ]);

  // Función para seleccionar/deseleccionar producto
  const handleProductSelect = (producto) => {
    if (selectedProduct && selectedProduct.id === producto.id) {
      setSelectedProduct(null);
    } else {
      setSelectedProduct(producto);
    }
  };

  // Función para eliminar producto seleccionado
  const handleDeleteSelectedProduct = () => {
    if (selectedProduct) {
      const updatedProductos = productos.filter(
        (p) => p.id !== selectedProduct.id
      );
      setProductos(updatedProductos);
      setSelectedProduct(null);
      console.log("Producto eliminado:", selectedProduct);
    }
  };

  // Función para manejar el descuento aplicado
  const handleApplyDiscount = (discountData) => {
    if (selectedProduct) {
      const updatedProductos = productos.map((producto) =>
        producto.id === selectedProduct.id
          ? {
              ...producto,
              precio: parseFloat(discountData.newPrice),
              importe: parseFloat(discountData.newPrice) * producto.cantidad,
            }
          : producto
      );
      setProductos(updatedProductos);
      setSelectedProduct(null);
    }
  };

  // ========== CÓDIGO PARA REDIMENSIONAMIENTO ==========

  // Función para el movimiento del mouse
  const handleMouseMove = useCallback((e) => {
    const { isResizing, columnIndex, startX, startWidth, nextStartWidth } =
      resizeRef.current;

    if (!isResizing || columnIndex === -1) return;

    const deltaX = e.clientX - startX;

    // Calcular anchos
    let newWidth = startWidth + deltaX;
    let newNextWidth = nextStartWidth - deltaX;

    // Aplicar límites mínimos
    if (newWidth < MIN_COLUMN_WIDTH) {
      newWidth = MIN_COLUMN_WIDTH;
      newNextWidth = startWidth + nextStartWidth - MIN_COLUMN_WIDTH;
    }

    if (newNextWidth < MIN_COLUMN_WIDTH) {
      newNextWidth = MIN_COLUMN_WIDTH;
      newWidth = startWidth + nextStartWidth - MIN_COLUMN_WIDTH;
    }

    // Actualizar solo las columnas afectadas
    setColumnWidths((prev) => {
      const newWidths = [...prev];
      newWidths[columnIndex] = newWidth;
      newWidths[columnIndex + 1] = newNextWidth;
      return newWidths;
    });
  }, []);

  // Función para finalizar redimensionamiento
  const handleMouseUp = useCallback(() => {
    resizeRef.current.isResizing = false;
    resizeRef.current.columnIndex = -1;

    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);

    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, [handleMouseMove]);

  // Función para iniciar redimensionamiento
  const handleMouseDown = useCallback(
    (e, index) => {
      e.preventDefault();
      e.stopPropagation();

      // No permitir redimensionar la última columna
      if (index >= columnWidths.length - 1) return;

      resizeRef.current = {
        isResizing: true,
        columnIndex: index,
        startX: e.clientX,
        startWidth: columnWidths[index],
        nextStartWidth: columnWidths[index + 1],
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [columnWidths, handleMouseMove, handleMouseUp]
  );

  // Efecto para limpieza al desmontar el componente
  useEffect(() => {
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Efecto para calcular anchos iniciales basados en el contenedor
  useEffect(() => {
    if (tableRef.current && !isInitialized) {
      const tableWidth = tableRef.current.offsetWidth;

      // Restar: border de la tabla (2px), padding del header (20px), y margen adicional
      const availableWidth = tableWidth - 22;

      // Proporciones deseadas para cada columna (excepto la última)
      const proportions = [0.4, 0.15, 0.1, 0.15]; // Solo las primeras 4 columnas

      const calculatedWidths = proportions.map((prop) =>
        Math.max(MIN_COLUMN_WIDTH, Math.floor(availableWidth * prop))
      );

      // La última columna toma el espacio restante
      const usedWidth = calculatedWidths.reduce((sum, width) => sum + width, 0);
      const lastColumnWidth = Math.max(
        MIN_COLUMN_WIDTH,
        availableWidth - usedWidth
      );

      setColumnWidths([...calculatedWidths, lastColumnWidth]);
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // ========== FIN CÓDIGO REDIMENSIONAMIENTO ==========

  // Calcular totales
  const subtotal = productos.reduce(
    (sum, producto) => sum + producto.importe,
    0
  );
  const total = subtotal;

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
    alert(`Pago procesado: $${paymentData.total} con ${paymentData.method}`);
  };

  // Función para agregar producto desde el verificador
  const handleAddProductFromVerifier = (product) => {
    console.log("Producto agregado desde verificador:", product);
  };

  // Función para manejar ticket pendiente
  const handleSavePendingTicket = (ticketName) => {
    const pendingTicket = {
      number: ticketNumber,
      name: ticketName,
      products: productos,
      client: currentSaleClient,
      subtotal: subtotal,
      total: total,
      date: new Date().toISOString(),
    };

    setPendingTickets([...pendingTickets, pendingTicket]);
    console.log("Ticket guardado como pendiente:", pendingTicket);

    // Limpiar la venta actual y crear un nuevo ticket
    setProductos([]);
    setCurrentSaleClient(null);
    setSelectedProduct(null);
    setTicketNumber(ticketNumber + 1);
  };

  // Función para cambiar a un ticket pendiente
  const handleChangeToTicket = (ticket) => {
    // Guardar el ticket actual como pendiente si tiene productos
    if (productos.length > 0) {
      const currentTicket = {
        number: ticketNumber,
        name: `Ticket ${ticketNumber}`,
        products: productos,
        client: currentSaleClient,
        subtotal: subtotal,
        total: total,
        date: new Date().toISOString(),
      };

      // Actualizar tickets pendientes (agregar el actual y quitar el seleccionado)
      const updatedPendingTickets = pendingTickets.filter((t) => t !== ticket);
      setPendingTickets([...updatedPendingTickets, currentTicket]);
    } else {
      // Si no hay productos en el ticket actual, solo quitar el ticket seleccionado de pendientes
      const updatedPendingTickets = pendingTickets.filter((t) => t !== ticket);
      setPendingTickets(updatedPendingTickets);
    }

    // Cargar el ticket seleccionado
    setProductos(ticket.products);
    setCurrentSaleClient(ticket.client);
    setTicketNumber(ticket.number);
    setSelectedProduct(null);

    console.log("Cambiado a ticket:", ticket);
  };

  // Función para eliminar un ticket pendiente
  const handleDeleteTicket = (index) => {
    const updatedPendingTickets = pendingTickets.filter((_, i) => i !== index);
    setPendingTickets(updatedPendingTickets);
    console.log("Ticket eliminado");
  };

  // Función para abrir modal de cambio
  const handleOpenChangeModal = () => {
    if (pendingTickets.length === 0) {
      alert("No hay tickets pendientes");
    } else {
      setChangeModalOpen(true);
    }
  };

  // Función para abrir modal de eliminar
  const handleOpenDeleteModal = () => {
    if (pendingTickets.length === 0) {
      alert("No hay tickets pendientes por eliminar");
    } else {
      setDeleteModalOpen(true);
    }
  };

  // Manejo de teclas para todos los modales y navegación de productos
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Si hay algún modal abierto, no procesar las flechas en la tabla principal
      const isAnyModalOpen =
        showPaymentModal ||
        isEntryModalOpen ||
        isExitModalOpen ||
        isClientModalOpen ||
        isVerifierModalOpen ||
        isSearchModalOpen ||
        isDiscountModalOpen ||
        isPendingModalOpen ||
        isChangeModalOpen ||
        isDeleteModalOpen ||
        isDeleteItemModalOpen;

      // Navegación con flechas arriba/abajo entre productos (solo si no hay modal abierto)
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !isAnyModalOpen) {
        e.preventDefault();

        if (productos.length === 0) return;

        if (!selectedProduct) {
          // Si no hay producto seleccionado, seleccionar el primero
          setSelectedProduct(productos[0]);
        } else {
          const currentIndex = productos.findIndex(
            (p) => p.id === selectedProduct.id
          );

          if (e.key === "ArrowDown") {
            // Mover hacia abajo
            const nextIndex = (currentIndex + 1) % productos.length;
            setSelectedProduct(productos[nextIndex]);
          } else if (e.key === "ArrowUp") {
            // Mover hacia arriba
            const prevIndex =
              currentIndex === 0 ? productos.length - 1 : currentIndex - 1;
            setSelectedProduct(productos[prevIndex]);
          }
        }
        return;
      }

      // Ctrl + D para abrir modal de descuento cuando hay un producto seleccionado
      if (e.ctrlKey && e.key === "d") {
        e.preventDefault();
        if (selectedProduct) {
          setDiscountModalOpen(true);
        }
      }
      switch (e.key) {
        case "F12":
          e.preventDefault();
          setShowPaymentModal(true);
          break;
        case "F5":
          e.preventDefault();
          handleOpenChangeModal();
          break;
        case "F6":
          e.preventDefault();
          setPendingModalOpen(true);
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
        case "Backspace": 
          e.preventDefault();
          if (selectedProduct && !isAnyModalOpen) {
            setDeleteItemModalOpen(true);
          } else if (!selectedProduct) {
            alert("Por favor, selecciona un producto primero");
          }
          break;
        case "Delete":
          e.preventDefault();
          handleOpenDeleteModal();
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
          } else if (isDiscountModalOpen) {
            setDiscountModalOpen(false);
          } else if (isPendingModalOpen) {
            setPendingModalOpen(false);
          } else if (isChangeModalOpen) {
            setChangeModalOpen(false);
          } else if (isDeleteModalOpen) {
            setDeleteModalOpen(false);
          } else if (isDeleteItemModalOpen) {
            setDeleteItemModalOpen(false);
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
    isDiscountModalOpen,
    isPendingModalOpen,
    isChangeModalOpen,
    isDeleteModalOpen,
    isDeleteItemModalOpen,
    selectedProduct,
    productos,
    pendingTickets,
  ]);

  // Generar el template de columnas para CSS Grid
  const gridTemplate = columnWidths.map((width) => `${width}px`).join(" ");

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
        <div
          className={styles.horizontalActionButton}
          onClick={() => {
            if (selectedProduct) {
              setDeleteItemModalOpen(true);
            } else {
              alert("Por favor, selecciona un producto primero");
            }
          }}
        >
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
          style={{ gridTemplateColumns: gridTemplate }}
        >
          <span>
            Producto
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
          {productos.map((producto) => (
            <div
              key={producto.id}
              className={`${styles.tableRow} ${
                selectedProduct?.id === producto.id ? styles.selectedRow : ""
              }`}
              style={{ gridTemplateColumns: gridTemplate }}
              onClick={() => handleProductSelect(producto)}
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
          <div
            className={styles.squareButton}
            onClick={handleOpenChangeModal}
            data-tooltip="F5"
          >
            <img src={changeIcon} alt="Cambiar" className={styles.squareIcon} />
            <span className={styles.squareKey}>F5</span>
            <span className={styles.squareText}>Cambiar</span>
          </div>
          <div
            className={styles.squareButton}
            onClick={() => setPendingModalOpen(true)}
            data-tooltip="F6"
          >
            <span className={styles.squareKey}>F6</span>
            <span className={styles.squareText}>Pendiente</span>
          </div>
          <div className={styles.squareButton} onClick={handleOpenDeleteModal}>
            <img
              src={deleteIcon}
              alt="Eliminar"
              className={styles.squareIcon}
            />
            <span className={styles.squareText}>Eliminar</span>
          </div>
          <div
            className={styles.squareButton}
            onClick={() => {
              if (selectedProduct) {
                setDiscountModalOpen(true);
              } else {
                alert("Por favor, selecciona un producto primero");
              }
            }}
            data-tooltip="Ctrl + D"
          >
            <img
              src={DiscountIcon}
              alt="Descuento Icono"
              className={styles.squareIcon}
            />
            <span className={styles.squareText}>Descuento</span>
          </div>
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
      <EntryModal
        isOpen={isEntryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        onSaveEntry={handleSaveEntry}
      />

      <ExitModal
        isOpen={isExitModalOpen}
        onClose={() => setExitModalOpen(false)}
        onSaveExit={handleSaveExit}
      />

      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        total={total}
        onProcessPayment={handleProcessPayment}
      />

      <ClientModal
        isOpen={isClientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onAssignClient={handleAssignClient}
        currentSaleClient={currentSaleClient}
      />

      <VerifierModal
        isOpen={isVerifierModalOpen}
        onClose={() => setVerifierModalOpen(false)}
        onAddToSale={handleAddProductFromVerifier}
      />

      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onAddToSale={handleAddProductFromVerifier}
      />

      <DiscountModal
        isOpen={isDiscountModalOpen}
        onClose={() => setDiscountModalOpen(false)}
        onApplyDiscount={handleApplyDiscount}
        selectedProduct={selectedProduct}
      />

      <PendingTicketModal
        isOpen={isPendingModalOpen}
        onClose={() => setPendingModalOpen(false)}
        onAccept={handleSavePendingTicket}
        currentTicketNumber={ticketNumber}
        nextTicketNumber={ticketNumber + 1}
      />

      <ChangeTicketModal
        isOpen={isChangeModalOpen}
        onClose={() => setChangeModalOpen(false)}
        onSelectTicket={handleChangeToTicket}
        pendingTickets={pendingTickets}
      />

      <DeleteTicketModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onDeleteTicket={handleDeleteTicket}
        pendingTickets={pendingTickets}
      />
      <DeleteItemModal
        isOpen={isDeleteItemModalOpen}
        onClose={() => setDeleteItemModalOpen(false)}
        onConfirmDelete={handleDeleteSelectedProduct}
        selectedProduct={selectedProduct}
      />
    </div>
  );
};

export default Sales;
