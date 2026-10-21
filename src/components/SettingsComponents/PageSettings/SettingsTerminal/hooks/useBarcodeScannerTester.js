import { useState, useRef, useCallback } from "react";

export const useBarcodeScannerTester = () => {
  const [testInput, setTestInput] = useState("");
  const [lastScanResult, setLastScanResult] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const keystrokeTimestampsRef = useRef([]);

  const handleInputChange = useCallback((e) => {
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    keystrokeTimestampsRef.current.push(now);
    setTestInput(e.target.value);
  }, []);

  const processScan = useCallback(
    (rawCode, hasEnterSuffix, suffixName = "Enter") => {
      const trimmedCode = (rawCode || "").trim();
      if (!trimmedCode) return;

      const timestamps = keystrokeTimestampsRef.current;
      let avgLatencyMs = null;
      let isLikelyScanner = false;

      if (timestamps.length >= 2) {
        const totalDuration = timestamps[timestamps.length - 1] - timestamps[0];
        avgLatencyMs = Math.round(totalDuration / (timestamps.length - 1));
        // Los lectores de codigo de barras suelen enviar caracteres a ráfagas menores a 60ms
        isLikelyScanner = avgLatencyMs < 60;
      }

      const now = new Date();
      const formattedTime = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const scanEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        code: trimmedCode,
        timestamp: formattedTime,
        hasEnterSuffix,
        suffixName,
        avgLatencyMs,
        isLikelyScanner,
      };

      setLastScanResult(scanEntry);
      setRecentScans((prev) => [scanEntry, ...prev.slice(0, 4)]);
      setTestInput("");
      keystrokeTimestampsRef.current = [];
    },
    []
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        processScan(testInput, true, "Enter");
      } else if (e.key === "Tab") {
        e.preventDefault();
        processScan(testInput, false, "Tab");
      }
    },
    [testInput, processScan]
  );

  const handleManualSubmit = useCallback(() => {
    if (testInput.trim()) {
      processScan(testInput, false, "Manual (sin Enter)");
    }
  }, [testInput, processScan]);

  const handleClearHistory = useCallback(() => {
    setTestInput("");
    setLastScanResult(null);
    setRecentScans([]);
    keystrokeTimestampsRef.current = [];
  }, []);

  return {
    testInput,
    lastScanResult,
    recentScans,
    handleInputChange,
    handleKeyDown,
    handleManualSubmit,
    handleClearHistory,
  };
};
