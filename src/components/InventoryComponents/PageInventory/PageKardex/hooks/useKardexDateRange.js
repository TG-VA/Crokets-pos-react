import {
  useCallback,
  useState,
} from "react";

import {
  validateKardexDateRange,
} from "../services/kardexService";

const useKardexDateRange = () => {
  const [
    draftDateFrom,
    setDraftDateFrom,
  ] = useState("");

  const [
    draftDateTo,
    setDraftDateTo,
  ] = useState("");

  const [
    appliedDateFrom,
    setAppliedDateFrom,
  ] = useState("");

  const [
    appliedDateTo,
    setAppliedDateTo,
  ] = useState("");

  const [
    dateFilterError,
    setDateFilterError,
  ] = useState("");

  const [
    filterVersion,
    setFilterVersion,
  ] = useState(0);

  const applyDateFilter =
    useCallback(() => {
      const validation =
        validateKardexDateRange({
          dateFrom:
            draftDateFrom,
          dateTo:
            draftDateTo,
        });

      if (!validation.valid) {
        setDateFilterError(
          validation.message
        );

        return false;
      }

      setDateFilterError("");

      setAppliedDateFrom(
        draftDateFrom
      );

      setAppliedDateTo(
        draftDateTo
      );

      setFilterVersion(
        (currentVersion) =>
          currentVersion + 1
      );

      return true;
    }, [
      draftDateFrom,
      draftDateTo,
    ]);

  const clearDateFilter =
    useCallback(() => {
      setDraftDateFrom("");
      setDraftDateTo("");

      setAppliedDateFrom("");
      setAppliedDateTo("");

      setDateFilterError("");

      setFilterVersion(
        (currentVersion) =>
          currentVersion + 1
      );
    }, []);

  const isDateFilterActive =
    Boolean(
      appliedDateFrom ||
      appliedDateTo
    );

  return {
    draftDateFrom,
    draftDateTo,
    appliedDateFrom,
    appliedDateTo,

    dateFilterError,
    isDateFilterActive,
    filterVersion,

    setDraftDateFrom,
    setDraftDateTo,

    applyDateFilter,
    clearDateFilter,
  };
};

export default useKardexDateRange;