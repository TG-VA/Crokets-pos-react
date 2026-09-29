import { useState, useEffect, useCallback } from "react";

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const readSavedValue = (storageKey, options, fallback) => {
  if (!storageKey) return fallback;
  try {
    const saved = Number(localStorage.getItem(storageKey));
    return options.includes(saved) ? saved : fallback;
  } catch {
    return fallback;
  }
};

/**
 * Hook de paginación reutilizable para tablas client-side y server-side.
 * @param {Object} config
 * @param {number} config.totalItems - Total de ítems a paginar.
 * @param {number} [config.defaultPageSize=10] - Tamaño de página inicial.
 * @param {number[]} [config.pageSizeOptions=[10,25,50]] - Opciones del selector de tamaño.
 * @param {string} [config.storageKey] - Clave de localStorage para persistir el tamaño elegido.
 */
export const usePagination = ({
  totalItems,
  defaultPageSize = 10,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  storageKey,
}) => {
  const normalizedCount = Math.max(0, Number(totalItems) || 0);

  const [pageSize, setPageSize] = useState(() =>
    readSavedValue(storageKey, pageSizeOptions, defaultPageSize)
  );
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(normalizedCount / pageSize));

  // Ajuste de estado durante el render en lugar de un efecto: cuando el total de
  // ítems se reduce, la página inválida se corrige en la misma pasada de render,
  // sin provocar el re-render en cascada que generaba el efecto equivalente.
  if (currentPage > totalPages) {
    setCurrentPage(totalPages);
  }

  // Página efectiva: garantiza que los índices devueltos nunca queden fuera de
  // rango durante la pasada de render en la que se aplica el ajuste anterior.
  const safePage = Math.min(currentPage, totalPages);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, normalizedCount);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, String(pageSize));
    } catch {
      // persistencia opcional; si el storage no está disponible se ignora
    }
  }, [storageKey, pageSize]);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const handlePageChange = useCallback(
    (page) => {
      setCurrentPage(clamp(page, 1, totalPages));
    },
    [totalPages]
  );

  const handlePageSizeChange = useCallback((size) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  const pageItems = useCallback(
    (items) => items.slice(startIndex, endIndex),
    [startIndex, endIndex]
  );

  return {
    currentPage: safePage,
    totalPages,
    pageSize,
    startIndex,
    endIndex,
    pageItems,
    resetPagination,
    handlePageChange,
    handlePageSizeChange,
  };
};
