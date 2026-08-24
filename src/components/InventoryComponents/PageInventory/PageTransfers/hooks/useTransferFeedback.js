import { useCallback, useState } from "react";

const useTransferFeedback = () => {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const clearFeedback = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  return {
    error,
    success,
    setError,
    setSuccess,
    clearFeedback,
  };
};

export default useTransferFeedback;
