import { useCallback, useState } from "react";
import { promoteProductToGlobal } from "../../../PageInventory/PageOrders/services/promoteProductToGlobalService";

const usePromoteLocalProduct = ({ onSuccess } = {}) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const promote = useCallback(
    async (productId) => {
      setSaving(true);
      setError(null);

      try {
        await promoteProductToGlobal(productId);
        onSuccess?.();
      } catch (err) {
        console.error("Error al volver global el producto:", err);
        setError(err?.message || "No se pudo volver global el producto.");
      } finally {
        setSaving(false);
      }
    },
    [onSuccess]
  );

  const resetError = useCallback(() => setError(null), []);

  return { saving, error, promote, resetError };
};

export default usePromoteLocalProduct;
