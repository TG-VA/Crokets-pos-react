import barcodeIcon from "../../../../../assets/icons/barcode-solid-full.svg";
import infoIcon from "../../../../../assets/icons/circle-info-solid-full.svg";
import checkIcon from "../../../../../assets/icons/circle-check-solid-full.svg";
import warningIcon from "../../../../../assets/icons/triangle-exclamation-solid-full.svg";
import ScopeBadge from "../../components/ScopeBadge";
import { useBarcodeScannerTester } from "../hooks/useBarcodeScannerTester";
import styles from "../SettingsTerminal.module.css";

const BarcodeScannerCard = () => {
  const {
    testInput,
    lastScanResult,
    recentScans,
    handleInputChange,
    handleKeyDown,
    handleManualSubmit,
    handleClearHistory,
  } = useBarcodeScannerTester();

  return (
    <article
      className={`${styles.card} ${styles.barcodeCard}`}
      aria-labelledby="barcode-scanner-title"
    >
      <header className={styles.cardHeader}>
        <div className={styles.cardTitleRow}>
          <div className={styles.cardTitleGroup}>
            <span className={styles.cardHeaderIconBadge} aria-hidden="true">
              <img src={barcodeIcon} alt="" />
            </span>
            <div className={styles.cardHeading}>
              <h2 id="barcode-scanner-title" className={styles.cardTitle}>
                Lector de código de barras
              </h2>
              <p className={styles.cardDescription}>
                Verificación operativa y prueba interactiva del escáner físico
              </p>
            </div>
          </div>
          <ScopeBadge scope="device" />
        </div>
      </header>

      <div className={styles.barcodeLayout}>
        <div className={styles.barcodeMain}>
          <div className={styles.testerBox}>
            <label
              htmlFor="barcode-test-input"
              className={styles.definitionTerm}
            >
              Prueba interactiva de lectura
            </label>
            <div className={styles.testerInputRow}>
              <input
                id="barcode-test-input"
                type="text"
                className={styles.testerInput}
                value={testInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Haz clic aquí y escanea un producto con tu lector..."
                autoComplete="off"
                spellCheck="false"
              />
              {testInput.trim().length > 0 && (
                <button
                  type="button"
                  className={styles.testerActionBtn}
                  onClick={handleManualSubmit}
                  title="Evaluar entrada sin presionar Enter"
                >
                  Evaluar sin Enter
                </button>
              )}
            </div>

            {lastScanResult ? (
              lastScanResult.hasEnterSuffix ? (
                <div
                  className={styles.feedbackSuccessAlert}
                  role="status"
                  data-testid="scanner-success-feedback"
                >
                  <img
                    src={checkIcon}
                    alt=""
                    aria-hidden="true"
                    className={styles.feedbackSuccessIcon}
                  />
                  <div className={styles.feedbackSuccessText}>
                    <div>Lectura correcta con sufijo Enter</div>
                    <div className={styles.hint}>
                      Código leído: <strong>{lastScanResult.code}</strong>. El
                      lector envió la tecla Enter al final. En la pantalla de
                      Ventas agregará automáticamente el producto al carrito.
                      {lastScanResult.avgLatencyMs !== null && (
                        <span>
                          {" "}
                          (Latencia: {lastScanResult.avgLatencyMs} ms/tecla -{" "}
                          {lastScanResult.isLikelyScanner
                            ? "Ráfaga de escáner detectada"
                            : "Tipeo manual"}
                          ).
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className={styles.feedbackAlert}
                  role="alert"
                  data-testid="scanner-warning-feedback"
                >
                  <img
                    src={warningIcon}
                    alt=""
                    aria-hidden="true"
                    className={styles.feedbackAlertIcon}
                  />
                  <div className={styles.feedbackAlertText}>
                    <div>Atención: Falta sufijo Enter</div>
                    <div className={styles.hint}>
                      Código leído: <strong>{lastScanResult.code}</strong>{" "}
                      (Terminación: {lastScanResult.suffixName}). El lector no
                      envió la tecla Enter al final. Para operar fluidamente en
                      Ventas sin tener que pulsar botones adicionales, escanea
                      el código de barras &quot;Add Enter Suffix / CR&quot; del
                      manual de tu lector.
                    </div>
                  </div>
                </div>
              )
            ) : (
              <p className={styles.hint}>
                Haz clic en el campo y acciona el lector sobre una etiqueta con
                código de barras para verificar la configuración.
              </p>
            )}
          </div>

          {recentScans.length > 0 && (
            <div className={styles.scannerHistory}>
              <div className={styles.scannerHistoryHeader}>
                <span className={styles.scannerHistoryTitle}>
                  Historial de lecturas de prueba
                </span>
                <button
                  type="button"
                  className={styles.scannerHistoryClearBtn}
                  onClick={handleClearHistory}
                  aria-label="Limpiar historial de pruebas"
                >
                  Limpiar pruebas
                </button>
              </div>
              <ul
                className={styles.scannerHistoryList}
                aria-label="Lecturas de prueba recientes"
              >
                {recentScans.map((scan) => (
                  <li key={scan.id} className={styles.scannerHistoryItem}>
                    <span className={styles.scannerHistoryCode}>
                      {scan.code}
                    </span>
                    <div className={styles.scannerHistoryMeta}>
                      <span
                        className={`${styles.badge} ${
                          scan.hasEnterSuffix
                            ? styles.badgeOk
                            : styles.badgeWarning
                        }`}
                      >
                        {scan.hasEnterSuffix ? "Enter detectado" : "Sin Enter"}
                      </span>
                      <span className={styles.scannerHistoryTime}>
                        {scan.timestamp}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className={styles.barcodeAside}>
          <div className={styles.infoBox}>
            <img
              src={infoIcon}
              alt=""
              aria-hidden="true"
              className={styles.infoBoxIcon}
            />
            <p className={styles.infoBoxText}>
              Los lectores de código de barras USB o inalámbricos operan como
              dispositivos de emulación de teclado (HID Plug &amp; Play). No
              requieren instalación de controladores en el POS ni configuración
              en la nube; se conectan y operan de inmediato en la pantalla de
              Ventas.
            </p>
          </div>

          <div className={styles.statusRow}>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Modo de conexión</span>
              <span className={styles.badge}>Emulación de teclado (HID)</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Terminador en Ventas</span>
              <span className={styles.badge}>Tecla Enter</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Compatibilidad</span>
              <span className={`${styles.badge} ${styles.badgeOk}`}>
                Plug &amp; Play
              </span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

export default BarcodeScannerCard;
