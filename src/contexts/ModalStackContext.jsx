import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";

const NOOP_UNREGISTER = () => {};

const ModalStackContext = createContext(null);

const FALLBACK_CONTEXT = {
  hasOpenModals: false,
  topLayerId: null,
  registerLayer: () => NOOP_UNREGISTER,
};

/**
 * Mantiene una pila de capas modales abiertas. Los atajos globales consultan
 * `hasOpenModals` para no ejecutarse mientras cualquier modal esta abierto.
 */
export const ModalStackProvider = ({ children, initialLayers = [] }) => {
  const [layers, setLayers] = useState(() => [...initialLayers]);

  const registerLayer = useCallback((layerId) => {
    setLayers((current) =>
      current.includes(layerId) ? current : [...current, layerId]
    );

    return () => {
      setLayers((current) => current.filter((id) => id !== layerId));
    };
  }, []);

  const value = useMemo(
    () => ({
      hasOpenModals: layers.length > 0,
      topLayerId: layers.length > 0 ? layers[layers.length - 1] : null,
      registerLayer,
    }),
    [layers, registerLayer]
  );

  return (
    <ModalStackContext.Provider value={value}>
      {children}
    </ModalStackContext.Provider>
  );
};

export const useModalStack = () => {
  const context = useContext(ModalStackContext);
  return context || FALLBACK_CONTEXT;
};

/**
 * Registra una capa modal mientras `isOpen` sea verdadero. El identificador
 * permite que las capas anidadas se apilen y que solo la superior reciba las
 * teclas locales que dependan de esa pila.
 */
export const useModalLayer = (isOpen, layerId) => {
  const { registerLayer } = useModalStack();
  const generatedId = useId();
  const resolvedId = layerId || generatedId;

  useEffect(() => {
    if (!isOpen) return undefined;
    return registerLayer(resolvedId);
  }, [isOpen, registerLayer, resolvedId]);
};

/**
 * Version para componentes que abren varias capas desde una sola lista de
 * banderas (por ejemplo, la pantalla de ventas).
 */
export const useModalLayers = (layerIds = []) => {
  const { registerLayer } = useModalStack();
  const layerKey = layerIds.filter(Boolean).join("|");

  useEffect(() => {
    const ids = layerKey ? layerKey.split("|") : [];
    const unregisters = ids.map((layerId) => registerLayer(layerId));

    return () => {
      unregisters.reverse().forEach((unregister) => unregister());
    };
  }, [layerKey, registerLayer]);
};
