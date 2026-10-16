import { useCallback, useEffect, useState } from "react";
import {
  fetchActiveBranches,
  registerPosDevice,
} from "../../../services/deviceBranchService";

export const useDeviceActivation = ({ isOpen, deviceCode, onActivated }) => {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activatedBranch, setActivatedBranch] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const loadBranches = async () => {
      const result = await fetchActiveBranches();

      if (!isMounted) return;

      if (!result.success) {
        setError(result.error || "No se pudieron cargar las sucursales.");
        setLoading(false);
        return;
      }

      setBranches(result.data);
      setSelectedBranchId((current) => current || result.data[0]?.id || "");
      setLoading(false);
    };

    loadBranches();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  const submit = useCallback(async () => {
    setError("");

    const cleanUsername = username.trim();

    if (!cleanUsername) {
      setError("Ingresa el usuario administrador.");
      return;
    }

    if (!password.trim()) {
      setError("Ingresa la contraseña del administrador.");
      return;
    }

    if (!selectedBranchId) {
      setError("Selecciona una sucursal.");
      return;
    }

    setLoading(true);

    const result = await registerPosDevice({
      deviceCode,
      branchId: selectedBranchId,
      username: cleanUsername,
      password,
    });

    setLoading(false);

    if (!result.success) {
      setError(result.error || "No se pudo vincular el equipo.");
      return;
    }

    setActivatedBranch(result.branch);
    setStep(2);
  }, [username, password, selectedBranchId, deviceCode]);

  const confirmActivation = useCallback(() => {
    if (!activatedBranch) return;
    onActivated?.(activatedBranch);
  }, [activatedBranch, onActivated]);

  return {
    step,
    username,
    setUsername,
    password,
    setPassword,
    selectedBranchId,
    setSelectedBranchId,
    branches,
    loading,
    error,
    activatedBranch,
    submit,
    confirmActivation,
  };
};
