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

  // Modal de entradas
  const [isEntryModalOpen, setEntryModalOpen] = useState(false);
  const [cashMovements, setCashMovements] = useState([]);
  const [entryAmount, setEntryAmount] = useState('');
  const [entryReason, setEntryReason] = useState('');
  const [entryError, setEntryError] = useState('');


  //Modal de salidas
  const [isExitModalOpen, setExitModalOpen] = useState(false); 
  const [exitAmount, setExitAmount] = useState('');    
  const [exitReason, setExitReason] = useState('');
  const [exitError, setExitError] = useState('');

  //Asignar cliente
  const [isClientModalOpen, setClientModalOpen] = useState(false);
  const [clients] = useState([ // Clientes de ejemplo
    { id: '9988776655', name: 'Juan Pérez García', points: 150 },
    { id: '9988112233', name: 'María López Hernández', points: 85 },
    { id: '9988445566', name: 'Carlos Sánchez Rodríguez', points: 320 },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [currentSaleClient, setCurrentSaleClient] = useState(null);

  // Modal de Cobro
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState("Terminal");

  // Estados para diferentes métodos de pago
  const [paidAmount, setPaidAmount] = useState("");
  const [dollarAmount, setDollarAmount] = useState("");
  const [exchangeRate] = useState(18.5); // Tipo de cambio fijo, Se puede hacer dinamico mas adelante

  // Estados para pago mixto
  const [mixedPayments, setMixedPayments] = useState({
    efectivo: "",
    tarjeta: "",
    dolares: "",
  });

  // Estados para transferencia
  const [trackingCode, setTrackingCode] = useState("");

  const total = 207.0; // aquí puedes ligar con el total real de la venta

  // Función para convertir valores a número, manejando NaN y valores vacíos
  const toNumber = (value) => {
    const num = parseFloat(value.trim());
    return isNaN(num) ? 0 : num;
  };

  // Calcular cambio según método de pago
  const numericPaidAmount = toNumber(paidAmount);
  const numericDollarAmount = toNumber(dollarAmount);
  const numericEfectivo = toNumber(mixedPayments.efectivo);
  const numericTarjeta = toNumber(mixedPayments.tarjeta);
  const numericDolares = toNumber(mixedPayments.dolares);

  const calculateChange = () => {
    switch (selectedPaymentMethod) {
      case "Efectivo":
        return Math.max(0, numericPaidAmount - total);
      case "Dolares":
        return Math.max(0, numericDollarAmount * exchangeRate - total);
      case "Mixto":
        const totalMixed =
          numericEfectivo + numericTarjeta + numericDolares * exchangeRate;
        return Math.max(0, totalMixed - total);
      default:
        return 0;
    }
  };

  const change = calculateChange();

  const paymentMethods = [
    { id: "Efectivo", name: "Efectivo", icon: "💰" },
    { id: "Dolares", name: "Dólares", icon: "💵" },
    { id: "Mixto", name: "Mixto", icon: "🪙" },
    { id: "Terminal", name: "Terminal", icon: "🖥️" },
    { id: "Transferencia", name: "Transferencia", icon: "🏦" },
  ];

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    // Resetear todos los estados
    setPaidAmount("");
    setDollarAmount("");
    setMixedPayments({ efectivo: "", tarjeta: "", dolares: "" });
    setTrackingCode("");
  };

  // Funciones del modal de entradas
  const closeEntryModal = () => {
    setEntryModalOpen(false);
    setEntryAmount('');
    setEntryReason('');
    setEntryError('');
  };

  const handleSaveEntry = () => {
    if (!entryAmount || parseFloat(entryAmount) <= 0) {
      setEntryError('Por favor, ingrese un monto válido.');
      return;
    }
    if (!entryReason.trim()) {
      setEntryError('Por favor, ingrese una razón.');
      return;
    }
    
    const newMovement = {
      id: Date.now(),
      type: 'entry',
      amount: parseFloat(entryAmount),
      reason: entryReason,
      createdAt: new Date().toISOString()
    };
    
    const updatedMovements = [...cashMovements, newMovement];
    setCashMovements(updatedMovements);
    console.log('Movimientos de caja actualizados:', updatedMovements);
    closeEntryModal(); // Cierra y resetea el modal
  };

  //Funciones para el modal de salidas

  const closeExitModal = () => {
    setExitModalOpen(false);
    setExitAmount('');
    setExitReason('');
    setExitError('');
  };

  const handleSaveExit = () => {
    if (!exitAmount || parseFloat(exitAmount) <= 0) {
      setExitError('Por favor, ingrese un monto válido.');
      return;
    }
    if (!exitReason.trim()) {
      setExitError('Por favor, ingrese una razón.');
      return;
    }
    
    const newMovement = {
      id: Date.now(),
      type: 'exit', 
      amount: parseFloat(exitAmount),
      reason: exitReason,
      createdAt: new Date().toISOString()
    };
    
    const updatedMovements = [...cashMovements, newMovement];
    setCashMovements(updatedMovements);
    console.log('Movimientos de caja actualizados:', updatedMovements);
    closeExitModal();
  };

  //Funciones para asignar cliente

  const openClientModal = () => {
    setSelectedClient(currentSaleClient); 
    setClientModalOpen(true);
  };
  
  const closeClientModal = () => {
    setClientModalOpen(false);
    setSearchTerm('');
    setSelectedClient(null);
  };

  const handleAssignClient = () => {
    setCurrentSaleClient(selectedClient);
    console.log("Cliente asignado a la venta:", selectedClient);
    closeClientModal();
  };

  // Filtra los clientes basándose en el término de búsqueda (nombre o teléfono)
  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.id.includes(searchTerm)
  );

  const processPayment = () => {
    alert(
      `Procesando pago de $${total.toFixed(2)} con ${selectedPaymentMethod}`
    );
    setShowPaymentModal(false);
  };

  // Función para renderizar el contenido del método de pago
  const renderPaymentContent = () => {
    switch (selectedPaymentMethod) {
      case "Efectivo":
        return (
          <div className={styles.paymentInfo}>
            <div className={styles.paymentRow}>
              <span>Pagó Con:</span>
              <div className={styles.inputWithSymbol}>
                <span className={styles.currencySymbol}>$</span>
                <input
                  type="text"
                  className={styles.paymentInput}
                  value={paidAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (
                      /^\d*\.?\d*$/.test(val) &&
                      val.split(".").length - 1 <= 1
                    ) {
                      // permite solo números y punto
                      setPaidAmount(val === "." ? "0." : val);
                    }
                  }}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className={styles.paymentRow}>
              <span>Su Cambio:</span>
              <span className={styles.changeAmount}>${change.toFixed(2)}</span>
            </div>
          </div>
        );

      case "Dolares":
        return (
          <div className={styles.paymentInfo}>
            <div className={styles.exchangeRateDisplay}>
              <span>
                Tipo de cambio: ${exchangeRate.toFixed(2)} MXN por USD
              </span>
            </div>
            <div className={styles.paymentRow}>
              <span>Pagó Con (USD):</span>
              <div className={styles.inputWithSymbol}>
                <span className={styles.currencySymbol}>$</span>
                <input
                  type="text"
                  className={styles.paymentInput}
                  value={dollarAmount}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (
                      /^\d*\.?\d*$/.test(val) &&
                      val.split(".").length - 1 <= 1
                    ) {
                      setDollarAmount(val === "." ? "0." : val);
                    }
                  }}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
            </div>
            <div className={styles.paymentRow}>
              <span>Equivalente en MXN:</span>
              <span className={styles.equivalentAmount}>
                ${(toNumber(dollarAmount) * exchangeRate).toFixed(2)}
              </span>
            </div>
            <div className={styles.paymentRow}>
              <span>Su Cambio:</span>
              <span className={styles.changeAmount}>${change.toFixed(2)}</span>
            </div>
          </div>
        );

      case "Mixto":
        return (
          <div className={styles.paymentInfo}>
            <div className={styles.mixedPaymentSection}>
              <h3>Desglose de Pago</h3>

              {/* Efectivo */}
              <div className={styles.paymentRow}>
                <span>Efectivo:</span>
                <div className={styles.inputWithSymbol}>
                  <span className={styles.currencySymbol}>$</span>
                  <input
                    type="text"
                    className={styles.paymentInput}
                    value={mixedPayments.efectivo}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (
                        /^\d*\.?\d*$/.test(val) &&
                        val.split(".").length - 1 <= 1
                      ) {
                        setMixedPayments((prev) => ({
                          ...prev,
                          efectivo: val === "." ? "0." : val,
                        }));
                      }
                    }}
                    placeholder="0.00"
                    autoFocus
                  />
                </div>
              </div>

              {/* Tarjeta */}
              <div className={styles.paymentRow}>
                <span>Tarjeta:</span>
                <div className={styles.inputWithSymbol}>
                  <span className={styles.currencySymbol}>$</span>
                  <input
                    type="text"
                    className={styles.paymentInput}
                    value={mixedPayments.tarjeta}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (
                        /^\d*\.?\d*$/.test(val) &&
                        val.split(".").length - 1 <= 1
                      ) {
                        setMixedPayments((prev) => ({
                          ...prev,
                          tarjeta: val === "." ? "0." : val,
                        }));
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Dólares */}
              <div className={styles.paymentRow}>
                <span>Dólares (USD):</span>
                <div className={styles.inputWithSymbol}>
                  <span className={styles.currencySymbol}>$</span>
                  <input
                    type="text"
                    className={styles.paymentInput}
                    value={mixedPayments.dolares}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (
                        /^\d*\.?\d*$/.test(val) &&
                        val.split(".").length - 1 <= 1
                      ) {
                        setMixedPayments((prev) => ({
                          ...prev,
                          dolares: val === "." ? "0." : val,
                        }));
                      }
                    }}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Total */}
              <div className={styles.totalMixedRow}>
                <span>Total Pagado:</span>
                <span className={styles.totalMixedAmount}>
                  $
                  {(
                    toNumber(mixedPayments.efectivo) +
                    toNumber(mixedPayments.tarjeta) +
                    toNumber(mixedPayments.dolares) * exchangeRate
                  ).toFixed(2)}
                </span>
              </div>

              {/* Cambio */}
              <div className={styles.paymentRow}>
                <span>Su Cambio:</span>
                <span className={styles.changeAmount}>
                  ${change.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        );

      case "Terminal":
        return (
          <div className={styles.paymentInfo}>
            <div className={styles.terminalSection}>
              <div className={styles.paymentRow}>
                <span>Total a Cobrar:</span>
                <span className={styles.totalAmount}>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        );

      case "Transferencia":
        return (
          <div className={styles.paymentInfo}>
            <div className={styles.transferSection}>
              <div className={styles.paymentRow}>
                <span>Informacion de Transferencia:</span>
                <input
                  type="text"
                  className={styles.trackingInput}
                  value={trackingCode}
                  onChange={(e) => setTrackingCode(e.target.value)}
                  placeholder="Clave de rastreo, referencia, etc."
                />
              </div>
              <div className={styles.paymentRow}>
                <span>Total a Cobrar:</span>
                <span className={styles.totalAmount}>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
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

  //useEffect para manejar Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        closePaymentModal();
      }
    };

    if (showPaymentModal) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showPaymentModal]);

  //useEffect para abrir y cerrar el modal de sales con F12 y esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F12") {
        setShowPaymentModal(true);
      } else if (e.key === "Escape") {
        closePaymentModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  //useEffect para abrir y cerrar el modal de entradas con F7 y esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F7") {
        setEntryModalOpen(true);
      } else if (e.key === "Escape") {
        closeEntryModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  //useEffect para abrir y cerrar el modal de salidas con F8 y esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "F8") {
        setExitModalOpen(true);
      } else if (e.key === "Escape") {
        closeExitModal();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

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
          <div className={styles.horizontalActionButton} onClick={() => setEntryModalOpen(true)}>
          <span className={styles.actionKey}>F7</span>
          <img src={entryIcon} alt="Entradas" className={styles.buttonIcon} />
          <span className={styles.actionText}>Entradas</span>
        </div>
        <div className={styles.horizontalActionButton}onClick={() => setExitModalOpen(true)}>
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

            {/* Contenido dinámico según método de pago */}
            {renderPaymentContent()}

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

      {/* Modal de Entradas */}
      {isEntryModalOpen && (
        <div className={styles.modalOverlay} onClick={closeEntryModal}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Registrar Entrada de Efectivo</h2>
              <button className={styles.closeButton} onClick={closeEntryModal}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor="entryAmount">Monto:</label>
                <input
                  type="number"
                  id="entryAmount"
                  value={entryAmount}
                  onChange={(e) => { setEntryAmount(e.target.value); setEntryError(''); }}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="entryReason">Razón:</label>
                <textarea
                  id="entryReason"
                  value={entryReason}
                  onChange={(e) => { setEntryReason(e.target.value); setEntryError(''); }}
                  placeholder="Ej. Cambio, fondo de caja,etc."
                />
              </div>
              {entryError && <p className={styles.errorMessage}>{entryError}</p>}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={closeEntryModal}>Cancelar</button>
              <button className={styles.saveButton} onClick={handleSaveEntry}>Guardar Entrada</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Salidas */}
      {isExitModalOpen && (
        <div className={styles.modalOverlay} onClick={closeExitModal}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Registrar Salida de Efectivo</h2>
              <button className={styles.closeButton} onClick={closeExitModal}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label htmlFor="exitAmount">Monto:</label>
                <input
                  type="number"
                  id="exitAmount"
                  value={exitAmount}
                  onChange={(e) => { setExitAmount(e.target.value); setExitError(''); }}
                  placeholder="0.00"
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="exitReason">Razón:</label>
                <textarea
                  id="exitReason"
                  value={exitReason}
                  onChange={(e) => { setExitReason(e.target.value); setExitError(''); }}
                  placeholder="Ej. Pago a proveedor, retiro, etc."
                />
              </div>
              {exitError && <p className={styles.errorMessage}>{exitError}</p>}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={closeExitModal}>Cancelar</button>
              <button className={styles.saveButton} onClick={handleSaveExit}>Guardar Salida</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para asignar cliente */}
      {isClientModalOpen && (
        <div className={styles.modalOverlay} onClick={closeClientModal}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Asignar Cliente</h2>
            </div>

            <div className={styles.searchBarContainer}>
              <input 
                type="text"
                className={styles.clientSearchBar}
                placeholder="Buscar por nombre o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>

            <div className={styles.clientList}>
              {filteredClients.length > 0 ? (
                filteredClients.map(client => (
                  <div 
                    key={client.id} 
                    className={`${styles.clientItem} ${selectedClient?.id === client.id ? styles.clientItemSelected : ''}`}
                    onClick={() => setSelectedClient(client)}
                  >
                    <div>
                      <div className={styles.clientName}>{client.name}</div>
                      <div className={styles.clientId}>Tel: {client.id}</div>
                    </div>
                    <div className={styles.clientPoints}>{client.points} pts</div>
                  </div>
                ))
              ) : (
                <p className={styles.noClientsMessage}>No se encontraron clientes.</p>
              )}
            </div>
            
            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={closeClientModal}>Cancelar</button>
              <button 
                className={styles.saveButton} 
                onClick={handleAssignClient}
                disabled={!selectedClient} 
              >
                Asignar Cliente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
