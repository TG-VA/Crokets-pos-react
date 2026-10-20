import { useCallback, useMemo, useState } from "react";
import {
  buildBranchFormValues,
  sanitizeBranchFormValues,
  validateBranchFormValues,
} from "../utils/branchesFormatters";

export const useBranchForm = (initialBranch = null) => {
  const [values, setValues] = useState(() =>
    buildBranchFormValues(initialBranch)
  );
  const [sourceBranch, setSourceBranch] = useState(initialBranch);
  const [touchedFields, setTouchedFields] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (sourceBranch !== initialBranch) {
    setSourceBranch(initialBranch);
    setValues(buildBranchFormValues(initialBranch));
    setTouchedFields({});
    setIsSubmitted(false);
  }

  const isEdit = Boolean(initialBranch?.id);

  const errors = useMemo(
    () => validateBranchFormValues(values, { isEdit }),
    [values, isEdit]
  );

  const isValid = Object.keys(errors).length === 0;

  const shouldShowError = useCallback(
    (field) =>
      Boolean(errors[field]) && (isSubmitted || Boolean(touchedFields[field])),
    [errors, isSubmitted, touchedFields]
  );

  const getFieldError = useCallback(
    (field) => (shouldShowError(field) ? errors[field] : undefined),
    [errors, shouldShowError]
  );

  const handleChange = useCallback(
    (field) => (event) => {
      let value = event.target.value;
      if (field === "phone") {
        value = value.replace(/\D/g, "").slice(0, 10);
      }
      if (field === "code") {
        value = value.toUpperCase();
      }
      setValues((prev) => ({ ...prev, [field]: value }));
      setTouchedFields((prev) =>
        prev[field] ? prev : { ...prev, [field]: true }
      );
    },
    []
  );

  const handleBlur = useCallback(
    (field) => () => {
      setTouchedFields((prev) =>
        prev[field] ? prev : { ...prev, [field]: true }
      );
    },
    []
  );

  const markSubmitted = useCallback(() => setIsSubmitted(true), []);

  const getSanitizedValues = useCallback(
    () => sanitizeBranchFormValues(values),
    [values]
  );

  const reset = useCallback(() => {
    setValues(buildBranchFormValues(initialBranch));
    setTouchedFields({});
    setIsSubmitted(false);
  }, [initialBranch]);

  return {
    values,
    errors,
    isValid,
    isEdit,
    touched: Object.keys(touchedFields).length > 0,
    touchedFields,
    isSubmitted,
    shouldShowError,
    getFieldError,
    handleChange,
    handleBlur,
    markSubmitted,
    getSanitizedValues,
    reset,
  };
};

export default useBranchForm;
